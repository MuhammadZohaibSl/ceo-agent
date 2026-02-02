/**
 * Decision Formatter
 * Formats the final decision proposal output
 * Structures all analysis into CEO-readable format
 */

import logger from '../utils/logger.js';

export class DecisionFormatter {
    constructor(options = {}) {
        this.log = logger.child({ component: 'DecisionFormatter' });
    }

    /**
     * Format a complete decision proposal
     * @param {Object} params
     * @param {string} params.query - Original query
     * @param {Object[]} params.options - Generated options
     * @param {Object[]} params.evaluations - Option evaluations
     * @param {Object} params.risks - Risk assessment
     * @param {Object} params.constraints - Applied constraints
     * @param {string[]} params.missingData - Missing data fields
     * @returns {Promise<Object>} Formatted decision proposal
     */
    async format(params) {
        const { query, options = [], evaluations = [], risks = {}, constraints = {}, missingData = [] } = params;

        this.log.debug('Formatting decision proposal', { optionCount: options.length });

        // Get the top recommendation
        const recommendation = this._buildRecommendation(evaluations, options);

        // Get alternatives (ranked 2+)
        const alternatives = this._buildAlternatives(evaluations, options);

        // Calculate overall confidence
        const confidence = this._calculateConfidence(evaluations, missingData, risks);

        // Extract key assumptions
        const assumptions = this._extractAssumptions(options, evaluations);

        // Build risk summary
        const riskSummary = this._buildRiskSummary(risks);

        // Determine if human approval is required
        const requiresHumanApproval = this._checkApprovalRequired(confidence, risks, constraints);

        // Build the complete proposal
        const proposal = {
            // Query context
            query,
            queryType: this._classifyQuery(query),

            // Recommendation
            recommendation,
            alternatives,

            // Analysis
            risks: riskSummary,
            confidence,
            confidenceLevel: this._getConfidenceLevel(confidence),

            // Transparency
            assumptions,
            missingData,
            constraintsApplied: this._formatConstraints(constraints),

            // Action required
            requiresHumanApproval,
            approvalReason: requiresHumanApproval ? this._getApprovalReason(confidence, risks) : null,

            // Metadata
            optionsConsidered: options.length,
            generatedAt: new Date().toISOString(),
        };

        this.log.info('Decision proposal formatted', {
            hasRecommendation: !!recommendation,
            confidence,
            requiresApproval: requiresHumanApproval,
        });

        return proposal;
    }

    /**
     * Build the primary recommendation
     * @private
     */
    _buildRecommendation(evaluations, options) {
        if (evaluations.length === 0 || options.length === 0) {
            return null;
        }

        // Get highest ranked evaluation
        const topEval = evaluations.find(e => e.rank === 1) ?? evaluations[0];
        const option = topEval?.option ?? options[0];

        if (!option) return null;

        return {
            title: option.title,
            description: option.description,
            rationale: this._buildRationale(topEval),
            estimatedCost: option.estimatedCost,
            timeToImplement: option.timeToImplement,
            riskLevel: option.riskLevel,
            score: topEval?.overallScore ?? 0,
            keyBenefits: option.pros?.slice(0, 3) ?? [],
            keyRisks: option.cons?.slice(0, 3) ?? [],
            policyAligned: topEval?.policyAlignment?.aligned ?? true,
        };
    }

    /**
     * Build the rationale for a recommendation
     * @private
     */
    _buildRationale(evaluation) {
        if (!evaluation) return 'No detailed evaluation available.';

        const parts = [];

        // Score-based rationale
        if (evaluation.overallScore >= 0.8) {
            parts.push('This option scored highly across all evaluation criteria.');
        } else if (evaluation.overallScore >= 0.6) {
            parts.push('This option represents a balanced approach with acceptable tradeoffs.');
        } else {
            parts.push('This option was the best available given the constraints.');
        }

        // Highlight strengths
        if (evaluation.scores) {
            const strengths = Object.entries(evaluation.scores)
                .filter(([_, score]) => score >= 0.8)
                .map(([criterion]) => criterion.replace(/([A-Z])/g, ' $1').trim().toLowerCase());

            if (strengths.length > 0) {
                parts.push(`Key strengths: ${strengths.join(', ')}.`);
            }
        }

        // Policy alignment
        if (evaluation.policyAlignment?.aligned) {
            parts.push('This option aligns with company policy and risk appetite.');
        }

        // Tradeoffs
        if (evaluation.tradeoffs?.length > 0) {
            parts.push(`Note: ${evaluation.tradeoffs[0]}.`);
        }

        return parts.join(' ');
    }

    /**
     * Build alternatives list
     * @private
     */
    _buildAlternatives(evaluations, options) {
        return evaluations
            .filter(e => e.rank > 1)
            .slice(0, 2) // Top 2 alternatives
            .map(e => {
                const option = e.option ?? options.find(o => o.id === e.optionId);
                return {
                    title: option?.title ?? 'Unknown',
                    description: option?.description ?? '',
                    score: e.overallScore,
                    rank: e.rank,
                    tradeoffVsTop: this._compareToTop(e, evaluations[0]),
                };
            });
    }

