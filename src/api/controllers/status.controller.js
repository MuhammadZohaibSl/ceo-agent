/**
 * Status Controller
 * Handles agent status endpoints
 */

import { sendSuccess } from '../middleware/index.js';
import agentService from '../services/agent.service.js';

/**
 * GET /api/status - Get agent and system status
 */
export async function getStatus(req, res) {
    const agent = agentService.getAgent();
    const llmRouter = agentService.getLLMRouter();
    const memoryManager = agentService.getMemoryManager();
    const ragEngine = agentService.getRAGEngine();

    const agentStatus = agent.getStatus();
    const llmStatus = llmRouter.getStatus();
    const memoryStats = memoryManager.getStats();
    const ragStats = ragEngine.getStats();

    sendSuccess(res, {
        agent: agentStatus,
        llm: {
            strategy: llmStatus.strategy,
            availableProviders: llmStatus.availableCount,
            providers: llmStatus.providers,
        },
        memory: memoryStats,
        rag: ragStats,
    });
}

/**
 * GET /api/stats - Get detailed system statistics
 */
export async function getStats(req, res) {
    const auditLogger = agentService.getAuditLogger();
    const approvalManager = agentService.getApprovalManager();
    const feedbackCollector = agentService.getFeedbackCollector();
    const memoryManager = agentService.getMemoryManager();
    const ragEngine = agentService.getRAGEngine();

    sendSuccess(res, {
        audit: auditLogger.getStats(),
        approvals: approvalManager.getStats(),
        feedback: feedbackCollector.getStats(),
        memory: memoryManager.getStats(),
        rag: ragEngine.getStats(),
    });
}

/**
 * GET /api/history - Get decision history
 */
export async function getHistory(req, res) {
    const memoryManager = agentService.getMemoryManager();
    const memories = memoryManager.search('decision', 20);
    sendSuccess(res, memories);
}

export default {
    getStatus,
    getStats,
    getHistory,
};
