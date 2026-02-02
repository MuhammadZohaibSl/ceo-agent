/**
 * Approvals Controller
 * Handles human-in-the-loop approval workflow
 */

import { getBody, parseJSON, sendSuccess, sendError } from '../middleware/index.js';
import agentService from '../services/agent.service.js';

/**
 * GET /api/approvals - List pending approvals
 */
export async function getApprovals(req, res) {
    const approvalManager = agentService.getApprovalManager();
    const pending = approvalManager.getPending();
    const stats = approvalManager.getStats();

    sendSuccess(res, { pending, stats });
}

/**
 * GET /api/approvals/:id - Get specific approval
 */
export async function getApproval(req, res, approvalId) {
    const approvalManager = agentService.getApprovalManager();
    const approval = approvalManager.get(approvalId);

    if (!approval) {
        return sendError(res, 'Approval not found', 404);
    }

    sendSuccess(res, approval);
}

/**
 * POST /api/approvals/:id/approve - Approve a decision
 */
export async function approve(req, res, approvalId) {
    const body = await getBody(req);
    const data = parseJSON(body) || {};

    try {
        const approvalManager = agentService.getApprovalManager();
        const result = approvalManager.approve(
            approvalId,
            data.approver ?? 'anonymous',
            data.notes ?? ''
        );
        sendSuccess(res, result);
    } catch (error) {
        sendError(res, error.message, 400);
    }
}

/**
 * POST /api/approvals/:id/reject - Reject a decision
 */
export async function reject(req, res, approvalId) {
    const body = await getBody(req);
    const data = parseJSON(body) || {};

    if (!data.reason) {
        return sendError(res, 'Missing required field: reason', 400);
    }

    try {
        const approvalManager = agentService.getApprovalManager();
        const result = approvalManager.reject(
            approvalId,
            data.approver ?? 'anonymous',
            data.reason
        );
        sendSuccess(res, result);
    } catch (error) {
        sendError(res, error.message, 400);
    }
}

export default {
    getApprovals,
    getApproval,
    approve,
    reject,
};
