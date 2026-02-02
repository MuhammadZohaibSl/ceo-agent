/**
 * Analysis Controller
 * Handles strategic query analysis
 */

import { getBody, parseJSON, sendSuccess, sendError } from '../middleware/index.js';
import agentService from '../services/agent.service.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/analyze - Process a strategic query
 */
export async function analyze(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.query) {
        return sendError(res, 'Missing required field: query', 400);
    }

    try {
        logger.info('Processing analysis request', { query: data.query.substring(0, 100) });

        const agent = agentService.getAgent();
        const approvalManager = agentService.getApprovalManager();
        const auditLogger = agentService.getAuditLogger();

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

        sendSuccess(res, {
            id: result.id,
            proposal: result.proposal,
            approvalRequest: approvalRequest ? { id: approvalRequest.id } : null,
        });
    } catch (error) {
        logger.error('Analysis failed', { error: error.message });
        sendError(res, error.message, 500);
    }
}

export default {
    analyze,
};
