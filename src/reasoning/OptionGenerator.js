/**
 * Option Generator
 * LLM-driven idea generation for CEO decisions
 * Generates strategic options based on query, context, and constraints
 */

import logger from '../utils/logger.js';

/**
 * Enhanced CEO Decision-Making Prompt
 * Generates comprehensive strategic options with all required fields
 */
const OPTION_GENERATION_PROMPT = `You are an experienced CEO advisor helping with strategic decisions.

## BUSINESS QUESTION
{{query}}

## CONTEXT
{{context}}

## CONSTRAINTS
- Budget: {{budget}}
- Timeline: {{timeline}}

## YOUR TASK
Analyze this question and provide exactly 3 strategic options. Be specific and realistic.

For each option, provide:
1. A clear, actionable title
2. Detailed description of what to do (2-3 sentences)
3. Estimated cost in USD (give a specific number or range like "50000-100000")
4. Risk level: low, medium, or high
5. Implementation timeline
6. 3 specific benefits of this approach
7. 3 specific risks or drawbacks
8. 2-3 key assumptions that must be true for success

## RESPONSE FORMAT
Respond in exactly this format:

---OPTION 1---
TITLE: [Clear action-oriented title]
DESCRIPTION: [2-3 sentences explaining the approach]
COST: [Number in USD, e.g., 150000]
RISK: [low/medium/high]
TIMELINE: [e.g., 3-6 months]
BENEFITS:
- [Specific benefit 1]
- [Specific benefit 2]
- [Specific benefit 3]
RISKS:
- [Specific risk 1]
- [Specific risk 2]
- [Specific risk 3]
ASSUMPTIONS:
- [Key assumption 1]
- [Key assumption 2]

---OPTION 2---
[Same format as above]

---OPTION 3---
[Same format as above]

---RECOMMENDATION---
BEST_OPTION: [1, 2, or 3]
REASONING: [One paragraph explaining why this option is best]`;

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
     * @returns {Promise<{options: Object[], provider: string}>} Generated options and provider used
     */
    async generate(params) {
        const { query, memory = [], ragContext = [], constraints = {}, decisionPolicy = {} } = params;

        this.log.debug('Generating options', { query: query.substring(0, 50) });

        // If LLM client is available, use it
        if (this.llmClient) {
            return this._generateWithLLM(params);
        }

        // Otherwise, use rule-based generation
        const options = this._generateRuleBased(params);
        return { options, provider: 'rule-based' };
    }

    /**
     * Generate options using LLM
     * @private
     * @returns {Promise<{options: Object[], provider: string}>}
     */
    async _generateWithLLM(params) {
        const { query, memory, ragContext, constraints, preferredProvider } = params;

        // Build concise context for small LLMs
        const contextStr = this._buildContextString(memory, ragContext);
        const budget = constraints?.budgetLimit
            ? `$${constraints.budgetLimit.toLocaleString()}`
            : 'Flexible';
        const timeline = constraints?.timeHorizon ?? '6-12 months';

        // Build comprehensive prompt for OpenRouter LLMs
        const prompt = OPTION_GENERATION_PROMPT
            .replace('{{query}}', query)
            .replace('{{context}}', contextStr || 'A growing technology company evaluating strategic decisions')
            .replace('{{budget}}', budget)
            .replace('{{timeline}}', timeline);

        try {
            this.log.info('Sending prompt to LLM', { promptLength: prompt.length, preferredProvider });
            const llmResult = await this.llmClient.generate(prompt, { preferredProvider });

            // Extract provider info from response (LLMRouter returns {response, provider, ...})
            const actualProvider = llmResult?.provider ?? preferredProvider ?? 'unknown';
            const responseContent = llmResult?.response ?? llmResult;

            // Log raw response for debugging
            const responseStr = typeof responseContent === 'object'
                ? (responseContent.response ?? responseContent.content ?? JSON.stringify(responseContent))
                : responseContent;
            this.log.info('LLM raw response received', {
                responseLength: responseStr?.length,
                provider: actualProvider,
                preview: responseStr?.substring(0, 200)
            });

            const options = this._parseOptions(responseContent);

            this.log.info('Options generated via LLM', { count: options.length, provider: actualProvider });

            // If parsing failed, fall back to rules
            if (options.length === 0) {
                this.log.warn('LLM response parsing yielded 0 options, using rules', {
                    rawResponse: responseStr?.substring(0, 500)
                });
                const ruleOptions = this._generateRuleBased(params);
                return { options: ruleOptions, provider: 'rule-based' };
            }

            return { options, provider: actualProvider };
        } catch (error) {
            this.log.error('LLM generation failed, falling back to rule-based', { error: error.message });
            const ruleOptions = this._generateRuleBased(params);
            return { options: ruleOptions, provider: 'rule-based' };
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
     * Parse cost from various formats (handles ranges like "50000-100000")
     * @private
     */
    _parseCost(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            // Handle ranges like "50000-100000" by taking the average
            const rangeMatch = value.match(/(\d[\d,]*)\s*[-–to]+\s*(\d[\d,]*)/i);
            if (rangeMatch) {
                const low = parseFloat(rangeMatch[1].replace(/,/g, ''));
                const high = parseFloat(rangeMatch[2].replace(/,/g, ''));
                if (!isNaN(low) && !isNaN(high)) {
                    return Math.round((low + high) / 2);
                }
            }
            // Handle single values
            const num = parseFloat(value.replace(/[^0-9.]/g, ''));
            return isNaN(num) ? 0 : Math.round(num);
        }
        return 0;
    }

    /**
     * Parse options from text format (for LLMs that output structured text)
     * Enhanced format includes BENEFITS, RISKS, and ASSUMPTIONS sections
     * @private
     */
    _parseTextOptions(text) {
        const options = [];

        // Split by OPTION markers (handles both "---OPTION 1---" and "OPTION 1:")
        const optionBlocks = text.split(/---OPTION\s*\d+---|OPTION\s*\d+\s*:/i);

        for (let i = 1; i < optionBlocks.length && options.length < 5; i++) {
            const block = optionBlocks[i];

            // Extract TITLE
            const titleMatch = block.match(/TITLE\s*:\s*([^\n]+)/i) ||
                block.match(/^\s*([^\n]+?)(?=\n|DESCRIPTION:|ACTION:|$)/i);
            const title = titleMatch
                ? titleMatch[1].trim().replace(/^[:\s\-\[\]]+/, '').replace(/[\]]+$/, '').replace(/\*+/g, '')
                : `Option ${i}`;

            // Extract DESCRIPTION/ACTION
            const descMatch = block.match(/DESCRIPTION\s*:\s*([^\n]+(?:\n(?!COST|RISK|TIMELINE|BENEFITS|ASSUMPTIONS)[^\n]+)*)/i) ||
                block.match(/ACTION\s*:\s*([^\n]+(?:\n(?!COST|RISK|TIMELINE)[^\n]+)*)/i);
            const description = descMatch
                ? descMatch[1].trim().replace(/\[|\]/g, '').replace(/\*+/g, '')
                : title;

            // Extract COST
            const costMatch = block.match(/COST\s*:\s*([^\n]+)/i);
            const costStr = costMatch ? costMatch[1] : '0';
            const estimatedCost = this._parseCost(costStr);

            // Extract RISK level
            const riskMatch = block.match(/RISK\s*:\s*(low|medium|high)/i);
            const riskLevel = riskMatch ? riskMatch[1].toLowerCase() : 'medium';

            // Extract TIMELINE
            const timeMatch = block.match(/TIMELINE\s*:\s*([^\n]+)/i);
            const timeToImplement = timeMatch
                ? timeMatch[1].trim().replace(/\[|\]/g, '').replace(/\*+/g, '')
                : 'Unknown';

            // Extract BENEFITS (pros)
            const benefits = this._extractListItems(block, 'BENEFITS');

            // Extract RISKS (cons)
            const risks = this._extractListItems(block, 'RISKS');

            // Extract ASSUMPTIONS
            const assumptions = this._extractListItems(block, 'ASSUMPTIONS');

            if (title && title.length > 2) {
                options.push({
                    id: `opt_llm_${Date.now()}_${i}`,
                    title: title.substring(0, 100),
                    description: description.substring(0, 500),
                    pros: benefits.length > 0 ? benefits : [],
                    cons: risks.length > 0 ? risks : [],
                    estimatedCost,
                    timeToImplement,
                    riskLevel,
                    assumptions: assumptions.length > 0 ? assumptions : [],
                    generatedAt: new Date().toISOString(),
                    source: 'llm',
                });
            }
        }

        // Extract recommendation if present
        if (options.length > 0) {
            const recMatch = text.match(/---RECOMMENDATION---|RECOMMENDATION\s*:/i);
            if (recMatch) {
                const recSection = text.substring(recMatch.index);
                const bestMatch = recSection.match(/BEST_OPTION\s*:\s*(\d)/i);
                const reasonMatch = recSection.match(/REASONING\s*:\s*([^\n]+(?:\n(?!---|$)[^\n]+)*)/i);

                if (bestMatch) {
                    const bestOptionIndex = parseInt(bestMatch[1]) - 1;
                    if (bestOptionIndex >= 0 && bestOptionIndex < options.length) {
                        options[bestOptionIndex].isRecommended = true;
                        if (reasonMatch) {
                            options[bestOptionIndex].recommendationReason = reasonMatch[1].trim();
                        }
                    }
                }
            }
        }

        return options;
    }

    /**
     * Extract list items from a section (BENEFITS:, RISKS:, ASSUMPTIONS:)
     * @private
     */
    _extractListItems(block, sectionName) {
        const items = [];
        const sectionRegex = new RegExp(`${sectionName}\\s*:([\\s\\S]*?)(?=\\n[A-Z]+:|---OPTION|---RECOMMENDATION|$)`, 'i');
        const sectionMatch = block.match(sectionRegex);

        if (sectionMatch) {
            const lines = sectionMatch[1].split('\n');
            for (const line of lines) {
                // Match lines starting with -, *, or numbers
                const itemMatch = line.match(/^\s*[-*•\d.]+\s*(.+)/i);
                if (itemMatch) {
                    const item = itemMatch[1].trim().replace(/\[|\]/g, '').replace(/\*+/g, '');
                    if (item.length > 3) {
                        items.push(item.substring(0, 200));
                    }
                }
            }
        }
        return items.slice(0, 5); // Max 5 items per list
    }
}

export default OptionGenerator;
