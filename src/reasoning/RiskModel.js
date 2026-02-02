/**
 * Risk Model
 * Rule-based risk assessment (NOT LLM-driven)
 * Evaluates risks across multiple dimensions
 */

import logger from '../utils/logger.js';

/**
 * Risk categories
 */
export const RiskCategory = {
    FINANCIAL: 'financial',
    OPERATIONAL: 'operational',
    REPUTATIONAL: 'reputational',
    REGULATORY: 'regulatory',
    STRATEGIC: 'strategic',
    EXECUTION: 'execution',
};

/**
 * Risk level thresholds
 */
const RISK_THRESHOLDS = {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
    critical: 0.95,
};

export class RiskModel {
    /**
     * @param {Object} options
     * @param {Object} options.categoryWeights - Custom weights per category
     */
    constructor(options = {}) {
        this.categoryWeights = {
            [RiskCategory.FINANCIAL]: 0.25,
            [RiskCategory.OPERATIONAL]: 0.15,
            [RiskCategory.REPUTATIONAL]: 0.20,
            [RiskCategory.REGULATORY]: 0.15,
            [RiskCategory.STRATEGIC]: 0.15,
            [RiskCategory.EXECUTION]: 0.10,
            ...options.categoryWeights,
        };
        this.log = logger.child({ component: 'RiskModel' });
    }

    /**
     * Assess risks for options
     * @param {Object[]} options - Options to assess
     * @param {Object[]} evaluations - Option evaluations
     * @param {Object} context - Assessment context
     * @param {number} context.riskAppetite - Company risk appetite (0-1)
     * @returns {Promise<Object>} Risk assessment results
     */
    async assess(options, evaluations = [], context = {}) {
        const riskAppetite = context.riskAppetite ?? 0.5;

        this.log.debug('Assessing risks', { optionCount: options.length, riskAppetite });

        // Assess each option individually
        const optionRisks = options.map((option, index) => {
            const evaluation = evaluations[index] ?? {};
            return this._assessOption(option, evaluation, riskAppetite);
        });

        // Calculate aggregate portfolio risk
        const aggregateRisk = this._calculateAggregateRisk(optionRisks);

        // Identify mitigation strategies
        const mitigations = this._identifyMitigations(optionRisks, riskAppetite);

        // Find risk alerts (options exceeding appetite)
        const alerts = optionRisks
            .filter(r => r.overallRisk > riskAppetite)
            .map(r => ({
                optionId: r.optionId,
                optionTitle: r.optionTitle,
                riskLevel: r.riskLevel,
                exceedsAppetiteBy: (r.overallRisk - riskAppetite).toFixed(2),
                topRisks: r.topRisks,
            }));

        this.log.info('Risk assessment complete', {
            optionCount: options.length,
            alertCount: alerts.length,
            aggregateRisk: aggregateRisk.overall,
        });

        return {
            optionRisks,
            aggregateRisk,
            mitigations,
            alerts,
            riskAppetite,
            assessedAt: new Date().toISOString(),
        };
    }

