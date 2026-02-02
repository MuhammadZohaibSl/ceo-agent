/**
 * Option Evaluator
 * Deterministic, rule-based evaluation of options
 * Scores options against policy alignment without LLM
 */

import logger from '../utils/logger.js';

/**
 * Evaluation criteria weights
 */
const DEFAULT_WEIGHTS = {
    costEfficiency: 0.20,
    riskAlignment: 0.25,
    timeToValue: 0.15,
    strategicFit: 0.20,
    feasibility: 0.20,
};

export class OptionEvaluator {
    /**
     * @param {Object} options
     * @param {Object} options.weights - Custom evaluation weights
     */
    constructor(options = {}) {
        this.weights = { ...DEFAULT_WEIGHTS, ...options.weights };
        this.log = logger.child({ component: 'OptionEvaluator' });
    }

    /**
     * Evaluate a set of options
     * @param {Object[]} options - Options to evaluate
     * @param {Object} context - Evaluation context
     * @param {Object} context.constraints - Pre-decision constraints
     * @param {Object} context.decisionPolicy - CEO decision policy
     * @returns {Promise<Object[]>} Evaluated options with scores
     */
    async evaluate(options, context = {}) {
        const { constraints = {}, decisionPolicy = {} } = context;

        this.log.debug('Evaluating options', { count: options.length });

        const evaluations = options.map(option => {
            const scores = this._calculateScores(option, constraints, decisionPolicy);
            const overallScore = this._calculateOverallScore(scores);
            const policyAlignment = this._assessPolicyAlignment(option, decisionPolicy);
            const tradeoffs = this._identifyTradeoffs(option, scores);

            return {
                option,
                scores,
                overallScore,
                policyAlignment,
                tradeoffs,
                rank: 0, // Will be set after sorting
                evaluatedAt: new Date().toISOString(),
            };
        });

        // Sort by overall score and assign ranks
        evaluations.sort((a, b) => b.overallScore - a.overallScore);
        evaluations.forEach((e, i) => { e.rank = i + 1; });

        this.log.info('Options evaluated', {
            count: evaluations.length,
            topScore: evaluations[0]?.overallScore ?? 0,
        });

        return evaluations;
    }

    /**
     * Calculate individual scores for an option
     * @private
     */
    _calculateScores(option, constraints, policy) {
        return {
            costEfficiency: this._scoreCostEfficiency(option, constraints),
            riskAlignment: this._scoreRiskAlignment(option, policy),
            timeToValue: this._scoreTimeToValue(option, constraints),
            strategicFit: this._scoreStrategicFit(option, policy),
            feasibility: this._scoreFeasibility(option),
        };
    }

    /**
     * Score cost efficiency (0-1)
     * Higher score = more efficient use of budget
     * @private
     */
    _scoreCostEfficiency(option, constraints) {
        const budget = constraints.budgetLimit ?? 1000000;
        const cost = option.estimatedCost ?? 0;

        if (cost === 0) return 0.8; // Free is good but suspicious
        if (cost > budget) return 0; // Over budget

        // Score based on cost relative to budget
        // Prefer options that use 30-70% of budget
        const ratio = cost / budget;

        if (ratio <= 0.3) return 0.7 + (ratio / 0.3) * 0.2; // 0.7-0.9
        if (ratio <= 0.7) return 0.9; // Sweet spot
        if (ratio <= 1.0) return 0.9 - ((ratio - 0.7) / 0.3) * 0.5; // 0.4-0.9

        return 0;
    }

    /**
     * Score risk alignment (0-1)
     * Higher score = better alignment with risk appetite
     * @private
     */
    _scoreRiskAlignment(option, policy) {
        const riskAppetite = policy.riskAppetite ?? 0.5;
        const riskLevelMap = { low: 0.2, medium: 0.5, high: 0.8 };
        const optionRisk = riskLevelMap[option.riskLevel] ?? 0.5;

        // Perfect alignment = risk within appetite
        if (optionRisk <= riskAppetite) {
            return 1 - (riskAppetite - optionRisk) * 0.3; // Slight penalty for being too conservative
        }

        // Penalty for exceeding risk appetite
        const excess = optionRisk - riskAppetite;
        return Math.max(0, 1 - excess * 2);
    }

    /**
     * Score time to value (0-1)
     * Higher score = faster time to results
     * @private
     */
    _scoreTimeToValue(option, constraints) {
        const timeStr = option.timeToImplement ?? '';

        // Parse time estimate
        let months = 6; // Default
        if (/immediate/i.test(timeStr)) months = 0;
        else if (/1-2 month/i.test(timeStr)) months = 1.5;
        else if (/2-4 month/i.test(timeStr)) months = 3;
        else if (/3-6 month/i.test(timeStr)) months = 4.5;
        else if (/6-12 month/i.test(timeStr)) months = 9;
        else if (/12-18 month/i.test(timeStr)) months = 15;
        else if (/18-24 month/i.test(timeStr)) months = 21;
        else if (/year/i.test(timeStr)) months = 12;

        // Score inversely to time (faster = better)
        if (months === 0) return 1.0;
        if (months <= 3) return 0.9;
        if (months <= 6) return 0.8;
        if (months <= 12) return 0.6;
        if (months <= 18) return 0.4;
        return 0.3;
    }

