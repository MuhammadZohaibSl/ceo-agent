/**
 * Agent Service - Manages agent instances and initialization
 */

import { createAgent } from '../../core/Agent.js';
import { createMemoryManager } from '../../memory/index.js';
import { createRAGEngine } from '../../rag/index.js';
import { OptionGenerator, OptionEvaluator, RiskModel, DecisionFormatter } from '../../reasoning/index.js';
import { createLLMRouter, OpenAIClient, AnthropicClient, OllamaClient, RoutingStrategy } from '../../llm/index.js';
import { createSafetyGuard } from '../../safety/index.js';
import { createAuditLogger, createApprovalManager, createFeedbackCollector } from '../../audit/index.js';
import config, { validateConfig } from '../../config/index.js';
import logger from '../../utils/logger.js';

// Agent service singleton instances
let agent = null;
let llmRouter = null;
let approvalManager = null;
let feedbackCollector = null;
let auditLogger = null;
let memoryManager = null;
let ragEngine = null;

/**
 * Initialize all agent dependencies
 */
async function initialize() {
    logger.info('Initializing CEO Agent services');

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

    logger.info('Agent services ready', agent.getStatus());
}

/**
 * Get the agent instance
 */
function getAgent() {
    return agent;
}

/**
 * Get the LLM router instance
 */
function getLLMRouter() {
    return llmRouter;
}

/**
 * Get the approval manager instance
 */
function getApprovalManager() {
    return approvalManager;
}

/**
 * Get the feedback collector instance
 */
function getFeedbackCollector() {
    return feedbackCollector;
}

/**
 * Get the audit logger instance
 */
function getAuditLogger() {
    return auditLogger;
}

/**
 * Get the memory manager instance
 */
function getMemoryManager() {
    return memoryManager;
}

/**
 * Get the RAG engine instance
 */
function getRAGEngine() {
    return ragEngine;
}

/**
 * Cleanup resources
 */
function destroy() {
    if (memoryManager) {
        memoryManager.destroy();
    }
}

export const agentService = {
    initialize,
    getAgent,
    getLLMRouter,
    getApprovalManager,
    getFeedbackCollector,
    getAuditLogger,
    getMemoryManager,
    getRAGEngine,
    destroy,
};

export default agentService;
