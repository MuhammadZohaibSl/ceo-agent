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
import { createLLMRouter, OpenRouterClient, GroqClient, RoutingStrategy } from './llm/index.js';
import { createSafetyGuard } from './safety/index.js';
import { createAuditLogger, createApprovalManager, createFeedbackCollector } from './audit/index.js';
import { createOKRManager } from './okr/index.js';
import { createVisionEngine } from './vision/index.js';
import { createTimelineManager } from './timeline/index.js';
import config, { validateConfig } from './config/index.js';
import logger from './utils/logger.js';
import { connectDB, disconnectDB, isDBConnected, Settings, Document } from './db/index.js';

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
let okrManager = null;
let visionEngine = null;
let timelineManager = null;

// LLM Settings (user preferences)
let llmSettings = {
    defaultProvider: 'auto',
    availableProviders: ['auto', 'groq', 'openrouter'],
};

async function initializeAgent() {
    logger.info('Initializing CEO Agent for HTTP server');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
        try {
            await connectDB(mongoUri);

            // Load LLM settings from database
            const savedProvider = await Settings.getSetting('llm.defaultProvider', 'groq');
            llmSettings.defaultProvider = savedProvider;
            logger.info('LLM settings loaded from database', { defaultProvider: savedProvider });
        } catch (error) {
            logger.warn('MongoDB connection failed, using in-memory storage', { error: error.message });
        }
    } else {
        logger.warn('MONGODB_URI not set, using in-memory storage');
    }

    // Validate configuration
    const { valid, errors } = validateConfig();
    if (!valid) {
        logger.warn('Configuration validation warnings', { errors });
    }

    // Initialize LLM Router with providers
    llmRouter = createLLMRouter({
        strategy: RoutingStrategy.BEST_AVAILABLE,
        providers: {
            groq: new GroqClient({
                apiKey: process.env.GROQ_API_KEY ?? '',
                model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
                timeout: parseInt(process.env.LLM_TIMEOUT, 10) || 60000,
            }),
            openrouter: new OpenRouterClient({
                apiKey: process.env.OPENROUTER_API_KEY ?? '',
                model: process.env.OPENROUTER_MODEL ?? 'openrouter/auto',
                timeout: parseInt(process.env.LLM_TIMEOUT, 10) || 60000,
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
        // First ingest from directory (legacy/file-based)
        if (existsSync('./data/documents')) {
            await ragEngine.ingestDirectory('./data/documents', false);
        }

        // Then ingest all documents from MongoDB if connected
        if (isDBConnected()) {
            const dbDocs = await Document.find({});
            for (const doc of dbDocs) {
                await ragEngine.ingestText(doc.content, {
                    documentId: doc._id.toString(),
                    name: doc.name,
                    type: doc.type
                });
            }
        }

        logger.info('Documents ingested', ragEngine.getStats());
    } catch (error) {
        logger.warn('Document ingestion issue', { error: error.message });
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

    // Initialize OKR Manager
    okrManager = createOKRManager({
        storageDir: './data/okrs',
        auditLogger,
    });

    // Initialize Vision Engine
    visionEngine = createVisionEngine({
        llmClient: llmRouter,
        storageDir: './data/vision',
        auditLogger,
    });

    // Initialize Timeline Manager
    timelineManager = createTimelineManager({
        approvalsDir: './data/approvals',
        auditDir: './data/audit',
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
        // Determine which provider to use (request > settings > default)
        // 'auto' means let the router decide based on health/cost
        let preferredProvider = data.provider ?? llmSettings.defaultProvider;
        if (preferredProvider === 'auto') {
            preferredProvider = null;
        }

        logger.info('Processing analysis request', {
            query: data.query.substring(0, 100),
            provider: preferredProvider ?? 'auto',
        });

        const result = await agent.process(data.query, {
            constraints: data.constraints ?? {},
            preferredProvider,
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
                provider: preferredProvider,
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
    try {
        const documents = await Document.find({}, 'name type size isIngested createdAt').sort({ createdAt: -1 });

        const data = documents.map(doc => ({
            id: doc._id.toString(),
            name: doc.name,
            type: doc.type,
            size: doc.size,
            isIngested: doc.isIngested,
            createdAt: doc.createdAt,
        }));

        sendJSON(res, 200, { success: true, data });
    } catch (error) {
        logger.error('Failed to list documents', { error: error.message });
        sendJSON(res, 500, { success: false, error: error.message });
    }
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

    try {
        const doc = new Document({
            name: data.name,
            content: data.content,
            type: data.type ?? 'md',
            size: Buffer.byteLength(data.content, 'utf8'),
            metadata: {
                originalName: data.originalName,
                mimeType: data.mimeType,
            },
        });

        await doc.save();

        // Ingest to RAG engine
        try {
            await ragEngine.ingestText(data.content, {
                documentId: doc._id.toString(),
                name: data.name,
                type: data.type ?? 'md',
            });
            doc.isIngested = true;
            await doc.save();
        } catch (ingestError) {
            logger.warn('Failed to ingest document to RAG', { error: ingestError.message });
        }

        logger.info('Document uploaded', { id: doc._id, name: data.name });

        sendJSON(res, 201, {
            success: true,
            data: {
                id: doc._id.toString(),
                name: doc.name,
                type: doc.type,
                size: doc.size,
            },
        });
    } catch (error) {
        logger.error('Failed to upload document', { error: error.message });
        sendJSON(res, 500, { success: false, error: error.message });
    }
}

// DELETE /api/documents/:id - Delete a document
async function handleDeleteDocument(req, res, documentId) {
    try {
        const doc = await Document.findByIdAndDelete(documentId);

        if (!doc) {
            return sendJSON(res, 404, { success: false, error: 'Document not found' });
        }

        // Also remove from RAG engine
        try {
            ragEngine.removeDocument(documentId);
        } catch (ragError) {
            logger.warn('Failed to remove document from RAG engine', {
                documentId,
                error: ragError.message
            });
        }

        logger.info('Document deleted', { id: documentId, name: doc.name });

        sendJSON(res, 200, {
            success: true,
            data: { id: documentId, deleted: true },
        });
    } catch (error) {
        logger.error('Failed to delete document', { error: error.message });
        sendJSON(res, 500, { success: false, error: error.message });
    }
}

// ============================================================================
// OKR API Handlers
// ============================================================================

// POST /api/okrs - Create OKR
async function handleCreateOKR(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.title) {
        return sendJSON(res, 400, { success: false, error: 'Missing required field: title' });
    }

    try {
        const okr = okrManager.create({
            title: data.title,
            description: data.description,
            owner: data.owner,
            timeframe: data.timeframe,
            startDate: data.startDate,
            endDate: data.endDate,
            keyResults: data.keyResults ?? [],
        });

        sendJSON(res, 201, { success: true, data: okr });
    } catch (error) {
        logger.error('Failed to create OKR', { error: error.message });
        sendJSON(res, 500, { success: false, error: error.message });
    }
}

// GET /api/okrs - List OKRs
async function handleListOKRs(req, res) {
    const url = new URL(req.url, `http://localhost`);
    const filters = {
        status: url.searchParams.get('status'),
        owner: url.searchParams.get('owner'),
        timeframe: url.searchParams.get('timeframe'),
    };

    const okrs = okrManager.list(filters);
    const stats = okrManager.getStats();

    sendJSON(res, 200, { success: true, data: { okrs, stats } });
}

// GET /api/okrs/:id - Get OKR
async function handleGetOKR(req, res, okrId) {
    const okr = okrManager.get(okrId);

    if (!okr) {
        return sendJSON(res, 404, { success: false, error: 'OKR not found' });
    }

    sendJSON(res, 200, { success: true, data: okr });
}

// PUT /api/okrs/:id - Update OKR
async function handleUpdateOKR(req, res, okrId) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data) {
        return sendJSON(res, 400, { success: false, error: 'Invalid request body' });
    }

    const okr = okrManager.update(okrId, data);

    if (!okr) {
        return sendJSON(res, 404, { success: false, error: 'OKR not found' });
    }

    sendJSON(res, 200, { success: true, data: okr });
}

// PUT /api/okrs/:id/progress - Update Key Result progress
async function handleUpdateOKRProgress(req, res, okrId) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.keyResultId || data.currentValue === undefined) {
        return sendJSON(res, 400, {
            success: false,
            error: 'Missing required fields: keyResultId, currentValue'
        });
    }

    const okr = okrManager.updateKeyResultProgress(
        okrId,
        data.keyResultId,
        data.currentValue,
        data.actor ?? 'user'
    );

    if (!okr) {
        return sendJSON(res, 404, { success: false, error: 'OKR or Key Result not found' });
    }

    sendJSON(res, 200, { success: true, data: okr });
}

// DELETE /api/okrs/:id - Delete OKR
async function handleDeleteOKR(req, res, okrId) {
    const success = okrManager.delete(okrId);

    if (!success) {
        return sendJSON(res, 404, { success: false, error: 'OKR not found' });
    }

    sendJSON(res, 200, { success: true, data: { id: okrId, deleted: true } });
}

// ============================================================================
// Vision API Handlers
// ============================================================================

// POST /api/vision/generate - Generate vision
async function handleGenerateVision(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body) || {};

    try {
        const vision = await visionEngine.generate({
            context: data.context,
            industry: data.industry,
            companyName: data.companyName,
            existingStrengths: data.existingStrengths,
            challenges: data.challenges,
            timeHorizon: data.timeHorizon,
        });

        sendJSON(res, 201, { success: true, data: vision });
    } catch (error) {
        logger.error('Vision generation failed', { error: error.message });
        sendJSON(res, 500, { success: false, error: error.message });
    }
}

// GET /api/vision - Get current vision
async function handleGetVision(req, res) {
    const current = visionEngine.getCurrent();
    const all = visionEngine.list();

    sendJSON(res, 200, {
        success: true,
        data: { current, all }
    });
}

// GET /api/vision/:id - Get vision by ID
async function handleGetVisionById(req, res, visionId) {
    const vision = visionEngine.get(visionId);

    if (!vision) {
        return sendJSON(res, 404, { success: false, error: 'Vision not found' });
    }

    sendJSON(res, 200, { success: true, data: vision });
}

// PUT /api/vision/:id - Update vision
async function handleUpdateVision(req, res, visionId) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data) {
        return sendJSON(res, 400, { success: false, error: 'Invalid request body' });
    }

    const vision = visionEngine.update(visionId, data);

    if (!vision) {
        return sendJSON(res, 404, { success: false, error: 'Vision not found' });
    }

    sendJSON(res, 200, { success: true, data: vision });
}

