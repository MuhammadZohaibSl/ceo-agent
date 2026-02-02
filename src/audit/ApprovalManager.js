/**
 * Approval Manager
 * Handles human-in-the-loop approval workflows
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

/**
 * Approval status
 */
export const ApprovalStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
    MODIFIED: 'modified',
};

/**
 * Approval priority
 */
export const ApprovalPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
};

export class ApprovalManager {
    /**
     * @param {Object} options
     * @param {string} options.storageDir - Directory for approval records
     * @param {number} options.expirationHours - Hours before approval expires
     * @param {Object} options.auditLogger - Audit logger instance
     */
    constructor(options = {}) {
        this.storageDir = options.storageDir ?? './data/approvals';
        this.expirationHours = options.expirationHours ?? 24;
        this.auditLogger = options.auditLogger;

        // In-memory pending approvals
        this._pending = new Map();

        // Ensure storage directory exists
        this._ensureDir(this.storageDir);

        this.log = logger.child({ component: 'ApprovalManager' });
        this.log.info('ApprovalManager initialized');
    }

    /**
     * Submit a decision for approval
     * @param {Object} params
     * @param {string} params.contextId - Decision context ID
     * @param {Object} params.proposal - Decision proposal
     * @param {string} params.requiredBy - Who needs to approve
     * @param {string} params.priority - Approval priority
     * @returns {Object} Approval request
     */
    submitForApproval(params) {
        const { contextId, proposal, requiredBy = 'human', priority = ApprovalPriority.MEDIUM } = params;

        const request = {
            id: this._generateApprovalId(),
            contextId,
            status: ApprovalStatus.PENDING,
            priority,
            requiredBy,
            proposal: this._summarizeProposal(proposal),
            submittedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.expirationHours * 3600000).toISOString(),
            approver: null,
            approvalNotes: null,
            modifications: null,
        };

        // Store in memory
        this._pending.set(request.id, request);

        // Persist to file
        this._saveRequest(request);

        // Log audit event
        if (this.auditLogger) {
            this.auditLogger.logEvent({
                contextId,
                eventType: 'approval_requested',
                data: { approvalId: request.id, priority },
            });
        }

        this.log.info('Approval request submitted', {
            approvalId: request.id,
            contextId,
            priority,
        });

