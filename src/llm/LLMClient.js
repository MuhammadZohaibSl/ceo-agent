/**
 * LLM Client Base Class
 * Abstract interface for LLM providers
 */

import logger from '../utils/logger.js';

/**
 * LLM Task types for routing decisions
 */
export const LLMTaskType = {
    OPTION_GENERATION: 'option_generation',    // Creative strategic thinking
    SUMMARIZATION: 'summarization',            // Condensing information
    ANALYSIS: 'analysis',                      // Deep analysis
    CLASSIFICATION: 'classification',          // Categorization tasks
    EXTRACTION: 'extraction',                  // Entity/info extraction
};

/**
 * Base LLM Client
 */
export class LLMClient {
    /**
     * @param {Object} options
     * @param {string} options.provider - Provider name
     * @param {string} options.model - Model identifier
     * @param {string} options.apiKey - API key
     * @param {number} options.timeout - Request timeout (ms)
     * @param {number} options.maxRetries - Max retry attempts
     */
    constructor(options = {}) {
        this.provider = options.provider ?? 'unknown';
        this.model = options.model ?? 'unknown';
        this.apiKey = options.apiKey ?? '';
        this.timeout = options.timeout ?? 30000;
        this.maxRetries = options.maxRetries ?? 3;
        this.log = logger.child({ component: `LLMClient:${this.provider}` });
    }

    /**
     * Generate a completion
     * @param {string} prompt - The prompt text
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, options = {}) {
        throw new Error('generate() must be implemented by provider');
    }

    /**
     * Generate with structured output (JSON)
     * @param {string} prompt - The prompt text
     * @param {Object} schema - Expected output schema
     * @returns {Promise<Object>} Parsed JSON object
     */
    async generateStructured(prompt, schema = {}) {
        const response = await this.generate(prompt, { expectJson: true });
        return this._parseJson(response);
    }

    /**
     * Check if client is configured
     * @returns {boolean}
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Get provider info
     * @returns {Object}
     */
    getInfo() {
        return {
            provider: this.provider,
            model: this.model,
            configured: this.isConfigured(),
        };
    }

    /**
     * Parse JSON from response
     * @protected
     */
    _parseJson(text) {
        try {
            // Try direct parse
            return JSON.parse(text);
        } catch {
            // Try to extract JSON from markdown code block
            const jsonMatch = text.match(/```json?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }

            // Try to find JSON object/array in text
            const objectMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (objectMatch) {
                return JSON.parse(objectMatch[0]);
            }

            throw new Error('Could not parse JSON from response');
        }
    }

    /**
     * Retry logic wrapper
     * @protected
     */
    async _withRetry(fn, retries = this.maxRetries) {
        let lastError;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                this.log.warn(`Attempt ${attempt}/${retries} failed`, {
                    error: error.message,
                });

                if (attempt < retries) {
                    // Exponential backoff
                    await this._sleep(Math.pow(2, attempt) * 100);
                }
            }
        }

        throw lastError;
    }

    /**
     * Sleep utility
     * @protected
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default LLMClient;