    /**
     * Compare an alternative to the top option
     * @private
     */
    _compareToTop(alternative, top) {
        if (!top || !alternative.scores || !top.scores) {
            return 'Insufficient data for comparison';
        }

        const betterAt = [];
        const worseAt = [];

        for (const [criterion, score] of Object.entries(alternative.scores)) {
            const topScore = top.scores[criterion] ?? 0;
            const diff = score - topScore;
            const readableName = criterion.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

            if (diff > 0.1) {
                betterAt.push(readableName);
            } else if (diff < -0.1) {
                worseAt.push(readableName);
            }
        }

        if (betterAt.length > 0 && worseAt.length > 0) {
            return `Better at ${betterAt[0]}, but weaker in ${worseAt[0]}`;
        } else if (betterAt.length > 0) {
            return `Better at ${betterAt.join(', ')}`;
        } else if (worseAt.length > 0) {
            return `Lower scores in ${worseAt.join(', ')}`;
        }

        return 'Similar overall profile';
    }

    /**
     * Calculate overall confidence
     * @private
     */
    _calculateConfidence(evaluations, missingData, risks) {
        let confidence = 0.8; // Base confidence

        // Reduce for missing data
        confidence -= missingData.length * 0.1;

        // Reduce for lack of options
        if (evaluations.length < 2) {
            confidence -= 0.15;
        }

        // Reduce for high aggregate risk
        if (risks.aggregateRisk?.overall > 0.7) {
            confidence -= 0.15;
        }

        // Reduce for policy violations
        const violations = evaluations.reduce(
            (sum, e) => sum + (e.policyAlignment?.violations?.length ?? 0),
            0
        );
        confidence -= violations * 0.1;

        // Boost for strong top recommendation
        if (evaluations[0]?.overallScore > 0.85) {
            confidence += 0.1;
        }

        return Math.max(0.1, Math.min(1, confidence));
    }

    /**
     * Extract key assumptions
     * @private
     */
    _extractAssumptions(options, evaluations) {
        const allAssumptions = new Set();

        for (const option of options) {
            for (const assumption of option.assumptions ?? []) {
                allAssumptions.add(assumption);
            }
        }

        // Add evaluation-based assumptions
        for (const evaluation of evaluations) {
            if (evaluation.policyAlignment?.alignments) {
                for (const alignment of evaluation.policyAlignment.alignments) {
                    allAssumptions.add(`Assumption: ${alignment}`);
                }
            }
        }

        return Array.from(allAssumptions).slice(0, 5);
    }

    /**
     * Build risk summary
     * @private
     */
    _buildRiskSummary(risks) {
        if (!risks || Object.keys(risks).length === 0) {
            return { overall: 'unknown', categories: {} };
        }

        // If it's already the new format from RiskModel
        if (risks.aggregateRisk) {
            return {
                overall: risks.aggregateRisk.overall,
                overallLevel: this._getRiskLevel(risks.aggregateRisk.overall),
                categories: risks.aggregateRisk.byCategory ?? {},
                alerts: risks.alerts ?? [],
                mitigationsAvailable: (risks.mitigations ?? []).length > 0,
            };
        }

        // Legacy format
        return {
            overall: 0.5,
            overallLevel: 'medium',
            categories: risks,
            alerts: [],
            mitigationsAvailable: false,
        };
    }

    /**
     * Check if human approval is required
     * @private
     */
    _checkApprovalRequired(confidence, risks, constraints) {
        // Low confidence requires approval
        if (confidence < 0.7) return true;

        // High risk requires approval
        if (risks.aggregateRisk?.overall > 0.7) return true;

        // Any alerts require approval
        if (risks.alerts?.length > 0) return true;

        // Large budget requires approval
        if (constraints.budgetLimit && constraints.budgetLimit > 100000) return true;

        return false;
    }

    /**
     * Get reason for requiring approval
     * @private
     */
    _getApprovalReason(confidence, risks) {
        const reasons = [];

        if (confidence < 0.7) {
            reasons.push('Confidence below threshold');
        }

        if (risks.aggregateRisk?.overall > 0.7) {
            reasons.push('High aggregate risk');
        }

        if (risks.alerts?.length > 0) {
            reasons.push(`${risks.alerts.length} risk alert(s) triggered`);
        }

        return reasons.join('; ') || 'Standard approval policy';
    }

    /**
     * Classify query type
     * @private
     */
    _classifyQuery(query) {
        const queryLower = (query ?? '').toLowerCase();

        if (/should we|should i|recommend/i.test(query)) return 'decision';
        if (/what if|scenario|consider/i.test(query)) return 'scenario_analysis';
        if (/how to|how should/i.test(query)) return 'strategy';
        if (/risk|danger|threat/i.test(query)) return 'risk_assessment';
        if (/invest|buy|acquire/i.test(query)) return 'investment';
        if (/expand|grow|enter/i.test(query)) return 'expansion';

        return 'general';
    }

    /**
     * Format constraints for output
     * @private
     */
    _formatConstraints(constraints) {
        const formatted = [];

        if (constraints.budgetLimit) {
            formatted.push(`Budget: $${constraints.budgetLimit.toLocaleString()}`);
        }
        if (constraints.timeHorizon) {
            formatted.push(`Timeline: ${constraints.timeHorizon}`);
        }
        if (constraints.mustExclude?.length > 0) {
            formatted.push(`Excluded: ${constraints.mustExclude.join(', ')}`);
        }
        if (constraints.mustInclude?.length > 0) {
            formatted.push(`Required: ${constraints.mustInclude.join(', ')}`);
        }

        return formatted;
    }

    /**
     * Get confidence level label
     * @private
     */
    _getConfidenceLevel(confidence) {
        if (confidence >= 0.85) return 'high';
        if (confidence >= 0.7) return 'moderate';
        if (confidence >= 0.5) return 'low';
        return 'very_low';
    }

    /**
     * Get risk level label
     * @private
     */
    _getRiskLevel(score) {
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.3) return 'medium';
        return 'low';
    }
}

export default DecisionFormatter;
