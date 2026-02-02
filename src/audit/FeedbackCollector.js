/**
 * Feedback Collector
 * Collects and processes feedback on agent decisions
 * Used to improve future recommendations
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

/**
 * Feedback types
 */
export const FeedbackType = {
    RATING: 'rating',
    CORRECTION: 'correction',
    PREFERENCE: 'preference',
    OUTCOME: 'outcome',
};

/**
 * Outcome status
 */
export const OutcomeStatus = {
    SUCCESS: 'success',
    PARTIAL_SUCCESS: 'partial_success',
    FAILURE: 'failure',
    ABANDONED: 'abandoned',
    UNKNOWN: 'unknown',
};

export class FeedbackCollector {
    /**
     * @param {Object} options
     * @param {string} options.storageDir - Directory for feedback data
     * @param {Object} options.auditLogger - Audit logger instance
     */
    constructor(options = {}) {
        this.storageDir = options.storageDir ?? './data/feedback';
        this.auditLogger = options.auditLogger;

        // In-memory feedback store
        this._feedback = new Map();

        // Aggregated stats
        this._stats = {
            totalFeedback: 0,
            averageRating: 0,
            outcomeDistribution: {},
        };

        this._ensureDir(this.storageDir);
        this._loadAggregatedStats();

        this.log = logger.child({ component: 'FeedbackCollector' });
        this.log.info('FeedbackCollector initialized');
    }

    /**
     * Record a rating for a decision
     * @param {Object} params
     * @param {string} params.contextId - Decision context ID
     * @param {number} params.rating - Rating (1-5)
     * @param {string} params.comment - Optional comment
     * @param {string} params.ratedBy - Who rated
     */
    recordRating(params) {
        const { contextId, rating, comment = '', ratedBy = 'user' } = params;

        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        const feedback = {
            id: this._generateFeedbackId(),
            type: FeedbackType.RATING,
            contextId,
            rating,
            comment,
            ratedBy,
            timestamp: new Date().toISOString(),
        };

        this._saveFeedback(feedback);
        this._updateStats(feedback);

        this.log.info('Rating recorded', { contextId, rating });

        return feedback;
    }

    /**
     * Record a correction to a decision
     * @param {Object} params
     * @param {string} params.contextId - Decision context ID
     * @param {string} params.field - Field being corrected
     * @param {*} params.originalValue - Original value
     * @param {*} params.correctedValue - Corrected value
     * @param {string} params.reason - Reason for correction
     * @param {string} params.correctedBy - Who made correction
     */
    recordCorrection(params) {
        const { contextId, field, originalValue, correctedValue, reason = '', correctedBy = 'user' } = params;

        const feedback = {
            id: this._generateFeedbackId(),
            type: FeedbackType.CORRECTION,
            contextId,
            field,
            originalValue,
            correctedValue,
            reason,
            correctedBy,
            timestamp: new Date().toISOString(),
        };

        this._saveFeedback(feedback);

        this.log.info('Correction recorded', { contextId, field });

        return feedback;
    }

    /**
     * Record user preference
     * @param {Object} params
     * @param {string} params.contextId - Decision context ID
     * @param {string} params.preferenceKey - What preference
     * @param {*} params.preferenceValue - Preference value
     * @param {string} params.userId - Who set preference
     */
    recordPreference(params) {
        const { contextId, preferenceKey, preferenceValue, userId = 'user' } = params;

        const feedback = {
            id: this._generateFeedbackId(),
            type: FeedbackType.PREFERENCE,
            contextId,
            preferenceKey,
            preferenceValue,
            userId,
            timestamp: new Date().toISOString(),
        };

        this._saveFeedback(feedback);

        this.log.info('Preference recorded', { preferenceKey });

        return feedback;
    }