    /**
     * Assess a single option
     * @private
     */
    _assessOption(option, evaluation, riskAppetite) {
        const categoryScores = {
            [RiskCategory.FINANCIAL]: this._assessFinancialRisk(option),
            [RiskCategory.OPERATIONAL]: this._assessOperationalRisk(option),
            [RiskCategory.REPUTATIONAL]: this._assessReputationalRisk(option),
            [RiskCategory.REGULATORY]: this._assessRegulatoryRisk(option),
            [RiskCategory.STRATEGIC]: this._assessStrategicRisk(option, evaluation),
            [RiskCategory.EXECUTION]: this._assessExecutionRisk(option),
        };

        // Calculate weighted overall risk
        let overallRisk = 0;
        for (const [category, score] of Object.entries(categoryScores)) {
            overallRisk += score * (this.categoryWeights[category] ?? 0.1);
        }

        // Identify top risks
        const sortedRisks = Object.entries(categoryScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, score]) => ({
                category,
                score,
                level: this._getRiskLevel(score),
            }));

        return {
            optionId: option.id,
            optionTitle: option.title,
            categoryScores,
            overallRisk,
            riskLevel: this._getRiskLevel(overallRisk),
            withinAppetite: overallRisk <= riskAppetite,
            topRisks: sortedRisks,
        };
    }

    /**
     * Assess financial risk
     * @private
     */
    _assessFinancialRisk(option) {
        let risk = 0.3; // Base risk

        const cost = option.estimatedCost ?? 0;

        // Higher cost = higher risk
        if (cost > 500000) risk += 0.3;
        else if (cost > 100000) risk += 0.15;
        else if (cost > 50000) risk += 0.05;

        // Check for ROI uncertainty
        if (!option.expectedRevenue && !option.expectedSavings) {
            risk += 0.1; // Unknown return
        }

        // High risk level adds to financial risk
        if (option.riskLevel === 'high') risk += 0.2;

        return Math.min(1, risk);
    }

    /**
     * Assess operational risk
     * @private
     */
    _assessOperationalRisk(option) {
        let risk = 0.2; // Base risk

        const desc = (option.description ?? '').toLowerCase();
        const cons = (option.cons ?? []).join(' ').toLowerCase();

        // Operational complexity indicators
        if (/complex|complicated|difficult/i.test(desc)) risk += 0.2;
        if (/integration|migrate|transition/i.test(desc)) risk += 0.15;
        if (/resource intensive|heavy lift/i.test(cons)) risk += 0.15;

        // Many assumptions = operational uncertainty
        const assumptionCount = option.assumptions?.length ?? 0;
        risk += assumptionCount * 0.05;

        return Math.min(1, risk);
    }

    /**
     * Assess reputational risk
     * @private
     */
    _assessReputationalRisk(option) {
        let risk = 0.1; // Base risk

        const desc = (option.description ?? '').toLowerCase();
        const cons = (option.cons ?? []).join(' ').toLowerCase();

        // Reputational risk indicators
        if (/public|customer facing|brand/i.test(desc)) risk += 0.1;
        if (/controversial|unpopular|backlash/i.test(cons)) risk += 0.3;
        if (/layoff|termination|cut staff/i.test(desc)) risk += 0.25;
        if (/privacy|data|security/i.test(desc)) risk += 0.15;

        return Math.min(1, risk);
    }

    /**
     * Assess regulatory/legal risk
     * @private
     */
    _assessRegulatoryRisk(option) {
        let risk = 0.15; // Base risk

        const desc = (option.description ?? '').toLowerCase();
        const assumptions = (option.assumptions ?? []).join(' ').toLowerCase();

        // Regulatory risk indicators
        if (/regulatory|compliance|legal/i.test(desc)) risk += 0.2;
        if (/gdpr|hipaa|sox|pci/i.test(desc)) risk += 0.15;
        if (/international|cross-border|eu|europe/i.test(desc)) risk += 0.1;
        if (/approval|permit|license/i.test(assumptions)) risk += 0.15;

        return Math.min(1, risk);
    }

    /**
     * Assess strategic risk
     * @private
     */
    _assessStrategicRisk(option, evaluation) {
        let risk = 0.2; // Base risk

        // Low strategic fit = higher strategic risk
        const strategicFit = evaluation?.scores?.strategicFit ?? 0.5;
        risk += (1 - strategicFit) * 0.3;

        // Policy violations increase strategic risk
        const violations = evaluation?.policyAlignment?.violations ?? [];
        risk += violations.length * 0.15;

        const desc = (option.description ?? '').toLowerCase();

        // Strategic risk indicators
        if (/pivot|major change|transformation/i.test(desc)) risk += 0.2;
        if (/new market|unknown territory/i.test(desc)) risk += 0.15;

        return Math.min(1, risk);
    }

    /**
     * Assess execution risk
     * @private
     */
    _assessExecutionRisk(option) {
        let risk = 0.25; // Base risk

        // Long timeline = higher execution risk
        const timeStr = (option.timeToImplement ?? '').toLowerCase();
        if (/12-18|18-24|year/i.test(timeStr)) risk += 0.25;
        else if (/6-12/i.test(timeStr)) risk += 0.15;
        else if (/immediate/i.test(timeStr)) risk -= 0.1;

        // Many assumptions = execution uncertainty
        const assumptionCount = option.assumptions?.length ?? 0;
        risk += assumptionCount * 0.05;

        // Many cons = execution challenges
        const consCount = option.cons?.length ?? 0;
        risk += consCount * 0.05;

        return Math.min(1, Math.max(0, risk));
    }

    /**
     * Calculate aggregate risk across all options
     * @private
     */
    _calculateAggregateRisk(optionRisks) {
        if (optionRisks.length === 0) {
            return { overall: 0, byCategory: {} };
        }

        // Average across categories
        const categoryTotals = {};
        for (const category of Object.values(RiskCategory)) {
            categoryTotals[category] = 0;
        }

        for (const risk of optionRisks) {
            for (const [category, score] of Object.entries(risk.categoryScores)) {
                categoryTotals[category] += score;
            }
        }

        const byCategory = {};
        for (const [category, total] of Object.entries(categoryTotals)) {
            byCategory[category] = total / optionRisks.length;
        }

        const overall = optionRisks.reduce((sum, r) => sum + r.overallRisk, 0) / optionRisks.length;

        return { overall, byCategory };
    }

    /**
     * Identify risk mitigations
     * @private
     */
    _identifyMitigations(optionRisks, riskAppetite) {
        const mitigations = [];

        for (const risk of optionRisks) {
            if (risk.overallRisk > riskAppetite) {
                const optionMitigations = [];

                for (const topRisk of risk.topRisks) {
                    const strategies = this._getMitigationStrategies(topRisk.category);
                    optionMitigations.push({
                        category: topRisk.category,
                        currentRisk: topRisk.score,
                        strategies,
                    });
                }

                mitigations.push({
                    optionId: risk.optionId,
                    optionTitle: risk.optionTitle,
                    mitigations: optionMitigations,
                });
            }
        }

        return mitigations;
    }

    /**
     * Get mitigation strategies for a risk category
     * @private
     */
    _getMitigationStrategies(category) {
        const strategies = {
            [RiskCategory.FINANCIAL]: [
                'Phased investment approach',
                'Set clear go/no-go milestones',
                'Secure contingency budget',
                'Establish cost controls and oversight',
            ],
            [RiskCategory.OPERATIONAL]: [
                'Create detailed implementation plan',
                'Identify and allocate key resources early',
                'Run pilot program first',
                'Establish operational playbooks',
            ],
            [RiskCategory.REPUTATIONAL]: [
                'Develop stakeholder communication plan',
                'Prepare response scenarios',
                'Engage PR/communications early',
                'Consider phased or quiet rollout',
            ],
            [RiskCategory.REGULATORY]: [
                'Engage legal counsel early',
                'Conduct compliance audit',
                'Build regulatory buffer time',
                'Document compliance measures',
            ],
            [RiskCategory.STRATEGIC]: [
                'Validate strategic assumptions',
                'Build flexibility into approach',
                'Define clear success metrics',
                'Plan strategic exit options',
            ],
            [RiskCategory.EXECUTION]: [
                'Assign dedicated project leadership',
                'Shorten feedback cycles',
                'Reduce scope to MVP first',
                'Identify dependencies early',
            ],
        };

        return strategies[category] ?? ['Conduct detailed risk analysis'];
    }

    /**
     * Get risk level label from score
     * @private
     */
    _getRiskLevel(score) {
        if (score >= RISK_THRESHOLDS.critical) return 'critical';
        if (score >= RISK_THRESHOLDS.high) return 'high';
        if (score >= RISK_THRESHOLDS.medium) return 'medium';
        return 'low';
    }
}

export default RiskModel;
