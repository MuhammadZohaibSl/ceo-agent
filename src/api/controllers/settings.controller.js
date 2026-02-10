/**
 * Settings Controller
 * Handles LLM settings API endpoints
 */

import agentService from '../services/agent.service.js';
import logger from '../../utils/logger.js';

// LLM Settings (user preferences)
let llmSettings = {
    defaultProvider: 'auto',
    availableProviders: ['auto', 'groq', 'openrouter'],
};

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data));
}

function getBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(body));
    });
}

function parseJSON(body) {
    try {
        return JSON.parse(body);
    } catch {
        return null;
    }
}

// GET /api/settings/llm
async function getLLMSettings(req, res) {
    const llmRouter = agentService.getLLMRouter();
    const llmStatus = llmRouter.getStatus();

    sendJSON(res, 200, {
        success: true,
        data: {
            defaultProvider: llmSettings.defaultProvider,
            availableProviders: llmSettings.availableProviders,
            providers: llmStatus.providers,
        },
    });
}

// PUT /api/settings/llm
async function updateLLMSettings(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data) {
        return sendJSON(res, 400, { success: false, error: 'Invalid request body' });
    }

    if (data.defaultProvider) {
        if (!llmSettings.availableProviders.includes(data.defaultProvider)) {
            return sendJSON(res, 400, {
                success: false,
                error: `Invalid provider. Available: ${llmSettings.availableProviders.join(', ')}`
            });
        }
        llmSettings.defaultProvider = data.defaultProvider;
        logger.info('LLM default provider updated', { provider: data.defaultProvider });
    }

    sendJSON(res, 200, {
        success: true,
        data: {
            defaultProvider: llmSettings.defaultProvider,
            availableProviders: llmSettings.availableProviders,
        },
    });
}

export const settingsController = {
    getLLMSettings,
    updateLLMSettings,
};

export default settingsController;
