/**
 * Ollama Provider
 * Implementation for local Ollama API
 */

import { LLMClient } from '../LLMClient.js';

export class OllamaClient extends LLMClient {
    /**
     * @param {Object} options
     * @param {string} options.model - Model name (llama2, mistral, etc.)
     * @param {string} options.baseUrl - Ollama server URL
     */
    constructor(options = {}) {
        super({
            ...options,
            provider: 'ollama',
            model: options.model ?? 'llama2',
            apiKey: 'local', // Ollama doesn't need API key
        });
        this.baseUrl = options.baseUrl ?? 'http://localhost:11434';
    }

    /**
     * Check if Ollama is available
     * @returns {boolean}
     */
    isConfigured() {
        return true; // Ollama runs locally, always "configured"
    }

    /**
     * Generate a completion
     * @param {string} prompt - The prompt text
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, options = {}) {
        return this._withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            try {
                const response = await fetch(`${this.baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: this.model,
                        prompt: options.systemPrompt
                            ? `${options.systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
                            : prompt,
                        stream: false,
                        options: {
                            temperature: options.temperature ?? 0.7,
                            num_predict: options.maxTokens ?? 2000,
                        },
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Ollama API error: ${response.statusText}`);
                }

                const data = await response.json();
                return data.response ?? '';

            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Ollama request timed out');
                }
                throw error;
            }
        });
    }

    /**
     * Check if Ollama server is reachable
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

export default OllamaClient;
