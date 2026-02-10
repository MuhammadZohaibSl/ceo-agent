/**
 * OpenRouter Provider
 * Implementation for OpenRouter API - Access to multiple free open-source LLMs
 * https://openrouter.ai
 */

import { LLMClient } from '../LLMClient.js';

export class OpenRouterClient extends LLMClient {
    /**
     * @param {Object} options
     * @param {string} options.apiKey - OpenRouter API key
     * @param {string} options.model - Model name (e.g., 'openrouter/auto', 'meta-llama/llama-3.3-70b-instruct:free')
     * @param {string} options.siteUrl - Your site URL for OpenRouter tracking
     * @param {string} options.siteName - Your app name for OpenRouter tracking
     */
    constructor(options = {}) {
        super({
            ...options,
            provider: 'openrouter',
            model: options.model ?? 'openrouter/auto',
        });
        this.baseUrl = 'https://openrouter.ai/api/v1';
        this.siteUrl = options.siteUrl ?? 'http://localhost:3000';
        this.siteName = options.siteName ?? 'CEO Agent';
    }

    /**
     * Check if OpenRouter is configured
     * @returns {boolean}
     */
    isConfigured() {
        return !!this.apiKey && this.apiKey.startsWith('sk-or-');
    }

    /**
     * Generate a completion
     * @param {string} prompt - The prompt text
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('OpenRouter API key not configured');
        }

        return this._withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            try {
                const response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': this.siteUrl,
                        'X-Title': this.siteName,
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            { role: 'system', content: options.systemPrompt ?? 'You are a helpful strategic advisor.' },
                            { role: 'user', content: prompt },
                        ],
                        temperature: options.temperature ?? 0.7,
                        max_tokens: options.maxTokens ?? 2000,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(`OpenRouter API error: ${error.error?.message ?? response.statusText}`);
                }

                const data = await response.json();

                // Log which model was actually used (useful for 'openrouter/auto')
                if (data.model && data.model !== this.model) {
                    this.log.debug('OpenRouter routed request', {
                        requested: this.model,
                        used: data.model
                    });
                }

                return data.choices[0]?.message?.content ?? '';

            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('OpenRouter request timed out');
                }
                throw error;
            }
        });
    }

    /**
     * Health check - verify API is reachable
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get list of available models
     * @returns {Promise<Array>}
     */
    async getAvailableModels() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            // Filter for free models
            return data.data?.filter(m => m.id.includes(':free')) ?? [];
        } catch {
            return [];
        }
    }
}

export default OpenRouterClient;