// POST /api/vision/:id/activate - Activate vision
async function handleActivateVision(req, res, visionId) {
    const vision = visionEngine.activate(visionId);

    if (!vision) {
        return sendJSON(res, 404, { success: false, error: 'Vision not found' });
    }

    sendJSON(res, 200, { success: true, data: vision });
}

// POST /api/vision/:id/validate - Validate vision coherence
async function handleValidateVision(req, res, visionId) {
    const result = visionEngine.validateCoherence(visionId);

    sendJSON(res, 200, { success: true, data: result });
}

// ============================================================================
// Timeline API Handlers
// ============================================================================

// GET /api/timeline - Get decision timeline
async function handleGetTimeline(req, res) {
    const url = new URL(req.url, `http://localhost`);
    const options = {
        limit: parseInt(url.searchParams.get('limit')) || 50,
        offset: parseInt(url.searchParams.get('offset')) || 0,
        outcome: url.searchParams.get('outcome'),
        startDate: url.searchParams.get('startDate'),
        endDate: url.searchParams.get('endDate'),
        search: url.searchParams.get('search'),
    };

    const timeline = timelineManager.getTimeline(options);

    sendJSON(res, 200, { success: true, data: timeline });
}

// GET /api/timeline/stats - Get timeline statistics
async function handleGetTimelineStats(req, res) {
    const url = new URL(req.url, `http://localhost`);
    const period = url.searchParams.get('period') || 'month';

    const stats = timelineManager.getStats({ period });

    sendJSON(res, 200, { success: true, data: stats });
}

