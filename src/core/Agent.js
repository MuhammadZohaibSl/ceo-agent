/**
 * Agent Orchestrator
 * Main entry point for the CEO-Level AI Agent
 * Wires dependencies and delegates to Lifecycle
 */

import config from '../config/index.js';
import { Context } from './Context.js';
import { Lifecycle } from './Lifecycle.js';
import logger from '../utils/logger.js';

/**
 * CEO Agent class
 */
export class Agent {
    /**
     * @param {Object} options - Agent options
     * @param {Object} options.memoryManager - Memory system instance
     * @param {Object} options.ragEngine - RAG engine instance
     * @param {Object} options.optionGenerator - LLM option generator
     * @param {Object} options.optionEvaluator - Deterministic evaluator
     * @param {Object} options.riskModel - Risk assessment model
     * @param {Object} options.decisionFormatter - Output formatter
     * @param {Object} options.safetyGuard - Safety guard instance
     */
    constructor(options = {}) {
        this.dependencies = {
            memoryManager: options.memoryManager ?? null,
            ragEngine: options.ragEngine ?? null,
            optionGenerator: options.optionGenerator ?? null,
            optionEvaluator: options.optionEvaluator ?? null,
            riskModel: options.riskModel ?? null,
            decisionFormatter: options.decisionFormatter ?? null,
            safetyGuard: options.safetyGuard ?? null,
        };

        this.lifecycle = new Lifecycle(this.dependencies, config);
        this.log = logger.child({ component: 'Agent' });

        this.log.info('Agent initialized', {
            dependencies: Object.keys(this.dependencies).filter(k => this.dependencies[k] !== null),
        });
    }

    /**
     * Process a query and generate a decision proposal
     * @param {string} query - User query
     * @param {Object} options - Request options
     * @param {Object} options.constraints - Pre-decision constraints from human
     * @returns {Promise<Object>} Decision proposal
     */
    async process(query, options = {}) {
        this.log.info('Processing query', { query: query.substring(0, 100) });

        // Create context with policies and constraints
        const ctx = new Context({
            query,
            constraints: options.constraints ?? {},
            decisionPolicy: config.policies.decision,
            contextPolicy: config.policies.context,
        });

        // Execute lifecycle
        await this.lifecycle.execute(ctx);

        // Return the proposal (never auto-execute)
        return {
            id: ctx.id,
            proposal: ctx.proposal,
            auditLog: ctx.auditLog,
        };
    }

    /**
     * Process with explicit constraints
     * @param {string} query - User query
     * @param {Object} constraints - Human-provided constraints
     * @returns {Promise<Object>} Decision proposal
     */
    async processWithConstraints(query, constraints) {
        return this.process(query, { constraints });
    }

    /**
     * Get agent status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            ready: true,
            dependencies: Object.entries(this.dependencies).reduce((acc, [key, value]) => {
                acc[key] = value !== null ? 'connected' : 'not_configured';
                return acc;
            }, {}),
            config: {
                maxIterations: config.agent.maxIterations,
                confidenceThreshold: config.agent.confidenceThreshold,
            },
        };
    }
}

/**
 * Factory function to create agent with dependencies
 * @param {Object} dependencies - Inject dependencies
 * @returns {Agent} Configured agent instance
 */
export function createAgent(dependencies = {}) {
    return new Agent(dependencies);
}

export default Agent;
