/**
 * Option Generator
 * LLM-driven idea generation for CEO decisions
 * Generates strategic options based on query, context, and constraints
 */

import logger from '../utils/logger.js';

/**
 * Optimized prompt for local LLMs - Short, focused, simple output format
 * CEOs make decisions by: Analyzing situation → Identifying options → Weighing tradeoffs → Deciding
 */
const OPTION_GENERATION_PROMPT = `You are a CEO. Answer this business question with 3 strategic options.

QUESTION: {{query}}

COMPANY INFO:
{{context}}

BUDGET: {{budget}}

Give exactly 3 options in this format:

OPTION 1: [Title]
ACTION: [What to do in 1-2 sentences]
COST: [Dollar amount]
RISK: [low/medium/high]
TIMELINE: [How long]

OPTION 2: [Title]
ACTION: [What to do in 1-2 sentences]
COST: [Dollar amount]
RISK: [low/medium/high]
TIMELINE: [How long]

OPTION 3: [Title]
ACTION: [What to do in 1-2 sentences]
COST: [Dollar amount]
RISK: [low/medium/high]
TIMELINE: [How long]

RECOMMENDATION: [Which option is best and why in 1 sentence]`;

export class OptionGenerator {
    /**
     * @param {Object} options
     * @param {Object} options.llmClient - LLM client for generation
     */
    constructor(options = {}) {
        this.llmClient = options.llmClient ?? null;
        this.log = logger.child({ component: 'OptionGenerator' });
    }

    /**
     * Generate options for a decision query
     * @param {Object} params
     * @param {string} params.query - Decision query
     * @param {Object[]} params.memory - Relevant memory context
     * @param {Object[]} params.ragContext - Retrieved documents
     * @param {Object} params.constraints - Pre-decision constraints
     * @param {Object} params.decisionPolicy - CEO decision policy
     * @returns {Promise<Object[]>} Generated options
     */
    async generate(params) {
        const { query, memory = [], ragContext = [], constraints = {}, decisionPolicy = {} } = params;

        this.log.debug('Generating options', { query: query.substring(0, 50) });

        // If LLM client is available, use it
        if (this.llmClient) {
            return this._generateWithLLM(params);
        }

        // Otherwise, use rule-based generation
        return this._generateRuleBased(params);
    }

    /**
     * Generate options using LLM
     * @private
     */
    async _generateWithLLM(params) {
        const { query, memory, ragContext, constraints } = params;

        // Build concise context for small LLMs
        const contextStr = this._buildContextString(memory, ragContext);
        const budget = constraints?.budgetLimit
            ? `$${constraints.budgetLimit.toLocaleString()}`
            : 'Flexible';

        // Build simplified prompt for local LLMs
        const prompt = OPTION_GENERATION_PROMPT
            .replace('{{query}}', query)
            .replace('{{context}}', contextStr || 'Growing tech company')
            .replace('{{budget}}', budget);

        try {
            const response = await this.llmClient.generate(prompt);
            const options = this._parseOptions(response);

            this.log.info('Options generated via LLM', { count: options.length });

            // If parsing failed, fall back to rules
            if (options.length === 0) {
                this.log.warn('LLM response parsing yielded 0 options, using rules');
                return this._generateRuleBased(params);
            }

            return options;
        } catch (error) {
            this.log.error('LLM generation failed, falling back to rule-based', { error: error.message });
            return this._generateRuleBased(params);
        }
    }