// GET /api/timeline/visualization - Get visualization data
async function handleGetTimelineVisualization(req, res) {
    const url = new URL(req.url, `http://localhost`);
    const options = {
        granularity: url.searchParams.get('granularity') || 'week',
        periods: parseInt(url.searchParams.get('periods')) || 12,
    };

    const data = timelineManager.getVisualizationData(options);

    sendJSON(res, 200, { success: true, data });
}

// GET /api/timeline/:id - Get decision details
async function handleGetTimelineDecision(req, res, decisionId) {
    const decision = timelineManager.getDecision(decisionId);

    if (!decision) {
        return sendJSON(res, 404, { success: false, error: 'Decision not found' });
    }

    sendJSON(res, 200, { success: true, data: decision });
}

// GET /api/timeline/:id/impact - Get decision impact
async function handleGetDecisionImpact(req, res, decisionId) {
    const impact = timelineManager.getImpact(decisionId);

    if (!impact) {
        return sendJSON(res, 404, { success: false, error: 'Decision not found' });
    }

    sendJSON(res, 200, { success: true, data: impact });
}

// GET /api/timeline/search - Search decisions by rationale
async function handleSearchTimeline(req, res) {
    const url = new URL(req.url, `http://localhost`);
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit')) || 20;

    if (!query) {
        return sendJSON(res, 400, { success: false, error: 'Missing search query (q)' });
    }

    const results = timelineManager.searchByRationale(query, limit);

    sendJSON(res, 200, { success: true, data: results });
}

