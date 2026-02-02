/**
 * Audit Logger
 * Comprehensive audit trail for all agent decisions
 * Supports compliance, debugging, and decision analysis
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import logger from '../utils/logger.js';

/**
 * Audit event types
 */
export const AuditEventType = {
    QUERY_RECEIVED: 'query_received',
    CONTEXT_LOADED: 'context_loaded',
    OPTIONS_GENERATED: 'options_generated',
    OPTIONS_EVALUATED: 'options_evaluated',
    RISK_ASSESSED: 'risk_assessed',
    SAFETY_CHECK: 'safety_check',
    PROPOSAL_CREATED: 'proposal_created',
    APPROVAL_REQUESTED: 'approval_requested',
    APPROVAL_GRANTED: 'approval_granted',
    APPROVAL_DENIED: 'approval_denied',
    FEEDBACK_RECEIVED: 'feedback_received',
    ERROR_OCCURRED: 'error_occurred',
};

export class AuditLogger {
    /**
     * @param {Object} options
     * @param {string} options.logDir - Directory for audit logs
     * @param {boolean} options.enableFileLogging - Write to file
     * @param {boolean} options.enableConsoleLogging - Write to console
     */
    constructor(options = {}) {
        this.logDir = options.logDir ?? './data/audit';
        this.enableFileLogging = options.enableFileLogging ?? true;
        this.enableConsoleLogging = options.enableConsoleLogging ?? false;

        // Ensure log directory exists
        if (this.enableFileLogging) {
            this._ensureDir(this.logDir);
        }

        // In-memory buffer for current session
        this._sessionLog = [];
        this._sessionId = this._generateSessionId();

        this.log = logger.child({ component: 'AuditLogger' });
        this.log.info('AuditLogger initialized', { logDir: this.logDir, sessionId: this._sessionId });
    }

    /**
     * Log an audit event
     * @param {Object} params
     * @param {string} params.contextId - Context/decision ID
     * @param {string} params.eventType - Type of event
     * @param {Object} params.data - Event data
     * @param {string} params.actor - Actor (user, agent, system)
     */
    logEvent(params) {
        const { contextId, eventType, data = {}, actor = 'agent' } = params;

        const event = {
            id: this._generateEventId(),
            timestamp: new Date().toISOString(),
            sessionId: this._sessionId,
            contextId,
            eventType,
            actor,
            data: this._sanitizeData(data),
        };

        // Add to session buffer
        this._sessionLog.push(event);

        // Write to file
        if (this.enableFileLogging) {
            this._writeToFile(event);
        }

        // Console output
        if (this.enableConsoleLogging) {
            this.log.debug('Audit event', event);
        }

        return event.id;
    }

    /**
     * Log a query received event
     * @param {string} contextId
     * @param {string} query
     * @param {Object} constraints
     */
    logQueryReceived(contextId, query, constraints = {}) {
        return this.logEvent({
            contextId,
            eventType: AuditEventType.QUERY_RECEIVED,
            data: { query, constraints },
            actor: 'user',
        });
    }

    /**
     * Log proposal created event
     * @param {string} contextId
     * @param {Object} proposal
     */
    logProposalCreated(contextId, proposal) {
        return this.logEvent({
            contextId,
            eventType: AuditEventType.PROPOSAL_CREATED,
            data: {
                recommendationTitle: proposal.recommendation?.title,
                confidence: proposal.confidence,
                requiresApproval: proposal.requiresHumanApproval,
                alternativeCount: proposal.alternatives?.length ?? 0,
            },
        });
    }

    /**
     * Log approval decision
     * @param {string} contextId
     * @param {boolean} approved
     * @param {string} approver
     * @param {string} reason
     */
    logApprovalDecision(contextId, approved, approver, reason = '') {
        return this.logEvent({
            contextId,
            eventType: approved ? AuditEventType.APPROVAL_GRANTED : AuditEventType.APPROVAL_DENIED,
            data: { approved, reason },
            actor: approver,
        });
    }

    /**
     * Log error event
     * @param {string} contextId
     * @param {Error} error
     */
    logError(contextId, error) {
        return this.logEvent({
            contextId,
            eventType: AuditEventType.ERROR_OCCURRED,
            data: {
                message: error.message,
                code: error.code,
                stack: error.stack?.split('\n').slice(0, 5),
            },
        });
    }

    /**
     * Get audit trail for a context
     * @param {string} contextId
     * @returns {Object[]}
     */
    getTrail(contextId) {
        return this._sessionLog.filter(e => e.contextId === contextId);
    }

    /**
     * Get full session log
     * @returns {Object[]}
     */
    getSessionLog() {
        return [...this._sessionLog];
    }

    /**
     * Export audit trail to JSON
     * @param {string} contextId
     * @returns {string}
     */
    exportTrail(contextId) {
        const trail = this.getTrail(contextId);
        return JSON.stringify(trail, null, 2);
    }

    /**
     * Get summary statistics
     * @returns {Object}
     */
    getStats() {
        const eventCounts = {};
        for (const event of this._sessionLog) {
            eventCounts[event.eventType] = (eventCounts[event.eventType] ?? 0) + 1;
        }

        return {
            sessionId: this._sessionId,
            totalEvents: this._sessionLog.length,
            eventCounts,
            uniqueContexts: new Set(this._sessionLog.map(e => e.contextId)).size,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _ensureDir(dir) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    _generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    _sanitizeData(data) {
        // Remove sensitive fields and large content
        const sanitized = { ...data };

        // Truncate large strings
        for (const [key, value] of Object.entries(sanitized)) {
            if (typeof value === 'string' && value.length > 500) {
                sanitized[key] = value.substring(0, 500) + '...[truncated]';
            }
        }

        return sanitized;
    }

    _writeToFile(event) {
        const filename = `audit_${this._getDateString()}.jsonl`;
        const filepath = join(this.logDir, filename);

        try {
            appendFileSync(filepath, JSON.stringify(event) + '\n');
        } catch (error) {
            this.log.error('Failed to write audit event', { error: error.message });
        }
    }

    _getDateString() {
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {AuditLogger}
 */
export function createAuditLogger(options = {}) {
    return new AuditLogger(options);
}

export default AuditLogger;