    /**
     * Record decision outcome
     * @param {Object} params
     * @param {string} params.contextId - Decision context ID
     * @param {string} params.status - Outcome status
     * @param {Object} params.metrics - Outcome metrics
     * @param {string} params.notes - Additional notes
     * @param {string} params.recordedBy - Who recorded
     */
    recordOutcome(params) {
        const { contextId, status, metrics = {}, notes = '', recordedBy = 'user' } = params;

        const feedback = {
            id: this._generateFeedbackId(),
            type: FeedbackType.OUTCOME,
            contextId,
            status,
            metrics,
            notes,
            recordedBy,
            timestamp: new Date().toISOString(),
        };

        this._saveFeedback(feedback);
        this._updateOutcomeStats(status);

        // Log to audit
        if (this.auditLogger) {
            this.auditLogger.logEvent({
                contextId,
                eventType: 'feedback_received',
                data: { type: FeedbackType.OUTCOME, status },
                actor: recordedBy,
            });
        }

        this.log.info('Outcome recorded', { contextId, status });

        return feedback;
    }

    /**
     * Get all feedback for a context
     * @param {string} contextId
     * @returns {Object[]}
     */
    getFeedback(contextId) {
        const all = [];
        for (const feedback of this._feedback.values()) {
            if (feedback.contextId === contextId) {
                all.push(feedback);
            }
        }
        return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Get feedback statistics
     * @returns {Object}
     */
    getStats() {
        return { ...this._stats };
    }

    /**
     * Get learning insights from feedback
     * @returns {Object}
     */
    getLearnings() {
        const learnings = {
            commonCorrections: [],
            preferencePatterns: {},
            successFactors: [],
            improvementAreas: [],
        };

        // Analyze corrections
        const correctionCounts = {};
        for (const feedback of this._feedback.values()) {
            if (feedback.type === FeedbackType.CORRECTION) {
                const field = feedback.field;
                correctionCounts[field] = (correctionCounts[field] ?? 0) + 1;
            }
        }

        learnings.commonCorrections = Object.entries(correctionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([field, count]) => ({ field, count }));

        // Identify improvement areas based on low ratings
        const lowRatings = [];
        for (const feedback of this._feedback.values()) {
            if (feedback.type === FeedbackType.RATING && feedback.rating <= 2) {
                lowRatings.push(feedback.comment);
            }
        }
        learnings.improvementAreas = lowRatings.filter(c => c.length > 0).slice(0, 5);

        return learnings;
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _ensureDir(dir) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    _generateFeedbackId() {
        return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    _saveFeedback(feedback) {
        this._feedback.set(feedback.id, feedback);

        // Append to daily file
        const filename = `feedback_${this._getDateString()}.jsonl`;
        const filepath = join(this.storageDir, filename);

        try {
            // Use writeFileSync with append flag
            writeFileSync(filepath, JSON.stringify(feedback) + '\n', { flag: 'a' });
        } catch (error) {
            this.log.error('Failed to save feedback', { error: error.message });
        }

        this._saveAggregatedStats();
    }

    _updateStats(feedback) {
        if (feedback.type === FeedbackType.RATING) {
            const prevTotal = this._stats.totalFeedback;
            const prevAvg = this._stats.averageRating;

            this._stats.totalFeedback++;
            this._stats.averageRating = (prevAvg * prevTotal + feedback.rating) / this._stats.totalFeedback;
        }
    }

    _updateOutcomeStats(status) {
        this._stats.outcomeDistribution[status] = (this._stats.outcomeDistribution[status] ?? 0) + 1;
    }

    _loadAggregatedStats() {
        const filepath = join(this.storageDir, 'stats.json');
        if (existsSync(filepath)) {
            try {
                this._stats = JSON.parse(readFileSync(filepath, 'utf-8'));
            } catch {
                // Keep defaults
            }
        }
    }

    _saveAggregatedStats() {
        const filepath = join(this.storageDir, 'stats.json');
        writeFileSync(filepath, JSON.stringify(this._stats, null, 2));
    }

    _getDateString() {
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {FeedbackCollector}
 */
export function createFeedbackCollector(options = {}) {
    return new FeedbackCollector(options);
}

export default FeedbackCollector;
