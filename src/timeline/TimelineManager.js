/**
 * Timeline Manager
 * Aggregates and manages decision timeline for tracking and analysis
 * 
 * Provides:
 * - Decision history aggregation
 * - Impact tracking over time
 * - Rationale search and filtering
 * - Timeline visualization data
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

/**
 * Decision outcome types
 */
export const DecisionOutcome = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    MODIFIED: 'modified',
    EXPIRED: 'expired',
};

/**
 * Impact levels
 */
export const ImpactLevel = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
};

/**
 * Timeline Manager Class
 */
export class TimelineManager {
    /**
     * @param {Object} options
     * @param {string} options.approvalsDir - Directory for approvals data
     * @param {string} options.auditDir - Directory for audit logs
     * @param {Object} options.auditLogger - Audit logger instance
     */
    constructor(options = {}) {
        this.approvalsDir = options.approvalsDir ?? './data/approvals';
        this.auditDir = options.auditDir ?? './data/audit';
        this.auditLogger = options.auditLogger;
        this.log = logger.child({ component: 'TimelineManager' });

        this.log.info('TimelineManager initialized', {
            approvalsDir: this.approvalsDir,
            auditDir: this.auditDir,
        });
    }

    /**
     * Get full decision timeline
     * @param {Object} options
     * @param {number} options.limit - Max entries to return
     * @param {number} options.offset - Offset for pagination
     * @param {string} options.outcome - Filter by outcome
     * @param {Date} options.startDate - Filter from date
     * @param {Date} options.endDate - Filter to date
     * @param {string} options.search - Search in rationale/title
     * @returns {Object} Timeline with entries and metadata
     */
    getTimeline(options = {}) {
        const {
            limit = 50,
            offset = 0,
            outcome = null,
            startDate = null,
            endDate = null,
            search = null,
        } = options;

        this.log.debug('Getting timeline', { limit, offset, outcome });

        // Load all decisions from approvals
        const decisions = this._loadAllDecisions();

        // Apply filters
        let filtered = decisions;

        if (outcome) {
            filtered = filtered.filter(d => d.outcome === outcome);
        }

        if (startDate) {
            const start = new Date(startDate);
            filtered = filtered.filter(d => new Date(d.createdAt) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            filtered = filtered.filter(d => new Date(d.createdAt) <= end);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(d =>
                d.title?.toLowerCase().includes(searchLower) ||
                d.rationale?.toLowerCase().includes(searchLower) ||
                d.query?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Paginate
        const total = filtered.length;
        const entries = filtered.slice(offset, offset + limit);

        return {
            entries,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
            summary: this._calculateSummary(decisions),
        };
    }

    /**
     * Get a specific decision by ID
     * @param {string} id - Decision/approval ID
     * @returns {Object|null} Decision details with audit trail
     */
    getDecision(id) {
        const decision = this._loadDecision(id);
        if (!decision) {
            return null;
        }

        // Enrich with audit trail
        decision.auditTrail = this._getAuditTrail(id);

        return decision;
    }

    /**
     * Get timeline statistics
     * @param {Object} options
     * @param {string} options.period - 'week', 'month', 'quarter', 'year'
     * @returns {Object} Statistics
     */
    getStats(options = {}) {
        const { period = 'month' } = options;
        const decisions = this._loadAllDecisions();

        const now = new Date();
        const periodStart = this._getPeriodStart(now, period);

        const periodDecisions = decisions.filter(
            d => new Date(d.createdAt) >= periodStart
        );

        const stats = {
            period,
            periodStart: periodStart.toISOString(),
            total: periodDecisions.length,
            byOutcome: {},
            byImpact: {},
            averageDecisionTime: 0,
            approvalRate: 0,
        };

        // Count by outcome
        for (const d of periodDecisions) {
            stats.byOutcome[d.outcome] = (stats.byOutcome[d.outcome] ?? 0) + 1;
            stats.byImpact[d.impactLevel ?? 'unknown'] = (stats.byImpact[d.impactLevel ?? 'unknown'] ?? 0) + 1;
        }

        // Calculate approval rate
        const decided = (stats.byOutcome.approved ?? 0) + (stats.byOutcome.rejected ?? 0);
        if (decided > 0) {
            stats.approvalRate = Math.round(((stats.byOutcome.approved ?? 0) / decided) * 100);
        }

        // Calculate average decision time
        const decisionTimes = periodDecisions
            .filter(d => d.resolvedAt && d.createdAt)
            .map(d => new Date(d.resolvedAt) - new Date(d.createdAt));

        if (decisionTimes.length > 0) {
            const avgMs = decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length;
            stats.averageDecisionTime = Math.round(avgMs / (1000 * 60 * 60)); // hours
        }

        return stats;
    }

    /**
     * Get impact tracking for a decision
     * @param {string} id - Decision ID
     * @returns {Object|null} Impact data
     */
    getImpact(id) {
        const decision = this._loadDecision(id);
        if (!decision) {
            return null;
        }

        // Get any follow-up decisions that reference this one
        const allDecisions = this._loadAllDecisions();
        const relatedDecisions = allDecisions.filter(
            d => d.parentDecisionId === id || d.relatedDecisions?.includes(id)
        );

        return {
            decisionId: id,
            originalRecommendation: decision.recommendation,
            outcome: decision.outcome,
            impactLevel: decision.impactLevel ?? this._estimateImpact(decision),
            followUpDecisions: relatedDecisions.length,
            relatedDecisions: relatedDecisions.map(d => ({
                id: d.id,
                title: d.title,
                outcome: d.outcome,
                createdAt: d.createdAt,
            })),
            // Impact metrics would be added here if tracked
            metrics: decision.impactMetrics ?? [],
        };
    }

    /**
     * Search decisions by rationale
     * @param {string} query - Search query
     * @param {number} limit - Max results
     * @returns {Object[]} Matching decisions
     */
    searchByRationale(query, limit = 20) {
        if (!query || query.length < 2) {
            return [];
        }

        const decisions = this._loadAllDecisions();
        const queryLower = query.toLowerCase();

        const matches = decisions.filter(d => {
            const searchableText = [
                d.rationale,
                d.title,
                d.query,
                d.recommendation?.title,
                d.recommendation?.description,
            ].filter(Boolean).join(' ').toLowerCase();

            return searchableText.includes(queryLower);
        });

        // Sort by relevance (simple: more occurrences = higher rank)
        matches.sort((a, b) => {
            const aText = JSON.stringify(a).toLowerCase();
            const bText = JSON.stringify(b).toLowerCase();
            const aCount = (aText.match(new RegExp(queryLower, 'g')) || []).length;
            const bCount = (bText.match(new RegExp(queryLower, 'g')) || []).length;
            return bCount - aCount;
        });

        return matches.slice(0, limit);
    }

    /**
     * Get timeline data for visualization
     * @param {Object} options
     * @param {string} options.granularity - 'day', 'week', 'month'
     * @param {number} options.periods - Number of periods to include
     * @returns {Object} Visualization data
     */
    getVisualizationData(options = {}) {
        const { granularity = 'week', periods = 12 } = options;
        const decisions = this._loadAllDecisions();
        const data = [];

        const now = new Date();

        for (let i = periods - 1; i >= 0; i--) {
            const periodEnd = this._subtractPeriod(now, granularity, i);
            const periodStart = this._subtractPeriod(now, granularity, i + 1);

            const periodDecisions = decisions.filter(d => {
                const date = new Date(d.createdAt);
                return date >= periodStart && date < periodEnd;
            });

            data.push({
                period: this._formatPeriod(periodStart, granularity),
                startDate: periodStart.toISOString(),
                total: periodDecisions.length,
                approved: periodDecisions.filter(d => d.outcome === DecisionOutcome.APPROVED).length,
                rejected: periodDecisions.filter(d => d.outcome === DecisionOutcome.REJECTED).length,
                pending: periodDecisions.filter(d => d.outcome === DecisionOutcome.PENDING).length,
            });
        }

        return {
            granularity,
            periods: data,
            totals: {
                total: decisions.length,
                approved: decisions.filter(d => d.outcome === DecisionOutcome.APPROVED).length,
                rejected: decisions.filter(d => d.outcome === DecisionOutcome.REJECTED).length,
                pending: decisions.filter(d => d.outcome === DecisionOutcome.PENDING).length,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _loadAllDecisions() {
        if (!existsSync(this.approvalsDir)) {
            return [];
        }

        const files = readdirSync(this.approvalsDir).filter(f => f.endsWith('.json'));
        const decisions = [];

        for (const file of files) {
            try {
                const content = readFileSync(join(this.approvalsDir, file), 'utf-8');
                const approval = JSON.parse(content);
                decisions.push(this._transformApprovalToDecision(approval));
            } catch (error) {
                this.log.warn('Failed to load approval', { file, error: error.message });
            }
        }

        return decisions;
    }

    _loadDecision(id) {
        const filepath = join(this.approvalsDir, `${id}.json`);

        if (!existsSync(filepath)) {
            return null;
        }

        try {
            const content = readFileSync(filepath, 'utf-8');
            const approval = JSON.parse(content);
            return this._transformApprovalToDecision(approval);
        } catch (error) {
            this.log.error('Failed to load decision', { id, error: error.message });
            return null;
        }
    }

    _transformApprovalToDecision(approval) {
        return {
            id: approval.id,
            contextId: approval.contextId,
            title: approval.summary ?? approval.recommendationTitle ?? 'Untitled Decision',
            query: approval.query ?? '',
            recommendation: {
                title: approval.recommendationTitle,
                description: approval.recommendationDescription,
                confidence: approval.confidence,
            },
            outcome: this._mapStatusToOutcome(approval.status),
            rationale: approval.rationale ?? approval.rejectionReason ?? '',
            impactLevel: this._estimateImpact(approval),
            createdAt: approval.createdAt,
            resolvedAt: approval.resolvedAt ?? approval.updatedAt,
            resolvedBy: approval.approver ?? approval.rejector,
            alternatives: approval.alternatives ?? [],
            risks: approval.risks ?? [],
            priority: approval.priority ?? 'medium',
        };
    }

    _mapStatusToOutcome(status) {
        const mapping = {
            'pending': DecisionOutcome.PENDING,
            'approved': DecisionOutcome.APPROVED,
            'rejected': DecisionOutcome.REJECTED,
            'modified': DecisionOutcome.MODIFIED,
            'expired': DecisionOutcome.EXPIRED,
        };
        return mapping[status] ?? DecisionOutcome.PENDING;
    }

    _estimateImpact(decision) {
        // Estimate impact based on available signals
        if (decision.priority === 'critical') return ImpactLevel.CRITICAL;
        if (decision.priority === 'high') return ImpactLevel.HIGH;

        // Check for high-value indicators
        const desc = JSON.stringify(decision).toLowerCase();
        if (desc.includes('million') || desc.includes('strategic')) {
            return ImpactLevel.HIGH;
        }
        if (desc.includes('budget') || desc.includes('expansion')) {
            return ImpactLevel.MEDIUM;
        }

        return ImpactLevel.LOW;
    }

    _getAuditTrail(id) {
        // Search audit logs for this decision
        if (!existsSync(this.auditDir)) {
            return [];
        }

        const trail = [];
        const files = readdirSync(this.auditDir).filter(f => f.endsWith('.jsonl'));

        for (const file of files) {
            try {
                const content = readFileSync(join(this.auditDir, file), 'utf-8');
                const lines = content.split('\n').filter(l => l.trim());

                for (const line of lines) {
                    try {
                        const event = JSON.parse(line);
                        if (event.contextId === id || event.contextId?.includes(id)) {
                            trail.push(event);
                        }
                    } catch {
                        // Skip malformed lines
                    }
                }
            } catch (error) {
                this.log.warn('Failed to read audit file', { file, error: error.message });
            }
        }

        return trail.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    _calculateSummary(decisions) {
        return {
            total: decisions.length,
            approved: decisions.filter(d => d.outcome === DecisionOutcome.APPROVED).length,
            rejected: decisions.filter(d => d.outcome === DecisionOutcome.REJECTED).length,
            pending: decisions.filter(d => d.outcome === DecisionOutcome.PENDING).length,
        };
    }

    _getPeriodStart(date, period) {
        const d = new Date(date);
        switch (period) {
            case 'week':
                d.setDate(d.getDate() - 7);
                break;
            case 'month':
                d.setMonth(d.getMonth() - 1);
                break;
            case 'quarter':
                d.setMonth(d.getMonth() - 3);
                break;
            case 'year':
                d.setFullYear(d.getFullYear() - 1);
                break;
        }
        return d;
    }

    _subtractPeriod(date, granularity, count) {
        const d = new Date(date);
        switch (granularity) {
            case 'day':
                d.setDate(d.getDate() - count);
                break;
            case 'week':
                d.setDate(d.getDate() - (count * 7));
                break;
            case 'month':
                d.setMonth(d.getMonth() - count);
                break;
        }
        return d;
    }

    _formatPeriod(date, granularity) {
        const d = new Date(date);
        switch (granularity) {
            case 'day':
                return d.toISOString().split('T')[0];
            case 'week':
                return `Week of ${d.toISOString().split('T')[0]}`;
            case 'month':
                return d.toLocaleString('default', { month: 'short', year: 'numeric' });
            default:
                return d.toISOString().split('T')[0];
        }
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {TimelineManager}
 */
export function createTimelineManager(options = {}) {
    return new TimelineManager(options);
}

export default TimelineManager;
