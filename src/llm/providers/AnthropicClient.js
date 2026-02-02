/**
 * Anthropic Provider
 * Implementation for Anthropic Claude API
 */

import { LLMClient } from '../LLMClient.js';

export class AnthropicClient extends LLMClient {
    /**
     * @param {Object} options
     * @param {string} options.apiKey - Anthropic API key
     * @param {string} options.model - Model name (claude-3-opus, claude-3-sonnet, etc.)
     * @param {string} options.baseUrl - API base URL
     */
    constructor(options = {}) {
        super({
            ...options,
            provider: 'anthropic',
            model: options.model ?? 'claude-3-sonnet-20240229',
        });
        this.baseUrl = options.baseUrl ?? 'https://api.anthropic.com/v1';
    }

    /**
     * Generate a completion
     * @param {string} prompt - The prompt text
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Anthropic API key not configured');
        }

        return this._withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            try {
                const response = await fetch(`${this.baseUrl}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: this.model,
                        max_tokens: options.maxTokens ?? 2000,
                        system: options.systemPrompt ?? 'You are a helpful assistant.',
                        messages: [
                            { role: 'user', content: prompt },
                        ],
                        temperature: options.temperature ?? 0.7,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(`Anthropic API error: ${error.error?.message ?? response.statusText}`);
                }

                const data = await response.json();
                return data.content[0]?.text ?? '';

            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Anthropic request timed out');
                }
                throw error;
            }
        });
    }
}

export default AnthropicClient;
