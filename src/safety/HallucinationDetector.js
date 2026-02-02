/**
 * Hallucination Detector
 * Detects inconsistencies and potential hallucinations in LLM outputs
 * Uses multiple heuristics since we don't have ground truth
 */

import logger from '../utils/logger.js';

/**
 * Detection confidence levels
 */
export const HallucinationRisk = {
    NONE: 'none',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
};

export class HallucinationDetector {
    constructor(options = {}) {
        this.log = logger.child({ component: 'HallucinationDetector' });

        // Thresholds for detection
        this.thresholds = {
            confidenceGap: 0.3,        // Gap between claimed and actual confidence
            factDensity: 0.8,          // Too many "facts" per sentence
            quantitativeLoad: 0.5,     // Too many specific numbers
            ...options.thresholds,
        };
    }

    /**
     * Analyze content for potential hallucinations
     * @param {Object} params
     * @param {string} params.content - LLM-generated content
     * @param {Object[]} params.ragContext - Retrieved documents for grounding
     * @param {Object[]} params.memory - Memory context
     * @param {Object} params.claims - Extracted claims from content
     * @returns {Object} Detection result
     */
    analyze(params) {
        const { content, ragContext = [], memory = [], claims = {} } = params;

        if (!content) {
            return this._noContent();
        }

        const checks = [];

        // 1. Check for unsupported claims
        checks.push(this._checkUnsupportedClaims(content, ragContext));

        // 2. Check for internal consistency
        checks.push(this._checkInternalConsistency(content));

        // 3. Check for overconfident language
        checks.push(this._checkOverconfidence(content, claims));

        // 4. Check for specific number hallucinations
        checks.push(this._checkSpecificNumbers(content, ragContext));

        // 5. Check for temporal consistency
        checks.push(this._checkTemporalConsistency(content));

        // Calculate overall risk
        const riskScore = this._calculateRiskScore(checks);
        const riskLevel = this._getRiskLevel(riskScore);

        const result = {
            riskScore,
            riskLevel,
            checks,
            flaggedIssues: checks.filter(c => c.flagged),
            recommendations: this._generateRecommendations(checks),
            analyzed: true,
            analyzedAt: new Date().toISOString(),
        };

        if (riskLevel !== HallucinationRisk.NONE) {
            this.log.warn('Potential hallucination detected', { riskLevel, riskScore });
        }

        return result;
    }

    /**
     * Quick check for obvious issues
     * @param {string} content
     * @returns {boolean} True if likely contains hallucinations
     */
    quickCheck(content) {
        if (!content) return false;

        const redFlags = [
            /according to (the|a) (well-known|famous|leading)/i,
            /studies (show|prove|confirm) that/i,
            /\d{1,2}\/\d{1,2}\/\d{4}/,  // Specific dates
            /exactly \d+/i,
            /precisely \d+/i,
            /\d+\.\d{3,}%/,  // Too precise percentages
        ];

        return redFlags.some(pattern => pattern.test(content));
    }

    // ─────────────────────────────────────────────────────────────
    // Private Check Methods
    // ─────────────────────────────────────────────────────────────

    _noContent() {
        return {
            riskScore: 0,
            riskLevel: HallucinationRisk.NONE,
            checks: [],
            flaggedIssues: [],
            recommendations: [],
            analyzed: false,
        };
    }

    _checkUnsupportedClaims(content, ragContext) {
        const result = {
            name: 'unsupported_claims',
            description: 'Claims not grounded in retrieved context',
            flagged: false,
            score: 0,
            details: [],
        };

        // Extract factual claims (sentences with numbers or strong assertions)
        const claims = this._extractClaims(content);
        const contextText = ragContext.map(d => d.content ?? d.text ?? '').join(' ').toLowerCase();

        let unsupportedCount = 0;
        for (const claim of claims) {
            // Check if key terms from claim appear in context
            const keyTerms = this._extractKeyTerms(claim);
            const supported = keyTerms.some(term => contextText.includes(term.toLowerCase()));

            if (!supported && ragContext.length > 0) {
                unsupportedCount++;
                result.details.push(claim.substring(0, 100));
            }
        }

        if (claims.length > 0) {
            result.score = unsupportedCount / claims.length;
            result.flagged = result.score > 0.5;
        }

        return result;
    }

    _checkInternalConsistency(content) {
        const result = {
            name: 'internal_consistency',
            description: 'Self-contradictions within content',
            flagged: false,
            score: 0,
            details: [],
        };

        // Look for contradictory patterns
        const contradictionPatterns = [
            [/high risk/i, /low risk/i],
            [/recommend/i, /not recommend/i],
            [/should/i, /should not/i],
            [/increase/i, /decrease/i],
            [/growth/i, /decline/i],
        ];

        for (const [pattern1, pattern2] of contradictionPatterns) {
            if (pattern1.test(content) && pattern2.test(content)) {
                result.details.push(`Found both ${pattern1.source} and ${pattern2.source}`);
                result.score += 0.2;
            }
        }

        result.score = Math.min(1, result.score);
        result.flagged = result.score > 0.3;

        return result;
    }