// ============================================================================
// Feedback API Handlers
// ============================================================================

// POST /api/feedback/rating - Record a rating
async function handleRecordRating(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.contextId || data.rating === undefined) {
        return sendJSON(res, 400, {
            success: false,
            error: 'Missing required fields: contextId, rating'
        });
    }

    try {
        const feedback = feedbackCollector.recordRating({
            contextId: data.contextId,
            rating: data.rating,
            comment: data.comment ?? '',
            ratedBy: data.ratedBy ?? 'user',
        });

        sendJSON(res, 201, { success: true, data: feedback });
    } catch (error) {
        sendJSON(res, 400, { success: false, error: error.message });
    }
}

// POST /api/feedback/correction - Record a correction
async function handleRecordCorrection(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.contextId || !data.field) {
        return sendJSON(res, 400, {
            success: false,
            error: 'Missing required fields: contextId, field'
        });
    }

    try {
        const feedback = feedbackCollector.recordCorrection({
            contextId: data.contextId,
            field: data.field,
            originalValue: data.originalValue,
            correctedValue: data.correctedValue,
            reason: data.reason ?? '',
            correctedBy: data.correctedBy ?? 'user',
        });

        sendJSON(res, 201, { success: true, data: feedback });
    } catch (error) {
        sendJSON(res, 400, { success: false, error: error.message });
    }
}

// POST /api/feedback/outcome - Record an outcome
async function handleRecordOutcome(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.contextId || !data.status) {
        return sendJSON(res, 400, {
            success: false,
            error: 'Missing required fields: contextId, status'
        });
    }

    try {
        const feedback = feedbackCollector.recordOutcome({
            contextId: data.contextId,
            status: data.status,
            metrics: data.metrics ?? {},
            notes: data.notes ?? '',
            recordedBy: data.recordedBy ?? 'user',
        });

        sendJSON(res, 201, { success: true, data: feedback });
    } catch (error) {
        sendJSON(res, 400, { success: false, error: error.message });
    }
}

