/**
 * Agent Lifecycle
 * Implements: PERCEIVE → THINK → PLAN → PROPOSE_DECISION → REFLECT
 * 
 * This is the core execution loop. Each stage has clear responsibilities:
 * - PERCEIVE: Gather context (memory, RAG, constraints)
 * - THINK: Generate options using LLM
 * - PLAN: Evaluate options deterministically, assess risks
 * - PROPOSE: Format final recommendation (NO EXECUTION)
 * - REFLECT: Store learnings, log audit
 */

import { Stage } from './Context.js';
import logger from '../utils/logger.js';
import { LoopDetectedError, InsufficientDataError } from '../utils/errors.js';

/**
 * Lifecycle executor
 */
export class Lifecycle {
    /**
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.memoryManager - Memory system
     * @param {Object} dependencies.ragEngine - RAG retrieval
     * @param {Object} dependencies.optionGenerator - LLM-based option generator
     * @param {Object} dependencies.optionEvaluator - Deterministic evaluator
     * @param {Object} dependencies.riskModel - Risk assessment rules
     * @param {Object} dependencies.decisionFormatter - Output formatter
     * @param {Object} dependencies.safetyGuard - Safety checks
     * @param {Object} config - Agent configuration
     */
    constructor(dependencies, config) {
        this.deps = dependencies;
        this.config = config;
        this.maxIterations = config.agent?.maxIterations ?? 5;
        this.log = logger.child({ component: 'Lifecycle' });
    }

    /**
     * Execute the full lifecycle
     * @param {Context} ctx - Agent context
     * @returns {Promise<Context>} Updated context with proposal
     */
    async execute(ctx) {
        this.log.info('Starting lifecycle execution', { contextId: ctx.id, query: ctx.query });

        try {
            // Stage 1: PERCEIVE
            await this._perceive(ctx);

            // Stage 2: THINK
            await this._think(ctx);

            // Stage 3: PLAN
            await this._plan(ctx);

            // Stage 4: PROPOSE_DECISION
            await this._propose(ctx);

            // Stage 5: REFLECT
            await this._reflect(ctx);

            ctx.setStage(Stage.COMPLETE);
            this.log.info('Lifecycle completed successfully', { contextId: ctx.id });

        } catch (error) {
            ctx.setStage(Stage.ERROR);
            ctx.addError(error);
            this.log.error('Lifecycle failed', { contextId: ctx.id, error: error.message });
            throw error;
        }

        return ctx;
    }

    // ─────────────────────────────────────────────────────────────
    // PERCEIVE: Gather all context before reasoning
    // ─────────────────────────────────────────────────────────────

    async _perceive(ctx) {
        ctx.setStage(Stage.PERCEIVE);
        this.log.debug('PERCEIVE stage starting', { contextId: ctx.id });

        // 1. Load relevant memory
        if (this.deps.memoryManager) {
            const memories = await this.deps.memoryManager.retrieve(ctx.query, {
                limit: 10,
                minRelevance: 0.5,
            });
            ctx.addMemory(memories);
        }

        // 2. Retrieve RAG context with policy enforcement
        if (this.deps.ragEngine) {
            const ragDocs = await this.deps.ragEngine.retrieve(ctx.query, {
                maxTokens: ctx.contextPolicy.maxTokenBudget ?? 4000,
                minSimilarity: ctx.contextPolicy.minSimilarityScore ?? 0.7,
                maxDocuments: ctx.contextPolicy.maxRetrievedDocuments ?? 5,
            });
            ctx.addRagContext(ragDocs);

            // Handle low quality retrieval
            if (ragDocs.length === 0) {
                const policy = ctx.contextPolicy.onNoRetrieval ?? 'proceed_without_context';
                if (policy === 'fail') {
                    throw new InsufficientDataError(['relevant_documents']);
                }
                this.log.warn('No RAG context retrieved', { contextId: ctx.id, policy });
            }
        }

        // 3. Validate we have minimum required data
        this._validatePerception(ctx);

        this.log.debug('PERCEIVE stage complete', {
            contextId: ctx.id,
            memoryCount: ctx.memory.length,
            ragCount: ctx.ragContext.length,
        });
    }

