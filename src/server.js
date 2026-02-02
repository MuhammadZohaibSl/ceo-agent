/**
 * CEO Agent HTTP API Server
 * Express.js server exposing Agent functionality via REST endpoints
 */

import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        }
    }
}

// Import agent modules
import { createAgent } from './core/Agent.js';
import { createMemoryManager } from './memory/index.js';
import { createRAGEngine } from './rag/index.js';
import { OptionGenerator, OptionEvaluator, RiskModel, DecisionFormatter } from './reasoning/index.js';
import { createLLMRouter, OpenAIClient, AnthropicClient, OllamaClient, RoutingStrategy } from './llm/index.js';
import { createSafetyGuard } from './safety/index.js';
import { createAuditLogger, createApprovalManager, createFeedbackCollector } from './audit/index.js';
import config, { validateConfig } from './config/index.js';
import logger from './utils/logger.js';

// ============================================================================
// Agent Initialization
// ============================================================================

let agent = null;
let llmRouter = null;
let approvalManager = null;
let feedbackCollector = null;
let auditLogger = null;
let memoryManager = null;
let ragEngine = null;

async function initializeAgent() {
    logger.info('Initializing CEO Agent for HTTP server');

    // Validate configuration
    const { valid, errors } = validateConfig();
    if (!valid) {
        logger.warn('Configuration validation warnings', { errors });
    }

    // Initialize LLM Router with providers
    llmRouter = createLLMRouter({
        strategy: RoutingStrategy.BEST_AVAILABLE,
        providers: {
            openai: new OpenAIClient({
                apiKey: config.llm.providers?.openai?.apiKey ?? '',
                model: config.llm.providers?.openai?.model ?? 'gpt-4',
                timeout: config.llm.timeout,
            }),
            anthropic: new AnthropicClient({
                apiKey: config.llm.providers?.claude?.apiKey ?? '',
                model: config.llm.providers?.claude?.model ?? 'claude-3-sonnet-20240229',
                timeout: config.llm.timeout,
            }),
            ollama: new OllamaClient({
                model: process.env.OLLAMA_MODEL ?? 'llama2',
                baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
                timeout: parseInt(process.env.LLM_TIMEOUT, 10) || 120000,
            }),
        },
    });

    // Initialize memory system
    memoryManager = createMemoryManager({
        shortTerm: { maxEntries: 100, ttlMs: 30 * 60 * 1000 },
        longTerm: { storagePath: './data/memory/long_term.json', maxEntries: 1000 },
    });

    // Initialize RAG engine
    ragEngine = createRAGEngine({
        contextPolicy: config.policies.context,
        loader: { chunkSize: 500, chunkOverlap: 50 },
    });

    // Ingest documents
    try {
        await ragEngine.ingestDirectory('./data/documents', false);
        logger.info('Documents ingested', ragEngine.getStats());
    } catch (error) {
        logger.warn('No documents to ingest', { error: error.message });
    }

    // Initialize reasoning components
    const optionGenerator = new OptionGenerator({ llmClient: llmRouter });
    const optionEvaluator = new OptionEvaluator();
    const riskModel = new RiskModel();
    const decisionFormatter = new DecisionFormatter();

    // Initialize safety guard
    const safetyGuard = createSafetyGuard({
        loopConfig: { maxIterations: config.agent.maxIterations },
        contentConfig: { ethicalRedLines: config.policies.decision?.ethicalRedLines ?? [] },
        strictMode: false,
    });

    // Initialize audit system
    auditLogger = createAuditLogger({
        logDir: './data/audit',
        enableFileLogging: true,
    });

    approvalManager = createApprovalManager({
        storageDir: './data/approvals',
        expirationHours: 24,
        auditLogger,
    });

    feedbackCollector = createFeedbackCollector({
        storageDir: './data/feedback',
        auditLogger,
    });

    // Create agent
    agent = createAgent({
        memoryManager,
        ragEngine,
        optionGenerator,
        optionEvaluator,
        riskModel,
        decisionFormatter,
        safetyGuard,
    });

    logger.info('Agent ready for HTTP requests', agent.getStatus());
}

// ============================================================================
// HTTP Request Handling Utilities
// ============================================================================

function parseJSON(body) {
    try {
        return JSON.parse(body);
    } catch {
        return null;
    }
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data));
}

function getBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(body));
    });
}

// ============================================================================
// Route Handlers
// ============================================================================

// GET /api/status - Agent status
async function handleStatus(req, res) {
    const agentStatus = agent.getStatus();
    const llmStatus = llmRouter.getStatus();
    const memoryStats = memoryManager.getStats();
    const ragStats = ragEngine.getStats();

    sendJSON(res, 200, {
        success: true,
        data: {
            agent: agentStatus,
            llm: {
                strategy: llmStatus.strategy,
                availableProviders: llmStatus.availableCount,
                providers: llmStatus.providers,
            },
            memory: memoryStats,
            rag: ragStats,
        },
    });
}