// GET /api/feedback/:contextId - Get feedback for a context
async function handleGetFeedback(req, res, contextId) {
    const feedback = feedbackCollector.getFeedback(contextId);
    sendJSON(res, 200, { success: true, data: feedback });
}

// GET /api/feedback/stats - Get feedback statistics
async function handleGetFeedbackStats(req, res) {
    const stats = feedbackCollector.getStats();
    sendJSON(res, 200, { success: true, data: stats });
}

// GET /api/feedback/learnings - Get learning insights
async function handleGetLearnings(req, res) {
    const learnings = feedbackCollector.getLearnings();
    sendJSON(res, 200, { success: true, data: learnings });
}

// ============================================================================
// LLM Settings API Handlers
// ============================================================================

// GET /api/settings/llm - Get LLM settings
async function handleGetLLMSettings(req, res) {
    const llmStatus = llmRouter.getStatus();

    sendJSON(res, 200, {
        success: true,
        data: {
            defaultProvider: llmSettings.defaultProvider,
            availableProviders: llmSettings.availableProviders,
            providers: llmStatus.providers,
        },
    });
}

// PUT /api/settings/llm - Update LLM settings
async function handleUpdateLLMSettings(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data) {
        return sendJSON(res, 400, { success: false, error: 'Invalid request body' });
    }

    // Validate provider if specified
    if (data.defaultProvider) {
        if (!llmSettings.availableProviders.includes(data.defaultProvider)) {
            return sendJSON(res, 400, {
                success: false,
                error: `Invalid provider. Available: ${llmSettings.availableProviders.join(', ')}`
            });
        }
        llmSettings.defaultProvider = data.defaultProvider;

        // Persist to MongoDB if available
        try {
            await Settings.setSetting('llm.defaultProvider', data.defaultProvider, 'user');
            logger.info('LLM default provider saved to database', { provider: data.defaultProvider });
        } catch (error) {
            logger.warn('Failed to persist LLM settings', { error: error.message });
        }
    }

    sendJSON(res, 200, {
        success: true,
        data: {
            defaultProvider: llmSettings.defaultProvider,
            availableProviders: llmSettings.availableProviders,
        },
    });
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

        // GET /api/settings/llm
        if (method === 'GET' && url.split('?')[0] === '/api/settings/llm') {
            return await handleGetLLMSettings(req, res);
        }

        // PUT /api/settings/llm
        if (method === 'PUT' && url.split('?')[0] === '/api/settings/llm') {
            return await handleUpdateLLMSettings(req, res);
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

        // ============================================================
        // OKR Routes
        // ============================================================

        // POST /api/okrs - Create OKR
        if (method === 'POST' && url.split('?')[0] === '/api/okrs') {
            return await handleCreateOKR(req, res);
        }

        // GET /api/okrs - List OKRs
        if (method === 'GET' && url.split('?')[0] === '/api/okrs') {
            return await handleListOKRs(req, res);
        }

        // GET /api/okrs/:id - Get specific OKR
        if (method === 'GET' && urlParts[0] === 'api' && urlParts[1] === 'okrs' && urlParts[2] && !urlParts[3]) {
            return await handleGetOKR(req, res, urlParts[2]);
        }

        // PUT /api/okrs/:id - Update OKR
        if (method === 'PUT' && urlParts[0] === 'api' && urlParts[1] === 'okrs' && urlParts[2] && !urlParts[3]) {
            return await handleUpdateOKR(req, res, urlParts[2]);
        }

        // PUT /api/okrs/:id/progress - Update Key Result progress
        if (method === 'PUT' && urlParts[0] === 'api' && urlParts[1] === 'okrs' &&
            urlParts[2] && urlParts[3] === 'progress') {
            return await handleUpdateOKRProgress(req, res, urlParts[2]);
        }

        // DELETE /api/okrs/:id - Delete OKR
        if (method === 'DELETE' && urlParts[0] === 'api' && urlParts[1] === 'okrs' && urlParts[2]) {
            return await handleDeleteOKR(req, res, urlParts[2]);
        }

        // ============================================================
        // Vision Routes
        // ============================================================

        // POST /api/vision/generate - Generate vision
        if (method === 'POST' && url.split('?')[0] === '/api/vision/generate') {
            return await handleGenerateVision(req, res);
        }

        // GET /api/vision - Get current vision
        if (method === 'GET' && url.split('?')[0] === '/api/vision') {
            return await handleGetVision(req, res);
        }

        // GET /api/vision/:id - Get vision by ID
        if (method === 'GET' && urlParts[0] === 'api' && urlParts[1] === 'vision' &&
            urlParts[2] && !urlParts[3]) {
            return await handleGetVisionById(req, res, urlParts[2]);
        }

        // PUT /api/vision/:id - Update vision
        if (method === 'PUT' && urlParts[0] === 'api' && urlParts[1] === 'vision' &&
            urlParts[2] && !urlParts[3]) {
            return await handleUpdateVision(req, res, urlParts[2]);
        }

        // POST /api/vision/:id/activate - Activate vision
        if (method === 'POST' && urlParts[0] === 'api' && urlParts[1] === 'vision' &&
            urlParts[2] && urlParts[3] === 'activate') {
            return await handleActivateVision(req, res, urlParts[2]);
        }

        // POST /api/vision/:id/validate - Validate vision coherence
        if (method === 'POST' && urlParts[0] === 'api' && urlParts[1] === 'vision' &&
            urlParts[2] && urlParts[3] === 'validate') {
            return await handleValidateVision(req, res, urlParts[2]);
        }

        // ============================================================
        // Timeline Routes
        // ============================================================

        // GET /api/timeline/stats - Timeline statistics (must come before :id route)
        if (method === 'GET' && url.split('?')[0] === '/api/timeline/stats') {
            return await handleGetTimelineStats(req, res);
        }

        // GET /api/timeline/visualization - Visualization data
        if (method === 'GET' && url.split('?')[0] === '/api/timeline/visualization') {
            return await handleGetTimelineVisualization(req, res);
        }

        // GET /api/timeline/search - Search decisions
        if (method === 'GET' && url.split('?')[0] === '/api/timeline/search') {
            return await handleSearchTimeline(req, res);
        }

        // GET /api/timeline - Get timeline
        if (method === 'GET' && url.split('?')[0] === '/api/timeline') {
            return await handleGetTimeline(req, res);
        }

        // GET /api/timeline/:id - Get decision details
        if (method === 'GET' && urlParts[0] === 'api' && urlParts[1] === 'timeline' &&
            urlParts[2] && !urlParts[3]) {
            return await handleGetTimelineDecision(req, res, urlParts[2]);
        }

        // GET /api/timeline/:id/impact - Get decision impact
        if (method === 'GET' && urlParts[0] === 'api' && urlParts[1] === 'timeline' &&
            urlParts[2] && urlParts[3] === 'impact') {
            return await handleGetDecisionImpact(req, res, urlParts[2]);
        }

        // ============================================================
        // Feedback Routes
        // ============================================================

        // GET /api/feedback/stats - Feedback statistics (must come before :contextId)
        if (method === 'GET' && url.split('?')[0] === '/api/feedback/stats') {
            return await handleGetFeedbackStats(req, res);
        }

        // GET /api/feedback/learnings - Learning insights (must come before :contextId)
        if (method === 'GET' && url.split('?')[0] === '/api/feedback/learnings') {
            return await handleGetLearnings(req, res);
        }

        // POST /api/feedback/rating - Record a rating
        if (method === 'POST' && url.split('?')[0] === '/api/feedback/rating') {
            return await handleRecordRating(req, res);
        }

        // POST /api/feedback/correction - Record a correction
        if (method === 'POST' && url.split('?')[0] === '/api/feedback/correction') {
            return await handleRecordCorrection(req, res);
        }

        // POST /api/feedback/outcome - Record an outcome
        if (method === 'POST' && url.split('?')[0] === '/api/feedback/outcome') {
            return await handleRecordOutcome(req, res);
        }

        // GET /api/feedback/:contextId - Get feedback for a context
        if (method === 'GET' && urlParts[0] === 'api' && urlParts[1] === 'feedback' &&
            urlParts[2] && !urlParts[3]) {
            return await handleGetFeedback(req, res, urlParts[2]);
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
        console.log('\n📊 Core Endpoints:');
        console.log('  GET  /api/status            - Agent status');
        console.log('  POST /api/analyze           - Process strategic query');
        console.log('  GET  /api/approvals         - List pending approvals');
        console.log('  POST /api/approvals/:id/approve - Approve decision');
        console.log('  POST /api/approvals/:id/reject  - Reject decision');
        console.log('  GET  /api/history           - Decision history');
        console.log('  GET  /api/stats             - System statistics');
        console.log('  GET  /api/documents         - List RAG documents');
        console.log('  POST /api/documents         - Upload document');
        console.log('\n🎯 OKR Endpoints (Sprint 2):');
        console.log('  POST /api/okrs              - Create OKR');
        console.log('  GET  /api/okrs              - List OKRs');
        console.log('  GET  /api/okrs/:id          - Get OKR');
        console.log('  PUT  /api/okrs/:id          - Update OKR');
        console.log('  PUT  /api/okrs/:id/progress - Update Key Result progress');
        console.log('  DELETE /api/okrs/:id        - Delete OKR');
        console.log('\n🌟 Vision Endpoints (Sprint 2):');
        console.log('  POST /api/vision/generate   - Generate vision with LLM');
        console.log('  GET  /api/vision            - Get current vision');
        console.log('  GET  /api/vision/:id        - Get vision by ID');
        console.log('  PUT  /api/vision/:id        - Update vision');
        console.log('  POST /api/vision/:id/activate - Activate vision');
        console.log('  POST /api/vision/:id/validate - Validate coherence');
        console.log('\n📅 Timeline Endpoints (Sprint 2):');
        console.log('  GET  /api/timeline          - Get decision timeline');
        console.log('  GET  /api/timeline/stats    - Timeline statistics');
        console.log('  GET  /api/timeline/visualization - Visualization data');
        console.log('  GET  /api/timeline/search   - Search decisions');
        console.log('  GET  /api/timeline/:id      - Decision details');
        console.log('  GET  /api/timeline/:id/impact - Decision impact');
        console.log('\n💬 Feedback Endpoints:');
        console.log('  POST /api/feedback/rating   - Record rating (1-5)');
        console.log('  POST /api/feedback/correction - Record correction');
        console.log('  POST /api/feedback/outcome  - Record outcome');
        console.log('  GET  /api/feedback/stats    - Feedback statistics');
        console.log('  GET  /api/feedback/learnings - Learning insights');
        console.log('  GET  /api/feedback/:contextId - Get feedback for context');
        console.log('\n⚙️  Settings Endpoints:');
        console.log('  GET  /api/settings/llm      - Get LLM provider settings');
        console.log('  PUT  /api/settings/llm      - Update LLM provider settings');
        console.log('\n═══════════════════════════════════════════════════════════════════\n');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        memoryManager.destroy();
        await disconnectDB();
        server.close();
        process.exit(0);
    });
}

startServer().catch(console.error);

export { startServer };
