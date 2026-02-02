/**
 * OpenAI Provider
 * Implementation for OpenAI API (GPT-4, GPT-3.5, etc.)
 */

import { LLMClient } from '../LLMClient.js';

export class OpenAIClient extends LLMClient {
    /**
     * @param {Object} options
     * @param {string} options.apiKey - OpenAI API key
     * @param {string} options.model - Model name (gpt-4, gpt-3.5-turbo, etc.)
     * @param {string} options.baseUrl - API base URL
     */
    constructor(options = {}) {
        super({
            ...options,
            provider: 'openai',
            model: options.model ?? 'gpt-4',
        });
        this.baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';
    }

    /**
     * Generate a completion
     * @param {string} prompt - The prompt text
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key not configured');
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
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            { role: 'system', content: options.systemPrompt ?? 'You are a helpful assistant.' },
                            { role: 'user', content: prompt },
                        ],
                        temperature: options.temperature ?? 0.7,
                        max_tokens: options.maxTokens ?? 2000,
                        response_format: options.expectJson ? { type: 'json_object' } : undefined,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(`OpenAI API error: ${error.error?.message ?? response.statusText}`);
                }

                const data = await response.json();
                return data.choices[0]?.message?.content ?? '';

            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('OpenAI request timed out');
                }
                throw error;
            }
        });
    }
}

export default OpenAIClient;