// POST /api/analyze - Process a strategic query
async function handleAnalyze(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.query) {
        return sendJSON(res, 400, { success: false, error: 'Missing required field: query' });
    }

    try {
        logger.info('Processing analysis request', { query: data.query.substring(0, 100) });

        const result = await agent.process(data.query, {
            constraints: data.constraints ?? {},
        });

        // Submit for approval if required
        let approvalRequest = null;
        if (result.proposal?.requiresHumanApproval) {
            approvalRequest = approvalManager.submitForApproval({
                contextId: result.id,
                proposal: result.proposal,
                priority: 'medium',
            });
        }

        // Log to audit
        auditLogger.logProposalCreated(result.id, result.proposal);

        sendJSON(res, 200, {
            success: true,
            data: {
                id: result.id,
                proposal: result.proposal,
                approvalRequest: approvalRequest ? { id: approvalRequest.id } : null,
            },
        });
    } catch (error) {
        logger.error('Analysis failed', { error: error.message });
        sendJSON(res, 500, { success: false, error: error.message });
    }
}

// GET /api/approvals - List pending approvals
async function handleGetApprovals(req, res) {
    const pending = approvalManager.getPending();
    const stats = approvalManager.getStats();

    sendJSON(res, 200, {
        success: true,
        data: { pending, stats },
    });
}

// GET /api/approvals/:id - Get specific approval
async function handleGetApproval(req, res, approvalId) {
    const approval = approvalManager.get(approvalId);

    if (!approval) {
        return sendJSON(res, 404, { success: false, error: 'Approval not found' });
    }

    sendJSON(res, 200, { success: true, data: approval });
}

// POST /api/approvals/:id/approve - Approve a decision
async function handleApprove(req, res, approvalId) {
    const body = await getBody(req);
    const data = parseJSON(body) || {};

    try {
        const result = approvalManager.approve(
            approvalId,
            data.approver ?? 'anonymous',
            data.notes ?? ''
        );
        sendJSON(res, 200, { success: true, data: result });
    } catch (error) {
        sendJSON(res, 400, { success: false, error: error.message });
    }
}

// POST /api/approvals/:id/reject - Reject a decision
async function handleReject(req, res, approvalId) {
    const body = await getBody(req);
    const data = parseJSON(body) || {};

    if (!data.reason) {
        return sendJSON(res, 400, { success: false, error: 'Missing required field: reason' });
    }

    try {
        const result = approvalManager.reject(
            approvalId,
            data.approver ?? 'anonymous',
            data.reason
        );
        sendJSON(res, 200, { success: true, data: result });
    } catch (error) {
        sendJSON(res, 400, { success: false, error: error.message });
    }
}

// GET /api/history - Get decision history from memory
async function handleHistory(req, res) {
    const memories = memoryManager.search('decision', 20);
    sendJSON(res, 200, { success: true, data: memories });
}

// GET /api/stats - Get system statistics
async function handleStats(req, res) {
    sendJSON(res, 200, {
        success: true,
        data: {
            audit: auditLogger.getStats(),
            approvals: approvalManager.getStats(),
            feedback: feedbackCollector.getStats(),
            memory: memoryManager.getStats(),
            rag: ragEngine.getStats(),
        },
    });
}

// GET /api/documents - List RAG documents
async function handleGetDocuments(req, res) {
    const documentsDir = join(__dirname, '..', 'data', 'documents');

    if (!existsSync(documentsDir)) {
        return sendJSON(res, 200, { success: true, data: [] });
    }

    const files = readdirSync(documentsDir).filter(f =>
        ['.md', '.txt', '.json'].includes(extname(f).toLowerCase())
    );

    const documents = files.map(filename => ({
        id: filename,
        name: basename(filename, extname(filename)),
        type: extname(filename).slice(1),
        path: join(documentsDir, filename),
    }));

    sendJSON(res, 200, { success: true, data: documents });
}

