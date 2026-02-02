/**
 * Content Filter
 * Filters inappropriate, harmful, or off-topic content
 */

import logger from '../utils/logger.js';

/**
 * Content categories
 */
export const ContentCategory = {
    SAFE: 'safe',
    BORDERLINE: 'borderline',
    BLOCKED: 'blocked',
};

/**
 * Block reasons
 */
export const BlockReason = {
    HARMFUL_ADVICE: 'harmful_advice',
    ETHICAL_VIOLATION: 'ethical_violation',
    LEGAL_RISK: 'legal_risk',
    OFF_TOPIC: 'off_topic',
    PERSONAL_DATA: 'personal_data',
};

export class ContentFilter {
    /**
     * @param {Object} options
     * @param {string[]} options.blockedPatterns - Custom blocked patterns
     * @param {string[]} options.allowedTopics - Allowed topic areas
     */
    constructor(options = {}) {
        this.log = logger.child({ component: 'ContentFilter' });

        // Default blocked patterns
        this.blockedPatterns = [
            // Harmful business advice
            /fraud|embezzle|launder|brib(e|ery)/i,
            /evade.*tax|tax.*evasion/i,
            /insider.*trading|market.*manipulat/i,

            // Personal/sensitive data
            /social.*security.*number|ssn[:=]/i,
            /credit.*card.*number/i,
            /password[:=]|secret.*key[:=]/i,

            // Discriminatory content
            /discriminat.*based.*on.*(race|gender|religion|age)/i,

            ...(options.blockedPatterns ?? []),
        ];

        // Ethical red lines (from decision policy)
        this.ethicalRedLines = options.ethicalRedLines ?? [
            'illegal_activity',
            'harm_to_employees',
            'environmental_destruction',
            'deceptive_practices',
            'regulatory_evasion',
        ];

        // Off-topic detection
        this.businessTopics = new Set([
            'strategy', 'market', 'revenue', 'growth', 'investment', 'expansion',
            'risk', 'budget', 'financial', 'cost', 'profit', 'business', 'decision',
            'partnership', 'acquisition', 'merger', 'product', 'customer', 'sales',
            'operation', 'efficiency', 'innovation', 'technology', 'competition',
        ]);
    }

    /**
     * Filter content for safety issues
     * @param {Object} params
     * @param {string} params.content - Content to filter
     * @param {string} params.query - Original query for context
     * @param {Object} params.decisionPolicy - Decision policy with red lines
     * @returns {Object} Filter result
     */
    filter(params) {
        const { content, query, decisionPolicy = {} } = params;

        const result = {
            category: ContentCategory.SAFE,
            blocked: false,
            reasons: [],
            warnings: [],
            sanitized: content,
            checked: true,
            checkedAt: new Date().toISOString(),
        };

        if (!content) {
            return result;
        }

        // 1. Check blocked patterns
        const blockedCheck = this._checkBlockedPatterns(content);
        if (blockedCheck.blocked) {
            result.category = ContentCategory.BLOCKED;
            result.blocked = true;
            result.reasons.push(...blockedCheck.reasons);
        }

        // 2. Check ethical red lines
        const ethicsCheck = this._checkEthicalRedLines(content, decisionPolicy);
        if (ethicsCheck.violated) {
            result.category = ContentCategory.BLOCKED;
            result.blocked = true;
            result.reasons.push(...ethicsCheck.reasons);
        }

        // 3. Check for borderline content
        const borderlineCheck = this._checkBorderline(content);
        if (borderlineCheck.flagged && result.category === ContentCategory.SAFE) {
            result.category = ContentCategory.BORDERLINE;
            result.warnings.push(...borderlineCheck.warnings);
        }

        // 4. Check topic relevance
        const topicCheck = this._checkTopicRelevance(content, query);
        if (topicCheck.offTopic) {
            result.warnings.push('Content may be off-topic for business decisions');
        }

        // 5. Sanitize if needed (redact PII)
        if (!result.blocked) {
            result.sanitized = this._sanitize(content);
        }

        if (result.blocked) {
            this.log.warn('Content blocked', { reasons: result.reasons });
        } else if (result.warnings.length > 0) {
            this.log.debug('Content warnings', { warnings: result.warnings });
        }

        return result;
    }

    /**
     * Quick safety check
     * @param {string} content
     * @returns {boolean} True if safe
     */
    isSafe(content) {
        return !this.blockedPatterns.some(pattern => pattern.test(content));
    }

    // ─────────────────────────────────────────────────────────────
    // Private Check Methods
    // ─────────────────────────────────────────────────────────────

    _checkBlockedPatterns(content) {
        const reasons = [];

        for (const pattern of this.blockedPatterns) {
            if (pattern.test(content)) {
                reasons.push({
                    type: BlockReason.HARMFUL_ADVICE,
                    pattern: pattern.source,
                });
            }
        }

        return {
            blocked: reasons.length > 0,
            reasons,
        };
    }

    _checkEthicalRedLines(content, policy) {
        const redLines = policy.ethicalRedLines ?? this.ethicalRedLines;
        const reasons = [];
        const contentLower = content.toLowerCase();

        const violationPatterns = {
            'illegal_activity': /illegal|unlawful|against.*law|violat.*regulat/i,
            'harm_to_employees': /layoff.*without|unfair.*terminat|exploit.*worker/i,
            'environmental_destruction': /dump.*toxic|ignore.*environmental/i,
            'deceptive_practices': /mislead.*customer|false.*advertis|hide.*defect/i,
            'regulatory_evasion': /avoid.*regulat|bypass.*compliance|evade.*oversight/i,
        };

        for (const redLine of redLines) {
            const pattern = violationPatterns[redLine];
            if (pattern && pattern.test(content)) {
                reasons.push({
                    type: BlockReason.ETHICAL_VIOLATION,
                    redLine,
                });
            }
        }

        return {
            violated: reasons.length > 0,
            reasons,
        };
    }

    _checkBorderline(content) {
        const warnings = [];

        const borderlinePatterns = [
            { pattern: /aggressive.*pricing|predatory/i, warning: 'Potentially aggressive competitive strategy' },
            { pattern: /confidential|proprietary|trade.*secret/i, warning: 'References confidential information' },
            { pattern: /lobby|political.*donat/i, warning: 'Political/lobbying content' },
            { pattern: /competitor.*weakness|exploit.*rival/i, warning: 'Competitive intelligence concerns' },
        ];

        for (const { pattern, warning } of borderlinePatterns) {
            if (pattern.test(content)) {
                warnings.push(warning);
            }
        }

        return {
            flagged: warnings.length > 0,
            warnings,
        };
    }

    _checkTopicRelevance(content, query) {
        const combinedText = `${content} ${query}`.toLowerCase();
        const words = combinedText.split(/\W+/);

        let relevantCount = 0;
        for (const word of words) {
            if (this.businessTopics.has(word)) {
                relevantCount++;
            }
        }

        // Consider off-topic if less than 5% of words are business-related
        const relevanceRatio = relevantCount / Math.max(1, words.length);

        return {
            offTopic: relevanceRatio < 0.02 && words.length > 20,
            relevanceScore: relevanceRatio,
        };
    }

    _sanitize(content) {
        let sanitized = content;

        // Redact potential PII
        const piiPatterns = [
            { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
            { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD REDACTED]' },
            { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL REDACTED]' },
        ];

        for (const { pattern, replacement } of piiPatterns) {
            sanitized = sanitized.replace(pattern, replacement);
        }

        return sanitized;
    }
}

export default ContentFilter;