    _checkOverconfidence(content, claims) {
        const result = {
            name: 'overconfidence',
            description: 'Overconfident language without supporting evidence',
            flagged: false,
            score: 0,
            details: [],
        };

        const overconfidentPhrases = [
            /definitely/i,
            /certainly/i,
            /guaranteed/i,
            /without (a )?doubt/i,
            /100%/i,
            /always/i,
            /never/i,
            /proven fact/i,
            /undeniable/i,
        ];

        let matchCount = 0;
        for (const phrase of overconfidentPhrases) {
            if (phrase.test(content)) {
                matchCount++;
                result.details.push(`Found "${phrase.source}"`);
            }
        }

        result.score = Math.min(1, matchCount * 0.2);
        result.flagged = result.score > 0.3;

        return result;
    }

    _checkSpecificNumbers(content, ragContext) {
        const result = {
            name: 'specific_numbers',
            description: 'Suspiciously specific numerical data',
            flagged: false,
            score: 0,
            details: [],
        };

        // Find all numbers/percentages
        const numbers = content.match(/\d+(?:\.\d+)?%?/g) ?? [];
        const contextText = ragContext.map(d => d.content ?? d.text ?? '').join(' ');

        let suspiciousCount = 0;
        for (const num of numbers) {
            // Very precise percentages are suspicious
            if (/\d+\.\d{2,}%/.test(num)) {
                suspiciousCount++;
                result.details.push(`Overly precise: ${num}`);
            }
            // Large specific numbers not in context
            else if (/\d{4,}/.test(num) && !contextText.includes(num)) {
                suspiciousCount++;
                result.details.push(`Ungrounded number: ${num}`);
            }
        }

        if (numbers.length > 0) {
            result.score = Math.min(1, suspiciousCount / numbers.length);
        }
        result.flagged = suspiciousCount > 2 || result.score > 0.4;

        return result;
    }

    _checkTemporalConsistency(content) {
        const result = {
            name: 'temporal_consistency',
            description: 'Inconsistent or suspicious temporal references',
            flagged: false,
            score: 0,
            details: [],
        };

        // Look for future dates stated as facts
        const currentYear = new Date().getFullYear();
        const futureYearPattern = new RegExp(`(in |by )?(${currentYear + 1}|${currentYear + 2}|${currentYear + 3})`, 'g');
        const futureRefs = content.match(futureYearPattern) ?? [];

        // Predictions stated as facts
        const predictionAsFactPatterns = [
            /will definitely|will certainly|will always/i,
            /is going to happen/i,
            /will result in/i,
        ];

        for (const pattern of predictionAsFactPatterns) {
            if (pattern.test(content)) {
                result.details.push(`Prediction as fact: ${pattern.source}`);
                result.score += 0.15;
            }
        }

        result.score = Math.min(1, result.score);
        result.flagged = result.score > 0.3;

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────

    _extractClaims(content) {
        // Split into sentences and filter for factual claims
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

        return sentences.filter(s => {
            // Contains numbers, percentages, or strong assertions
            return /\d|will|must|should|always|never|proven/i.test(s);
        });
    }

    _extractKeyTerms(text) {
        // Extract significant words (remove common words)
        const stopWords = new Set([
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
            'and', 'or', 'but', 'if', 'then', 'for', 'of', 'to', 'in', 'on', 'at', 'by',
        ]);

        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));
    }

    _calculateRiskScore(checks) {
        if (checks.length === 0) return 0;

        // Weighted average of check scores
        const weights = {
            unsupported_claims: 0.35,
            internal_consistency: 0.25,
            overconfidence: 0.15,
            specific_numbers: 0.15,
            temporal_consistency: 0.10,
        };

        let totalScore = 0;
        let totalWeight = 0;

        for (const check of checks) {
            const weight = weights[check.name] ?? 0.1;
            totalScore += check.score * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    _getRiskLevel(score) {
        if (score >= 0.6) return HallucinationRisk.HIGH;
        if (score >= 0.4) return HallucinationRisk.MEDIUM;
        if (score >= 0.2) return HallucinationRisk.LOW;
        return HallucinationRisk.NONE;
    }

    _generateRecommendations(checks) {
        const recommendations = [];

        for (const check of checks) {
            if (!check.flagged) continue;

            switch (check.name) {
                case 'unsupported_claims':
                    recommendations.push('Verify factual claims against source documents');
                    break;
                case 'internal_consistency':
                    recommendations.push('Review for self-contradictions');
                    break;
                case 'overconfidence':
                    recommendations.push('Add uncertainty qualifiers to predictions');
                    break;
                case 'specific_numbers':
                    recommendations.push('Validate numerical data against sources');
                    break;
                case 'temporal_consistency':
                    recommendations.push('Distinguish predictions from established facts');
                    break;
            }
        }

        return [...new Set(recommendations)];
    }
}

export default HallucinationDetector;