        return request;
    }

    /**
     * Approve a pending decision
     * @param {string} approvalId - Approval request ID
     * @param {string} approver - Who approved
     * @param {string} notes - Approval notes
     * @returns {Object} Updated approval
     */
    approve(approvalId, approver, notes = '') {
        return this._updateApproval(approvalId, {
            status: ApprovalStatus.APPROVED,
            approver,
            approvalNotes: notes,
            decidedAt: new Date().toISOString(),
        });
    }

    /**
     * Reject a pending decision
     * @param {string} approvalId - Approval request ID
     * @param {string} approver - Who rejected
     * @param {string} reason - Rejection reason
     * @returns {Object} Updated approval
     */
    reject(approvalId, approver, reason) {
        return this._updateApproval(approvalId, {
            status: ApprovalStatus.REJECTED,
            approver,
            approvalNotes: reason,
            decidedAt: new Date().toISOString(),
        });
    }

    /**
     * Approve with modifications
     * @param {string} approvalId - Approval request ID
     * @param {string} approver - Who approved
     * @param {Object} modifications - Changes made to proposal
     * @param {string} notes - Modification notes
     * @returns {Object} Updated approval
     */
    approveWithModifications(approvalId, approver, modifications, notes = '') {
        return this._updateApproval(approvalId, {
            status: ApprovalStatus.MODIFIED,
            approver,
            modifications,
            approvalNotes: notes,
            decidedAt: new Date().toISOString(),
        });
    }

    /**
     * Get pending approvals
     * @returns {Object[]}
     */
    getPending() {
        const now = new Date();
        const pending = [];

        for (const [id, request] of this._pending.entries()) {
            if (request.status === ApprovalStatus.PENDING) {
                // Check expiration
                if (new Date(request.expiresAt) < now) {
                    request.status = ApprovalStatus.EXPIRED;
                    this._saveRequest(request);
                } else {
                    pending.push(request);
                }
            }
        }

        return pending.sort((a, b) => {
            // Sort by priority then submission time
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            return new Date(a.submittedAt) - new Date(b.submittedAt);
        });
    }

    /**
     * Get approval by ID
     * @param {string} approvalId
     * @returns {Object|null}
     */
    get(approvalId) {
        return this._pending.get(approvalId) ?? this._loadRequest(approvalId);
    }

    /**
     * Get approval by context ID
     * @param {string} contextId
     * @returns {Object|null}
     */
    getByContext(contextId) {
        for (const request of this._pending.values()) {
            if (request.contextId === contextId) {
                return request;
            }
        }
        return null;
    }

    /**
     * Check if a decision requires approval
     * @param {Object} proposal - Decision proposal
     * @param {Object} policy - Decision policy
     * @returns {Object} Approval requirement
     */
    requiresApproval(proposal, policy = {}) {
        const reasons = [];
        let priority = ApprovalPriority.LOW;

        // Check confidence threshold
        if (proposal.confidence < (policy.confidenceThreshold ?? 0.7)) {
            reasons.push('Low confidence score');
            priority = ApprovalPriority.MEDIUM;
        }

        // Check risk level
        if (proposal.risks?.overallLevel === 'high' || proposal.risks?.overallLevel === 'critical') {
            reasons.push('High risk assessment');
            priority = ApprovalPriority.HIGH;
        }

        // Check cost threshold
        if (proposal.recommendation?.estimatedCost > (policy.costApprovalThreshold ?? 100000)) {
            reasons.push('Exceeds cost threshold');
            priority = ApprovalPriority.HIGH;
        }

        // Check explicit approval flag
        if (proposal.requiresHumanApproval) {
            reasons.push(proposal.approvalReason ?? 'Flagged for review');
        }

        // Check safety flags
        if (proposal.safetyWarnings?.length > 0) {
            reasons.push('Safety warnings present');
            priority = ApprovalPriority.CRITICAL;
        }

        return {
            required: reasons.length > 0,
            reasons,
            priority,
        };
    }

    /**
     * Get statistics
     * @returns {Object}
     */
    getStats() {
        let pending = 0, approved = 0, rejected = 0, expired = 0;

        for (const request of this._pending.values()) {
            switch (request.status) {
                case ApprovalStatus.PENDING: pending++; break;
                case ApprovalStatus.APPROVED:
                case ApprovalStatus.MODIFIED: approved++; break;
                case ApprovalStatus.REJECTED: rejected++; break;
                case ApprovalStatus.EXPIRED: expired++; break;
            }
        }

        return { pending, approved, rejected, expired, total: this._pending.size };
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _ensureDir(dir) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    _generateApprovalId() {
        return `apr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    _summarizeProposal(proposal) {
        return {
            recommendationTitle: proposal.recommendation?.title,
            recommendationDescription: proposal.recommendation?.description,
            estimatedCost: proposal.recommendation?.estimatedCost,
            confidence: proposal.confidence,
            riskLevel: proposal.risks?.overallLevel,
            alternativeCount: proposal.alternatives?.length ?? 0,
        };
    }

    _updateApproval(approvalId, updates) {
        const request = this._pending.get(approvalId);
        if (!request) {
            throw new Error(`Approval not found: ${approvalId}`);
        }

        Object.assign(request, updates);
        this._saveRequest(request);

        // Log audit event
        if (this.auditLogger) {
            this.auditLogger.logEvent({
                contextId: request.contextId,
                eventType: updates.status === ApprovalStatus.APPROVED ? 'approval_granted' :
                    updates.status === ApprovalStatus.REJECTED ? 'approval_denied' : 'approval_modified',
                data: { approvalId, status: updates.status, approver: updates.approver },
                actor: updates.approver,
            });
        }

        this.log.info('Approval updated', {
            approvalId,
            status: updates.status,
            approver: updates.approver,
        });

        return request;
    }

    _saveRequest(request) {
        const filepath = join(this.storageDir, `${request.id}.json`);
        writeFileSync(filepath, JSON.stringify(request, null, 2));
    }

    _loadRequest(approvalId) {
        const filepath = join(this.storageDir, `${approvalId}.json`);
        if (existsSync(filepath)) {
            return JSON.parse(readFileSync(filepath, 'utf-8'));
        }
        return null;
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {ApprovalManager}
 */
export function createApprovalManager(options = {}) {
    return new ApprovalManager(options);
}

export default ApprovalManager;
