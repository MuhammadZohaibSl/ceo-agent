/**
 * LLM Router
 * Routes requests to appropriate LLM providers
 * Implements dynamic health-based routing with failover
 */

import { HealthTracker } from './HealthTracker.js';
import { LLMTaskType } from './LLMClient.js';
import logger from '../utils/logger.js';

/**
 * Routing strategy
 */
export const RoutingStrategy = {
    BEST_AVAILABLE: 'best_available',   // Route to healthiest provider
    ROUND_ROBIN: 'round_robin',         // Distribute load evenly
    TASK_OPTIMIZED: 'task_optimized',   // Route based on task type
    COST_OPTIMIZED: 'cost_optimized',   // Prefer cheaper providers
};

/**
 * Provider preferences by task type
 */
const TASK_PREFERENCES = {
    [LLMTaskType.OPTION_GENERATION]: ['openai', 'anthropic', 'ollama'],
    [LLMTaskType.ANALYSIS]: ['anthropic', 'openai', 'ollama'],
    [LLMTaskType.SUMMARIZATION]: ['anthropic', 'openai', 'ollama'],
    [LLMTaskType.CLASSIFICATION]: ['openai', 'ollama', 'anthropic'],
    [LLMTaskType.EXTRACTION]: ['openai', 'anthropic', 'ollama'],
};

export class LLMRouter {
    /**
     * @param {Object} options
     * @param {Object.<string, LLMClient>} options.providers - Provider clients
     * @param {string} options.strategy - Routing strategy
     * @param {number} options.maxRetries - Max provider retries
     */
    constructor(options = {}) {
        this.providers = options.providers ?? {};
        this.strategy = options.strategy ?? RoutingStrategy.BEST_AVAILABLE;
        this.maxRetries = options.maxRetries ?? 2;

        this.healthTracker = new HealthTracker();
        this._roundRobinIndex = 0;

        this.log = logger.child({ component: 'LLMRouter' });

        // Initialize available providers
        this._initializeProviders();
    }