    /**
     * Generate options using rules (fallback when no LLM)
     * @private
     */
    _generateRuleBased(params) {
        const { query, constraints = {}, decisionPolicy = {} } = params;
        const queryLower = query.toLowerCase();

        const options = [];

        // Analyze query intent
        const isExpansion = /expand|grow|enter|market|international/i.test(query);
        const isInvestment = /invest|buy|acquire|purchase/i.test(query);
        const isCostReduction = /reduce|cut|save|efficiency/i.test(query);
        const isStrategic = /strategy|strategic|long-term|future/i.test(query);

        // Generate context-appropriate options
        if (isExpansion) {
            options.push(
                this._createOption({
                    title: 'Aggressive Expansion',
                    description: 'Full market entry with dedicated local team and marketing push',
                    pros: ['First-mover advantage', 'Stronger market presence', 'Higher revenue potential'],
                    cons: ['High upfront cost', 'Higher risk', 'Resource intensive'],
                    estimatedCost: constraints.budgetLimit ?? 500000,
                    timeToImplement: '6-12 months',
                    riskLevel: 'high',
                    assumptions: ['Market demand exists', 'Talent is available', 'Regulatory approval obtained'],
                }),
                this._createOption({
                    title: 'Phased Expansion',
                    description: 'Gradual market entry starting with pilot region',
                    pros: ['Lower initial risk', 'Learn and adapt', 'Manageable investment'],
                    cons: ['Slower growth', 'May miss market window', 'Competitors may move faster'],
                    estimatedCost: (constraints.budgetLimit ?? 500000) * 0.4,
                    timeToImplement: '12-18 months',
                    riskLevel: 'medium',
                    assumptions: ['Pilot success predicts full market', 'Resources can scale'],
                }),
                this._createOption({
                    title: 'Partnership Entry',
                    description: 'Enter market through strategic local partnership',
                    pros: ['Local expertise', 'Shared risk', 'Faster time to market'],
                    cons: ['Less control', 'Profit sharing', 'Partner dependency'],
                    estimatedCost: (constraints.budgetLimit ?? 500000) * 0.3,
                    timeToImplement: '3-6 months',
                    riskLevel: 'low',
                    assumptions: ['Suitable partner exists', 'Aligned incentives'],
                }),
                this._createOption({
                    title: 'Delay and Monitor',
                    description: 'Postpone expansion, continue market research',
                    pros: ['No immediate risk', 'More data for decision', 'Preserve capital'],
                    cons: ['May lose opportunity', 'Competitors advance', 'Team frustration'],
                    estimatedCost: 50000,
                    timeToImplement: '6 months',
                    riskLevel: 'low',
                    assumptions: ['Market will still be viable later', 'No urgent competitive pressure'],
                })
            );
        } else if (isInvestment) {
            options.push(
                this._createOption({
                    title: 'Full Investment',
                    description: 'Proceed with full investment as proposed',
                    pros: ['Maximum potential return', 'Full commitment signals confidence'],
                    cons: ['High capital at risk', 'Opportunity cost'],
                    estimatedCost: constraints.budgetLimit ?? 1000000,
                    timeToImplement: 'Immediate',
                    riskLevel: 'high',
                    assumptions: ['Valuation is accurate', 'Synergies will materialize'],
                }),
                this._createOption({
                    title: 'Partial Investment',
                    description: 'Invest 50% now with option to increase later',
                    pros: ['Lower initial risk', 'Maintains optionality', 'Tests thesis'],
                    cons: ['May not get favorable terms later', 'Less influence'],
                    estimatedCost: (constraints.budgetLimit ?? 1000000) * 0.5,
                    timeToImplement: 'Immediate',
                    riskLevel: 'medium',
                    assumptions: ['Option to increase will be available', 'Terms remain favorable'],
                }),
                this._createOption({
                    title: 'Pass on Investment',
                    description: 'Decline this opportunity, preserve capital',
                    pros: ['Capital preserved', 'Focus on core business', 'No integration risk'],
                    cons: ['Miss potential upside', 'Competitor may invest'],
                    estimatedCost: 0,
                    timeToImplement: 'Immediate',
                    riskLevel: 'low',
                    assumptions: ['Better opportunities will arise', 'Core business is strong'],
                })
            );
        } else {
            // Generic strategic options
            options.push(
                this._createOption({
                    title: 'Proceed as Proposed',
                    description: 'Move forward with the initiative as outlined',
                    pros: ['Captures opportunity', 'Shows decisive leadership'],
                    cons: ['Resource commitment', 'Execution risk'],
                    estimatedCost: constraints.budgetLimit ?? 100000,
                    timeToImplement: '3-6 months',
                    riskLevel: 'medium',
                    assumptions: ['Resources are available', 'Market conditions stable'],
                }),
                this._createOption({
                    title: 'Modified Approach',
                    description: 'Proceed with reduced scope or modified parameters',
                    pros: ['Lower risk', 'Faster validation', 'Resource efficient'],
                    cons: ['May not achieve full potential', 'Incomplete solution'],
                    estimatedCost: (constraints.budgetLimit ?? 100000) * 0.5,
                    timeToImplement: '2-4 months',
                    riskLevel: 'low',
                    assumptions: ['Core value can be captured with smaller scope'],
                }),
                this._createOption({
                    title: 'Defer Decision',
                    description: 'Gather more information before committing',
                    pros: ['Better informed decision', 'No premature commitment'],
                    cons: ['Delay costs', 'Analysis paralysis risk'],
                    estimatedCost: 10000,
                    timeToImplement: '1-2 months',
                    riskLevel: 'low',
                    assumptions: ['Additional information is actionable', 'Window remains open'],
                })
            );
        }

        // Filter by constraints
        const filtered = this._filterByConstraints(options, constraints, decisionPolicy);

        this.log.info('Options generated via rules', {
            total: options.length,
            afterFilter: filtered.length,
        });

        return filtered;
    }