    _validatePerception(ctx) {
        const missing = [];

        // Check if query is substantive
        if (!ctx.query || ctx.query.trim().length < 10) {
            missing.push('substantive_query');
        }

        // If critical context is required but missing, fail
        if (missing.length > 0 && ctx.contextPolicy.onNoRetrieval === 'fail') {
            throw new InsufficientDataError(missing);
        }

        if (missing.length > 0) {
            ctx.addMissingData(missing);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // THINK: Generate options using LLM
    // ─────────────────────────────────────────────────────────────

    async _think(ctx) {
        ctx.setStage(Stage.THINK);
        ctx.incrementIteration();
        this.log.debug('THINK stage starting', { contextId: ctx.id, iteration: ctx.iteration });

        // Loop guard
        if (ctx.iteration > this.maxIterations) {
            throw new LoopDetectedError(ctx.iteration, 0);
        }

        // Generate options via LLM
        if (this.deps.optionGenerator) {
            const options = await this.deps.optionGenerator.generate({
                query: ctx.query,
                memory: ctx.memory,
                ragContext: ctx.ragContext,
                constraints: ctx.constraints,
                decisionPolicy: ctx.decisionPolicy,
            });

            // Filter options that violate ethical red lines
            const filteredOptions = this._filterByRedLines(options, ctx.decisionPolicy);
            ctx.setOptions(filteredOptions);

            if (filteredOptions.length === 0) {
                ctx.addMissingData(['viable_options']);
                this.log.warn('All options filtered due to policy violations', { contextId: ctx.id });
            }
        } else {
            // Placeholder when no generator is available
            ctx.setOptions([]);
            ctx.addMissingData(['option_generator']);
        }

        this.log.debug('THINK stage complete', { contextId: ctx.id, optionCount: ctx.options.length });
    }

    _filterByRedLines(options, policy) {
        const redLines = policy.ethicalRedLines ?? [];
        if (redLines.length === 0) return options;

        return options.filter(option => {
            const violations = redLines.filter(line =>
                option.violates?.includes(line) ||
                option.description?.toLowerCase().includes(line.replace(/_/g, ' '))
            );
            return violations.length === 0;
        });
    }

    // ─────────────────────────────────────────────────────────────
    // PLAN: Evaluate options and assess risks (DETERMINISTIC)
    // ─────────────────────────────────────────────────────────────

    async _plan(ctx) {
        ctx.setStage(Stage.PLAN);
        this.log.debug('PLAN stage starting', { contextId: ctx.id });

        // 1. Evaluate options deterministically
        if (this.deps.optionEvaluator && ctx.options.length > 0) {
            const evaluations = await this.deps.optionEvaluator.evaluate(ctx.options, {
                constraints: ctx.constraints,
                decisionPolicy: ctx.decisionPolicy,
            });
            ctx.setEvaluations(evaluations);
        }

        // 2. Assess risks using rule-based model
        if (this.deps.riskModel && ctx.options.length > 0) {
            const risks = await this.deps.riskModel.assess(ctx.options, ctx.evaluations, {
                riskAppetite: ctx.decisionPolicy.riskAppetite ?? 0.5,
            });
            ctx.setRisks(risks);
        }

        // 3. Safety checks
        if (this.deps.safetyGuard) {
            await this.deps.safetyGuard.check(ctx);
        }

        this.log.debug('PLAN stage complete', {
            contextId: ctx.id,
            evaluationCount: ctx.evaluations.length,
            riskCategories: Object.keys(ctx.risks),
        });
    }

    // ─────────────────────────────────────────────────────────────
    // PROPOSE_DECISION: Format final output (NO EXECUTION)
    // ─────────────────────────────────────────────────────────────

    async _propose(ctx) {
        ctx.setStage(Stage.PROPOSE);
        this.log.debug('PROPOSE_DECISION stage starting', { contextId: ctx.id });

        let proposal;

        if (this.deps.decisionFormatter) {
            proposal = await this.deps.decisionFormatter.format({
                query: ctx.query,
                options: ctx.options,
                evaluations: ctx.evaluations,
                risks: ctx.risks,
                constraints: ctx.constraints,
                missingData: ctx.missingData,
            });
        } else {
            // Default proposal structure
            const rankedOptions = this._rankOptions(ctx.evaluations);
            const confidence = this._calculateConfidence(ctx);

            proposal = {
                recommendation: rankedOptions[0] ?? null,
                alternatives: rankedOptions.slice(1),
                risks: ctx.risks,
                confidence,
                assumptions: ctx.assumptions,
                missingData: ctx.missingData,
                requiresHumanApproval: confidence < this.config.agent?.confidenceThreshold ||
                    this._isHighRisk(ctx.risks),
                generatedAt: new Date().toISOString(),
            };
        }

        ctx.setProposal(proposal);
        ctx.setConfidence(proposal.confidence);

        this.log.debug('PROPOSE_DECISION stage complete', {
            contextId: ctx.id,
            confidence: proposal.confidence,
            requiresApproval: proposal.requiresHumanApproval,
        });
    }

    _rankOptions(evaluations) {
        return [...evaluations]
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .map(e => e.option ?? e);
    }

    _calculateConfidence(ctx) {
        let confidence = 1.0;

        // Reduce confidence for missing data
        confidence -= ctx.missingData.length * 0.1;

        // Reduce confidence for low context
        if (ctx.memory.length === 0 && ctx.ragContext.length === 0) {
            confidence -= 0.2;
        }

        // Reduce confidence for few options
        if (ctx.options.length < 2) {
            confidence -= 0.15;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    _isHighRisk(risks) {
        const threshold = 0.7;
        return Object.values(risks).some(score => score > threshold);
    }

    // ─────────────────────────────────────────────────────────────
    // REFLECT: Store learnings and log for audit
    // ─────────────────────────────────────────────────────────────

    async _reflect(ctx) {
        ctx.setStage(Stage.REFLECT);
        this.log.debug('REFLECT stage starting', { contextId: ctx.id });

        // 1. Store interaction in memory
        if (this.deps.memoryManager) {
            await this.deps.memoryManager.store({
                query: ctx.query,
                proposal: ctx.proposal,
                timestamp: new Date().toISOString(),
            });
        }

        // 2. Log full audit trail
        this.log.info('Decision proposal complete', {
            contextId: ctx.id,
            confidence: ctx.confidence,
            optionCount: ctx.options.length,
            hasRecommendation: !!ctx.proposal?.recommendation,
            requiresApproval: ctx.proposal?.requiresHumanApproval,
        });

        this.log.debug('REFLECT stage complete', { contextId: ctx.id });
    }
}

export default Lifecycle;