    /**
     * Route and execute a generation request
     * @param {string} prompt - The prompt text
     * @param {Object} options - Generation options
     * @param {string} options.taskType - Type of LLM task
     * @param {string} options.preferredProvider - Preferred provider
     * @returns {Promise<Object>} Response with provider info
     */
    async generate(prompt, options = {}) {
        const taskType = options.taskType ?? LLMTaskType.OPTION_GENERATION;
        const preferredProvider = options.preferredProvider;

        // Get ordered list of providers to try
        const providerOrder = this._selectProviders(taskType, preferredProvider);

        if (providerOrder.length === 0) {
            throw new Error('No LLM providers available');
        }

        let lastError;

        for (const providerName of providerOrder) {
            const provider = this.providers[providerName];
            if (!provider) continue;

            // Check if provider is available
            if (!this.healthTracker.isAvailable(providerName)) {
                this.log.debug('Skipping unavailable provider', { provider: providerName });
                continue;
            }

            try {
                const startTime = Date.now();

                const response = await provider.generate(prompt, options);

                const latencyMs = Date.now() - startTime;
                this.healthTracker.recordSuccess(providerName, latencyMs);

                this.log.info('LLM request completed', {
                    provider: providerName,
                    latencyMs,
                    taskType,
                });

                return {
                    response,
                    provider: providerName,
                    latencyMs,
                    healthScore: this.healthTracker.getScore(providerName),
                };

            } catch (error) {
                lastError = error;
                this.healthTracker.recordFailure(providerName, error.message);

                this.log.warn('Provider failed, trying next', {
                    provider: providerName,
                    error: error.message,
                });
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message ?? 'Unknown'}`);
    }

    /**
     * Generate with structured output
     * @param {string} prompt - The prompt text
     * @param {Object} schema - Expected output schema
     * @param {Object} options - Generation options
     * @returns {Promise<Object>}
     */
    async generateStructured(prompt, schema = {}, options = {}) {
        const result = await this.generate(prompt, { ...options, expectJson: true });

        // Try to parse JSON from response
        try {
            const parsed = this._parseJson(result.response);
            return {
                ...result,
                data: parsed,
            };
        } catch (error) {
            this.log.warn('Failed to parse structured response', { error: error.message });
            return {
                ...result,
                data: null,
                parseError: error.message,
            };
        }
    }

    /**
     * Add a new provider
     * @param {string} name - Provider name
     * @param {LLMClient} client - Provider client
     */
    addProvider(name, client) {
        this.providers[name] = client;
        this.log.info('Provider added', { provider: name });
    }

    /**
     * Remove a provider
     * @param {string} name - Provider name
     */
    removeProvider(name) {
        delete this.providers[name];
        this.healthTracker.reset(name);
        this.log.info('Provider removed', { provider: name });
    }

    /**
     * Get router status
     * @returns {Object}
     */
    getStatus() {
        const providers = {};

        for (const [name, client] of Object.entries(this.providers)) {
            providers[name] = {
                configured: client.isConfigured(),
                model: client.model,
                health: this.healthTracker.getStatus(name),
                score: this.healthTracker.getScore(name),
                available: this.healthTracker.isAvailable(name),
            };
        }

        return {
            strategy: this.strategy,
            providerCount: Object.keys(this.providers).length,
            availableCount: Object.values(providers).filter(p => p.available).length,
            providers,
            healthStats: this.healthTracker.getAll(),
        };
    }

    /**
     * Set routing strategy
     * @param {string} strategy - Routing strategy
     */
    setStrategy(strategy) {
        this.strategy = strategy;
        this.log.info('Routing strategy changed', { strategy });
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _initializeProviders() {
        const configured = [];
        const notConfigured = [];

        for (const [name, client] of Object.entries(this.providers)) {
            if (client.isConfigured()) {
                configured.push(name);
            } else {
                notConfigured.push(name);
            }
        }

        this.log.info('Providers initialized', { configured, notConfigured });
    }

    _selectProviders(taskType, preferredProvider) {
        // Start with configured and available providers
        const available = Object.entries(this.providers)
            .filter(([name, client]) => client.isConfigured() && this.healthTracker.isAvailable(name))
            .map(([name]) => name);

        if (available.length === 0) {
            return [];
        }

        // If preferred provider is specified and available, put it first
        if (preferredProvider && available.includes(preferredProvider)) {
            return [preferredProvider, ...available.filter(p => p !== preferredProvider)];
        }

        // Apply strategy
        switch (this.strategy) {
            case RoutingStrategy.TASK_OPTIMIZED:
                return this._orderByTaskPreference(available, taskType);

            case RoutingStrategy.ROUND_ROBIN:
                return this._orderByRoundRobin(available);

            case RoutingStrategy.COST_OPTIMIZED:
                return this._orderByCost(available);

            case RoutingStrategy.BEST_AVAILABLE:
            default:
                return this._orderByHealth(available);
        }
    }

    _orderByHealth(providers) {
        return [...providers].sort((a, b) => {
            const scoreA = this.healthTracker.getScore(a);
            const scoreB = this.healthTracker.getScore(b);
            return scoreB - scoreA;
        });
    }

    _orderByTaskPreference(providers, taskType) {
        const preferences = TASK_PREFERENCES[taskType] ?? [];

        return [...providers].sort((a, b) => {
            const indexA = preferences.indexOf(a);
            const indexB = preferences.indexOf(b);

            // If both are in preferences, sort by preference order
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // Prefer providers that are in preferences
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            // Fall back to health score
            return this.healthTracker.getScore(b) - this.healthTracker.getScore(a);
        });
    }

    _orderByRoundRobin(providers) {
        // Rotate through providers
        const result = [];
        for (let i = 0; i < providers.length; i++) {
            const index = (this._roundRobinIndex + i) % providers.length;
            result.push(providers[index]);
        }
        this._roundRobinIndex = (this._roundRobinIndex + 1) % providers.length;
        return result;
    }

    _orderByCost(providers) {
        // Simple cost ordering (can be enhanced with actual pricing)
        const costOrder = ['ollama', 'openai', 'anthropic'];
        return [...providers].sort((a, b) => {
            return costOrder.indexOf(a) - costOrder.indexOf(b);
        });
    }

    _parseJson(text) {
        try {
            return JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/```json?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
            const objectMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (objectMatch) {
                return JSON.parse(objectMatch[0]);
            }
            throw new Error('Could not parse JSON from response');
        }
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {LLMRouter}
 */
export function createLLMRouter(options = {}) {
    return new LLMRouter(options);
}

export default LLMRouter;
