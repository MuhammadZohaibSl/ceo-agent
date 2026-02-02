/**
 * Safety Guard
 * Orchestrates all safety checks for the CEO Agent
 * Combines hallucination detection, loop prevention, and content filtering
 */

import { HallucinationDetector, HallucinationRisk } from './HallucinationDetector.js';
import { LoopGuard } from './LoopGuard.js';
import { ContentFilter, ContentCategory } from './ContentFilter.js';
import logger from '../utils/logger.js';

/**
 * Safety check result status
 */
export const SafetyStatus = {
    PASS: 'pass',
    WARNING: 'warning',
    BLOCK: 'block',
};

export class SafetyGuard {
    /**
     * @param {Object} options
     * @param {Object} options.hallucinationConfig - Hallucination detector config
     * @param {Object} options.loopConfig - Loop guard config
     * @param {Object} options.contentConfig - Content filter config
     */
    constructor(options = {}) {
        this.log = logger.child({ component: 'SafetyGuard' });

        // Initialize sub-components
        this.hallucinationDetector = new HallucinationDetector(options.hallucinationConfig ?? {});
        this.loopGuard = new LoopGuard(options.loopConfig ?? {});
        this.contentFilter = new ContentFilter(options.contentConfig ?? {});

        // Configurable strictness
        this.strictMode = options.strictMode ?? false;

        this.log.info('SafetyGuard initialized', { strictMode: this.strictMode });
    }

    /**
     * Run all safety checks on context
     * @param {Object} ctx - Agent context
     * @returns {Promise<Object>} Consolidated safety check result
     */
    async check(ctx) {
        const result = {
            status: SafetyStatus.PASS,
            checks: {},
            warnings: [],
            blocks: [],
            recommendations: [],
            timestamp: new Date().toISOString(),
        };

        // 1. Loop detection
        try {
            result.checks.loop = this.loopGuard.check(ctx);
            if (result.checks.loop.shouldStop) {
                result.status = SafetyStatus.BLOCK;
                result.blocks.push({
                    type: 'loop_detected',
                    message: result.checks.loop.reason,
                });
            }
        } catch (error) {
            result.checks.loop = { error: error.message };
        }

        // 2. Content filtering on options
        if (ctx.options && ctx.options.length > 0) {
            result.checks.content = [];

            for (const option of ctx.options) {
                const optionContent = `${option.title ?? ''} ${option.description ?? ''}`;
                const contentResult = this.contentFilter.filter({
                    content: optionContent,
                    query: ctx.query,
                    decisionPolicy: ctx.decisionPolicy ?? {},
                });

                result.checks.content.push({
                    optionId: option.id,
                    optionTitle: option.title,
                    ...contentResult,
                });

                if (contentResult.blocked) {
                    result.status = SafetyStatus.BLOCK;
                    result.blocks.push({
                        type: 'content_blocked',
                        optionId: option.id,
                        reasons: contentResult.reasons,
                    });
                } else if (contentResult.warnings.length > 0) {
                    if (result.status === SafetyStatus.PASS) {
                        result.status = SafetyStatus.WARNING;
                    }
                    result.warnings.push({
                        optionId: option.id,
                        warnings: contentResult.warnings,
                    });
                }
            }
        }

        // 3. Hallucination check on generated content (if proposal exists)
        if (ctx.proposal?.recommendation) {
            const content = JSON.stringify(ctx.proposal.recommendation);
            result.checks.hallucination = this.hallucinationDetector.analyze({
                content,
                ragContext: ctx.ragContext ?? [],
                memory: ctx.memory ?? [],
            });

            if (result.checks.hallucination.riskLevel === HallucinationRisk.HIGH) {
                if (this.strictMode) {
                    result.status = SafetyStatus.BLOCK;
                    result.blocks.push({
                        type: 'hallucination_high',
                        riskScore: result.checks.hallucination.riskScore,
                    });
                } else {
                    if (result.status === SafetyStatus.PASS) {
                        result.status = SafetyStatus.WARNING;
                    }
                }
                result.warnings.push({
                    type: 'hallucination_risk',
                    level: result.checks.hallucination.riskLevel,
                    recommendations: result.checks.hallucination.recommendations,
                });
            }
        }

        // 4. Aggregate recommendations
        result.recommendations = this._aggregateRecommendations(result);

        // Log result
        this._logResult(ctx.id, result);

        // Add to context audit log
        if (ctx.addAuditEvent) {
            ctx.addAuditEvent('safety_check', result);
        }

        return result;
    }

    /**
     * Quick safety check for LLM output before processing
     * @param {string} content - LLM output
     * @returns {boolean} True if safe to proceed
     */
    quickCheck(content) {
        return (
            this.contentFilter.isSafe(content) &&
            !this.hallucinationDetector.quickCheck(content)
        );
    }

    /**
     * Reset guards for new context
     * @param {string} contextId
     */
    reset(contextId) {
        this.loopGuard.reset(contextId);
    }

    /**
     * Get stats from all components
     * @returns {Object}
     */
    getStats() {
        return {
            loopGuard: this.loopGuard.getStats(),
            strictMode: this.strictMode,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _aggregateRecommendations(result) {
        const recommendations = [];

        // From hallucination check
        if (result.checks.hallucination?.recommendations) {
            recommendations.push(...result.checks.hallucination.recommendations);
        }

        // From content warnings
        for (const warning of result.warnings) {
            if (warning.type === 'hallucination_risk') {
                recommendations.push('Consider requesting human review for AI-generated content');
            }
        }

        // From blocks
        if (result.blocks.length > 0) {
            recommendations.push('Review and revise blocked content before proceeding');
        }

        return [...new Set(recommendations)];
    }

    _logResult(contextId, result) {
        if (result.status === SafetyStatus.BLOCK) {
            this.log.warn('Safety check BLOCKED', {
                contextId,
                blocks: result.blocks.length,
                blockTypes: result.blocks.map(b => b.type),
            });
        } else if (result.status === SafetyStatus.WARNING) {
            this.log.info('Safety check passed with warnings', {
                contextId,
                warnings: result.warnings.length,
            });
        } else {
            this.log.debug('Safety check passed', { contextId });
        }
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {SafetyGuard}
 */
export function createSafetyGuard(options = {}) {
    return new SafetyGuard(options);
}

export default SafetyGuard;