    /**
     * Create a standardized option object
     * @private
     */
    _createOption(data) {
        return {
            id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            title: data.title,
            description: data.description,
            pros: data.pros ?? [],
            cons: data.cons ?? [],
            estimatedCost: data.estimatedCost ?? 0,
            timeToImplement: data.timeToImplement ?? 'Unknown',
            riskLevel: data.riskLevel ?? 'medium',
            assumptions: data.assumptions ?? [],
            generatedAt: new Date().toISOString(),
            source: 'rule_based',
        };
    }

    /**
     * Filter options by constraints and policy
     * @private
     */
    _filterByConstraints(options, constraints, policy) {
        return options.filter(option => {
            // Check budget constraint
            if (constraints.budgetLimit && option.estimatedCost > constraints.budgetLimit) {
                return false;
            }

            // Check risk appetite
            const riskScore = { low: 0.3, medium: 0.6, high: 0.9 }[option.riskLevel] ?? 0.5;
            if (riskScore > (policy.riskAppetite ?? 1)) {
                return false;
            }

            // Check must exclude
            if (constraints.mustExclude?.length > 0) {
                const desc = option.description.toLowerCase();
                for (const exclude of constraints.mustExclude) {
                    if (desc.includes(exclude.toLowerCase().replace(/_/g, ' '))) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    /**
     * Build context string from memory and RAG
     * @private
     */
    _buildContextString(memory, ragContext) {
        const parts = [];

        if (memory?.length > 0) {
            parts.push('RECENT CONTEXT:');
            for (const m of memory.slice(0, 3)) {
                parts.push(`- ${m.content ?? JSON.stringify(m)}`);
            }
        }

        if (ragContext?.length > 0) {
            parts.push('\nRELEVANT DOCUMENTS:');
            for (const doc of ragContext.slice(0, 3)) {
                parts.push(`- ${doc.content?.substring(0, 200) ?? doc.text?.substring(0, 200) ?? ''}`);
            }
        }

        return parts.join('\n');
    }

    /**
     * Build constraints string
     * @private
     */
    _buildConstraintsString(constraints) {
        const parts = [];

        if (constraints.budgetLimit) {
            parts.push(`Budget Limit: $${constraints.budgetLimit.toLocaleString()}`);
        }
        if (constraints.timeHorizon) {
            parts.push(`Time Horizon: ${constraints.timeHorizon}`);
        }
        if (constraints.mustInclude?.length > 0) {
            parts.push(`Must Include: ${constraints.mustInclude.join(', ')}`);
        }
        if (constraints.mustExclude?.length > 0) {
            parts.push(`Must Exclude: ${constraints.mustExclude.join(', ')}`);
        }

        return parts.join('\n');
    }

    /**
     * Parse LLM response into options array
     * @private
     */
    _parseOptions(response) {
        try {
            // Handle case where response is an object (some LLMs return structured data)
            let text = response;
            if (typeof response === 'object') {
                text = response.content ?? response.text ?? response.response ?? JSON.stringify(response);
            }

            // Ensure we have a string
            if (typeof text !== 'string') {
                text = String(text);
            }

            // Try to extract JSON array from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((opt, i) => ({
                        id: `opt_llm_${Date.now()}_${i}`,
                        title: opt.title ?? opt.Title ?? opt.name ?? opt.Name ?? `Option ${i + 1}`,
                        description: opt.description ?? opt.Description ?? opt.desc ?? '',
                        pros: Array.isArray(opt.pros ?? opt.Pros) ? (opt.pros ?? opt.Pros) : [],
                        cons: Array.isArray(opt.cons ?? opt.Cons) ? (opt.cons ?? opt.Cons) : [],
                        estimatedCost: this._parseCost(opt.estimatedCost ?? opt.estimated_cost ?? opt.cost ?? 0),
                        timeToImplement: opt.timeToImplement ?? opt.time_to_implement ?? opt.timeline ?? 'Unknown',
                        riskLevel: (opt.riskLevel ?? opt.risk_level ?? opt.risk ?? 'medium').toLowerCase(),
                        assumptions: Array.isArray(opt.assumptions ?? opt.Assumptions) ? (opt.assumptions ?? opt.Assumptions) : [],
                        generatedAt: new Date().toISOString(),
                        source: 'llm',
                    }));
                }
            }

            // If no JSON array found, try to parse structured text response
            // Many smaller models output numbered lists instead of JSON
            const options = this._parseTextOptions(text);
            if (options.length > 0) {
                return options;
            }

        } catch (error) {
            this.log.warn('Failed to parse LLM options response', { error: error.message });
        }

        return [];
    }