// POST /api/documents - Upload a new document
async function handleUploadDocument(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.name || !data.content) {
        return sendJSON(res, 400, {
            success: false,
            error: 'Missing required fields: name, content'
        });
    }

    const documentsDir = join(__dirname, '..', 'data', 'documents');
    if (!existsSync(documentsDir)) {
        mkdirSync(documentsDir, { recursive: true });
    }

    const ext = data.type ?? 'md';
    const filename = `${data.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
    const filepath = join(documentsDir, filename);

    try {
        writeFileSync(filepath, data.content, 'utf-8');

        // Re-ingest documents
        await ragEngine.ingestDirectory('./data/documents', false);

        sendJSON(res, 201, {
            success: true,
            data: { id: filename, name: data.name, path: filepath },
        });
    } catch (error) {
        sendJSON(res, 500, { success: false, error: error.message });
    }
}

// DELETE /api/documents/:id - Delete a document
async function handleDeleteDocument(req, res, documentId) {
    const documentsDir = join(__dirname, '..', 'data', 'documents');
    const filepath = join(documentsDir, documentId);

    if (!existsSync(filepath)) {
        return sendJSON(res, 404, { success: false, error: 'Document not found' });
    }

    try {
        unlinkSync(filepath);

        // Re-ingest documents
        await ragEngine.ingestDirectory('./data/documents', false);

        sendJSON(res, 200, { success: true, data: { id: documentId, deleted: true } });
    } catch (error) {
        sendJSON(res, 500, { success: false, error: error.message });
    }
}

// ============================================================================
// Request Router
// ============================================================================

async function handleRequest(req, res) {
    const { method, url } = req;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
    }

    // Parse URL for route matching
    const urlParts = url.split('?')[0].split('/').filter(Boolean);

    // Route matching
    try {
        // GET /api/status
        if (method === 'GET' && url === '/api/status') {
            return await handleStatus(req, res);
        }

        // POST /api/analyze
        if (method === 'POST' && url === '/api/analyze') {
            return await handleAnalyze(req, res);
        }

        // GET /api/approvals
        if (method === 'GET' && url === '/api/approvals') {
            return await handleGetApprovals(req, res);
        }

        // GET /api/approvals/:id
        if (method === 'GET' && urlParts[0] === 'api' && urlParts[1] === 'approvals' && urlParts[2]) {
            return await handleGetApproval(req, res, urlParts[2]);
        }

        // POST /api/approvals/:id/approve
        if (method === 'POST' && urlParts[0] === 'api' && urlParts[1] === 'approvals' &&
            urlParts[2] && urlParts[3] === 'approve') {
            return await handleApprove(req, res, urlParts[2]);
        }

        // POST /api/approvals/:id/reject
        if (method === 'POST' && urlParts[0] === 'api' && urlParts[1] === 'approvals' &&
            urlParts[2] && urlParts[3] === 'reject') {
            return await handleReject(req, res, urlParts[2]);
        }

        // GET /api/history
        if (method === 'GET' && url === '/api/history') {
            return await handleHistory(req, res);
        }

        // GET /api/stats
        if (method === 'GET' && url === '/api/stats') {
            return await handleStats(req, res);
        }

        // GET /api/documents
        if (method === 'GET' && url === '/api/documents') {
            return await handleGetDocuments(req, res);
        }

        // POST /api/documents
        if (method === 'POST' && url === '/api/documents') {
            return await handleUploadDocument(req, res);
        }

        // DELETE /api/documents/:id
        if (method === 'DELETE' && urlParts[0] === 'api' && urlParts[1] === 'documents' && urlParts[2]) {
            return await handleDeleteDocument(req, res, urlParts[2]);
        }

        // 404 Not Found
        sendJSON(res, 404, { success: false, error: 'Not found' });
    } catch (error) {
        logger.error('Request handling error', { error: error.message, url, method });
        sendJSON(res, 500, { success: false, error: 'Internal server error' });
    }
}

// ============================================================================
// Server Startup
// ============================================================================

const PORT = parseInt(process.env.API_PORT, 10) || 3001;

async function startServer() {
    await initializeAgent();

    const server = createServer(handleRequest);

    server.listen(PORT, () => {
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('                     CEO AGENT - API SERVER');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log(`\n🚀 Server running at http://localhost:${PORT}`);
        console.log('\nEndpoints:');
        console.log('  GET  /api/status            - Agent status');
        console.log('  POST /api/analyze           - Process strategic query');
        console.log('  GET  /api/approvals         - List pending approvals');
        console.log('  GET  /api/approvals/:id     - Get approval details');
        console.log('  POST /api/approvals/:id/approve - Approve decision');
        console.log('  POST /api/approvals/:id/reject  - Reject decision');
        console.log('  GET  /api/history           - Decision history');
        console.log('  GET  /api/stats             - System statistics');
        console.log('  GET  /api/documents         - List RAG documents');
        console.log('  POST /api/documents         - Upload document');
        console.log('  DELETE /api/documents/:id   - Delete document');
        console.log('\n═══════════════════════════════════════════════════════════════════\n');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        memoryManager.destroy();
        server.close();
        process.exit(0);
    });
}

startServer().catch(console.error);

export { startServer };