    /**
     * Score strategic fit (0-1)
     * Higher score = better alignment with company strategy
     * @private
     */
    _scoreStrategicFit(option, policy) {
        let score = 0.5; // Base score

        const desc = (option.description ?? '').toLowerCase();
        const title = (option.title ?? '').toLowerCase();
        const combined = `${title} ${desc}`;

        // Bonus for long-term thinking if policy prefers it
        if (policy.timeHorizon === 'long-term') {
            if (/long-term|sustainable|foundation|strategic/i.test(combined)) {
                score += 0.2;
            }
            if (/short-term|quick|immediate fix/i.test(combined)) {
                score -= 0.1;
            }
        }

        // Growth vs stability alignment
        const growthBias = policy.growthVsStability ?? 0.5;
        if (growthBias > 0.5) { // Favor growth
            if (/grow|expand|scale|aggressive/i.test(combined)) score += 0.15;
            if (/conservative|maintain|preserve/i.test(combined)) score -= 0.1;
        } else { // Favor stability
            if (/stable|secure|safe|conservative/i.test(combined)) score += 0.15;
            if (/aggressive|risky|bold/i.test(combined)) score -= 0.1;
        }

        // Bonus for innovation in modern companies
        if (/innovative|technology|digital|ai/i.test(combined)) {
            score += 0.1;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Score feasibility (0-1)
     * Higher score = more likely to succeed
     * @private
     */
    _scoreFeasibility(option) {
        let score = 0.7; // Base assumption that options are feasible

        // Fewer assumptions = more feasible
        const assumptionCount = option.assumptions?.length ?? 0;
        score -= assumptionCount * 0.05;

        // More pros than cons = better
        const prosCount = option.pros?.length ?? 0;
        const consCount = option.cons?.length ?? 0;
        if (prosCount > consCount) score += 0.1;
        if (consCount > prosCount) score -= 0.1;

        // Low risk = higher feasibility
        if (option.riskLevel === 'low') score += 0.1;
        if (option.riskLevel === 'high') score -= 0.1;

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Calculate weighted overall score
     * @private
     */
    _calculateOverallScore(scores) {
        let total = 0;
        let weightSum = 0;

        for (const [criterion, weight] of Object.entries(this.weights)) {
            if (scores[criterion] !== undefined) {
                total += scores[criterion] * weight;
                weightSum += weight;
            }
        }

        return weightSum > 0 ? total / weightSum : 0;
    }

    /**
     * Assess policy alignment
     * @private
     */
    _assessPolicyAlignment(option, policy) {
        const alignments = [];
        const violations = [];

        // Check ethical red lines
        const desc = (option.description ?? '').toLowerCase();
        for (const redLine of policy.ethicalRedLines ?? []) {
            const readable = redLine.replace(/_/g, ' ');
            if (desc.includes(readable)) {
                violations.push(`Potential violation: ${redLine}`);
            }
        }

        // Check against decision principles
        for (const principle of policy.decisionPrinciples ?? []) {
            const readable = principle.replace(/_/g, ' ');
            if (/transparency/i.test(principle) && /hidden|secret/i.test(desc)) {
                violations.push('May conflict with transparency principle');
            }
            if (/stakeholder/i.test(principle)) {
                if (option.pros?.some(p => /stakeholder|customer|employee/i.test(p))) {
                    alignments.push('Considers stakeholder interests');
                }
            }
        }

        // Risk alignment
        const riskMap = { low: 0.3, medium: 0.5, high: 0.8 };
        const optionRisk = riskMap[option.riskLevel] ?? 0.5;
        if (optionRisk <= (policy.riskAppetite ?? 0.5)) {
            alignments.push('Within risk appetite');
        } else {
            violations.push('Exceeds risk appetite');
        }

        return {
            aligned: violations.length === 0,
            alignments,
            violations,
            score: violations.length > 0 ? 0.5 : 1.0,
        };
    }

    /**
     * Identify tradeoffs for an option
     * @private
     */
    _identifyTradeoffs(option, scores) {
        const tradeoffs = [];

        // High cost but good strategic fit
        if (scores.costEfficiency < 0.5 && scores.strategicFit > 0.7) {
            tradeoffs.push('Higher cost for better strategic alignment');
        }

        // Fast but risky
        if (scores.timeToValue > 0.7 && scores.riskAlignment < 0.5) {
            tradeoffs.push('Faster timeline with increased risk');
        }

        // Safe but slow
        if (scores.riskAlignment > 0.8 && scores.timeToValue < 0.5) {
            tradeoffs.push('Lower risk at the cost of slower execution');
        }

        // Good scores all around
        if (Object.values(scores).every(s => s >= 0.6)) {
            tradeoffs.push('Balanced option with no major tradeoffs');
        }

        return tradeoffs;
    }

    /**
     * Get evaluation weights
     * @returns {Object}
     */
    getWeights() {
        return { ...this.weights };
    }
}

export default OptionEvaluator;