    /**
     * Parse cost from various formats
     * @private
     */
    _parseCost(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const num = parseFloat(value.replace(/[^0-9.]/g, ''));
            return isNaN(num) ? 0 : num;
        }
        return 0;
    }

    /**
     * Parse options from text format (for local LLMs that don't output JSON)
     * Expected format:
     * OPTION 1: [Title]
     * ACTION: [Description]
     * COST: [Amount]
     * RISK: [low/medium/high]
     * TIMELINE: [Duration]
     * @private
     */
    _parseTextOptions(text) {
        const options = [];

        // Split by OPTION markers
        const optionBlocks = text.split(/OPTION\s*\d+\s*:/i);

        for (let i = 1; i < optionBlocks.length && options.length < 5; i++) {
            const block = optionBlocks[i];

            // Extract title (text before first newline or before ACTION:)
            const titleMatch = block.match(/^\s*([^\n]+?)(?=\n|ACTION:|$)/i);
            const title = titleMatch
                ? titleMatch[1].trim().replace(/^[:\s-[\]]+/, '').replace(/[\]]+$/, '')
                : `Option ${i}`;

            // Extract ACTION/description
            const actionMatch = block.match(/ACTION\s*:\s*([^\n]+(?:\n(?!COST|RISK|TIMELINE)[^\n]+)*)/i);
            const description = actionMatch
                ? actionMatch[1].trim().replace(/\[|\]/g, '')
                : title;

            // Extract COST
            const costMatch = block.match(/COST\s*:\s*([^\n]+)/i);
            const costStr = costMatch ? costMatch[1] : '0';
            const estimatedCost = this._parseCost(costStr);

            // Extract RISK
            const riskMatch = block.match(/RISK\s*:\s*(low|medium|high)/i);
            const riskLevel = riskMatch ? riskMatch[1].toLowerCase() : 'medium';

            // Extract TIMELINE
            const timeMatch = block.match(/TIMELINE\s*:\s*([^\n]+)/i);
            const timeToImplement = timeMatch
                ? timeMatch[1].trim().replace(/\[|\]/g, '')
                : 'Unknown';

            if (title && title.length > 2) {
                options.push({
                    id: `opt_llm_${Date.now()}_${i}`,
                    title: title.substring(0, 100),
                    description: description.substring(0, 500),
                    pros: [],
                    cons: [],
                    estimatedCost,
                    timeToImplement,
                    riskLevel,
                    assumptions: [],
                    generatedAt: new Date().toISOString(),
                    source: 'llm',
                });
            }
        }

        // Also try to extract recommendation if present
        if (options.length > 0) {
            const recMatch = text.match(/RECOMMENDATION\s*:\s*([^\n]+)/i);
            if (recMatch) {
                options[0].recommendation = recMatch[1].trim();
            }
        }

        return options;
    }
}

export default OptionGenerator;
