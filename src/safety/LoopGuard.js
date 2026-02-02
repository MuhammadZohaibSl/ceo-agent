/**
 * Loop Guard
 * Prevents infinite loops and circular reasoning in agent execution
 */

import logger from '../utils/logger.js';
import { LoopDetectedError } from '../utils/errors.js';

/**
 * Loop detection strategies
 */
export const LoopStrategy = {
    ITERATION_COUNT: 'iteration_count',
    CONTENT_HASH: 'content_hash',
    QUERY_SIMILARITY: 'query_similarity',
};

export class LoopGuard {
    /**
     * @param {Object} options
     * @param {number} options.maxIterations - Max allowed iterations
     * @param {number} options.similarityThreshold - Content similarity threshold
     */
    constructor(options = {}) {
        this.maxIterations = options.maxIterations ?? 10;
        this.similarityThreshold = options.similarityThreshold ?? 0.9;

        // Track execution history
        this._history = new Map(); // contextId -> history array

        this.log = logger.child({ component: 'LoopGuard' });
    }

    /**
     * Check if current execution should be stopped
     * @param {Object} context - Current execution context
     * @returns {Object} Check result
     */
    check(context) {
        const contextId = context.id ?? 'unknown';
        const iteration = context.iteration ?? 1;

        const result = {
            shouldStop: false,
            reason: null,
            iteration,
            checks: {},
        };

        // 1. Check iteration count
        result.checks.iteration = this._checkIterationCount(iteration);
        if (result.checks.iteration.exceeded) {
            result.shouldStop = true;
            result.reason = `Max iterations exceeded: ${iteration}/${this.maxIterations}`;
            this.log.warn('Loop detected: max iterations', { contextId, iteration });
            return result;
        }

        // 2. Check for repeated content
        result.checks.content = this._checkRepeatedContent(contextId, context);
        if (result.checks.content.loopDetected) {
            result.shouldStop = true;
            result.reason = 'Repeated content pattern detected';
            this.log.warn('Loop detected: repeated content', { contextId });
            return result;
        }

        // 3. Check for circular reasoning
        result.checks.reasoning = this._checkCircularReasoning(contextId, context);
        if (result.checks.reasoning.circular) {
            result.shouldStop = true;
            result.reason = 'Circular reasoning detected';
            this.log.warn('Loop detected: circular reasoning', { contextId });
            return result;
        }

        // Record this iteration
        this._recordIteration(contextId, context);

        return result;
    }

    /**
     * Guard wrapper that throws on loop detection
     * @param {Object} context - Current context
     * @throws {LoopDetectedError}
     */
    guard(context) {
        const result = this.check(context);

        if (result.shouldStop) {
            throw new LoopDetectedError(
                context.iteration ?? 1,
                result.checks.content?.repeatCount ?? 0,
                result.reason
            );
        }
    }

    /**
     * Reset history for a context
     * @param {string} contextId
     */
    reset(contextId) {
        this._history.delete(contextId);
    }

    /**
     * Clear all history
     */
    clearAll() {
        this._history.clear();
        this.log.info('Loop guard history cleared');
    }

    /**
     * Get current stats
     * @returns {Object}
     */
    getStats() {
        return {
            activeContexts: this._history.size,
            maxIterations: this.maxIterations,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Private Check Methods
    // ─────────────────────────────────────────────────────────────

    _checkIterationCount(iteration) {
        return {
            current: iteration,
            max: this.maxIterations,
            exceeded: iteration > this.maxIterations,
        };
    }

    _checkRepeatedContent(contextId, context) {
        const history = this._history.get(contextId) ?? [];
        const currentHash = this._hashContent(context);

        let repeatCount = 0;
        for (const entry of history) {
            if (entry.hash === currentHash) {
                repeatCount++;
            }
        }

        return {
            loopDetected: repeatCount >= 2,
            repeatCount,
        };
    }

    _checkCircularReasoning(contextId, context) {
        const history = this._history.get(contextId) ?? [];

        if (history.length < 2) {
            return { circular: false };
        }

        // Check if we're returning to a previous state
        const currentQuery = (context.query ?? '').toLowerCase().trim();
        const currentOptions = context.options?.map(o => o.title).sort().join('|') ?? '';

        for (let i = history.length - 2; i >= 0; i--) {
            const pastEntry = history[i];

            // Same query with same options suggests circular reasoning
            if (pastEntry.query === currentQuery && pastEntry.optionHash === currentOptions) {
                return {
                    circular: true,
                    circleStart: i,
                    circleLength: history.length - i,
                };
            }
        }

        return { circular: false };
    }

    // ─────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────

    _recordIteration(contextId, context) {
        if (!this._history.has(contextId)) {
            this._history.set(contextId, []);
        }

        const history = this._history.get(contextId);

        history.push({
            iteration: context.iteration ?? history.length + 1,
            timestamp: Date.now(),
            query: (context.query ?? '').toLowerCase().trim(),
            hash: this._hashContent(context),
            optionHash: context.options?.map(o => o.title).sort().join('|') ?? '',
        });

        // Keep only last N entries
        if (history.length > this.maxIterations + 5) {
            history.shift();
        }
    }

    _hashContent(context) {
        // Simple content hash for comparison
        const content = JSON.stringify({
            query: context.query,
            optionCount: context.options?.length ?? 0,
            stage: context.stage,
        });

        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}

export default LoopGuard;
