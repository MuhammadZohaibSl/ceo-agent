/**
 * Chat Controller
 * Handles artifact chatbot interactions using LLM + RAG
 * 
 * POST /api/chat
 * Body: { selectedText, action?, userMessage?, conversationHistory? }
 * 
 * Actions: 'explain' | 'refine' | 'edit' | 'general'
 * Response: { reply, provider, suggestedEdit?, action, latencyMs }
 */

import { getBody, parseJSON, sendSuccess, sendError } from '../middleware/index.js';
import agentService from '../services/agent.service.js';
import logger from '../../utils/logger.js';

// ── Constants ───────────────────────────────────────────────────────────────
const VALID_ACTIONS = ['explain', 'refine', 'edit', 'general'];
const MAX_SELECTED_TEXT_LENGTH = 5000;
const MAX_USER_MESSAGE_LENGTH = 2000;
const MAX_CONVERSATION_HISTORY = 10;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;

// ── Prompt Builder ──────────────────────────────────────────────────────────

/**
 * Build the system prompt based on action type, selected text, and RAG context
 */
function buildSystemPrompt(action, selectedText, ragContext) {
    const contextBlock = ragContext && ragContext.length > 0
        ? `\n\nRelevant business context from your documents:\n${ragContext.map(doc => {
            const content = doc.content || doc.text || (typeof doc === 'string' ? doc : JSON.stringify(doc));
            return `- ${content.substring(0, 300)}`;
        }).join('\n')}`
        : '';

    const baseContext = `You are a strategic AI assistant for a CEO Agent platform. You help users work with analysis artifacts — the outputs of strategic pipeline analysis.${contextBlock}

The user has selected the following text from an analysis artifact:
"""
${selectedText}
"""`;

    switch (action) {
        case 'explain':
            return `${baseContext}

Your task: Explain this selected text clearly and thoroughly. Break down any strategic concepts, business implications, or technical terms. Be concise but insightful. Provide context about why this finding matters for executive decision-making. Use bullet points where helpful.`;

        case 'refine':
            return `${baseContext}

Your task: Refine and improve the selected text. Make it more precise, actionable, and professionally written for executive consumption. Return ONLY the refined text — no explanations, no commentary, no prefixes like "Here is the refined text:". The output should be a direct drop-in replacement for the original.`;

        case 'edit':
            return `${baseContext}

Your task: Edit the selected text based on the user's instructions. Return ONLY the edited text — no explanations, no commentary, no prefixes. The output should be a direct drop-in replacement for the original.`;

        default: // 'general'
            return `${baseContext}

Your task: Help the user with their question about the selected text. Be concise, insightful, and actionable. If the user asks you to improve or change the text, return ONLY the improved version so it can be used as a replacement.`;
    }
}

// ── Input Validation ────────────────────────────────────────────────────────

/**
 * Validate and sanitize the request payload.
 * Returns { valid: true, data } or { valid: false, error }
 */
function validateRequest(data) {
    if (!data) {
        return { valid: false, error: 'Invalid JSON body' };
    }

    // selectedText — required, non-empty string
    if (!data.selectedText || typeof data.selectedText !== 'string') {
        return { valid: false, error: 'Missing or invalid field: selectedText (must be a non-empty string)' };
    }

    const selectedText = data.selectedText.trim();
    if (selectedText.length === 0) {
        return { valid: false, error: 'selectedText cannot be empty' };
    }
    if (selectedText.length > MAX_SELECTED_TEXT_LENGTH) {
        return { valid: false, error: `selectedText exceeds maximum length of ${MAX_SELECTED_TEXT_LENGTH} characters` };
    }

    // action — optional, must be one of the valid actions
    const action = (data.action && typeof data.action === 'string')
        ? data.action.trim().toLowerCase()
        : 'general';

    if (!VALID_ACTIONS.includes(action)) {
        return { valid: false, error: `Invalid action: "${data.action}". Must be one of: ${VALID_ACTIONS.join(', ')}` };
    }

    // userMessage — optional string
    let userMessage = '';
    if (data.userMessage != null) {
        if (typeof data.userMessage !== 'string') {
            return { valid: false, error: 'userMessage must be a string' };
        }
        userMessage = data.userMessage.trim().substring(0, MAX_USER_MESSAGE_LENGTH);
    }

    // For 'edit' and 'general' actions, require a user message
    if ((action === 'edit' || action === 'general') && !userMessage) {
        return { valid: false, error: `userMessage is required for "${action}" action` };
    }

    // conversationHistory — optional array of { role, content }
    let conversationHistory = [];
    if (data.conversationHistory != null) {
        if (!Array.isArray(data.conversationHistory)) {
            return { valid: false, error: 'conversationHistory must be an array' };
        }
        conversationHistory = data.conversationHistory
            .filter(msg => msg && typeof msg.role === 'string' && typeof msg.content === 'string')
            .slice(-MAX_CONVERSATION_HISTORY)
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'ai',
                content: msg.content.substring(0, MAX_HISTORY_MESSAGE_LENGTH),
            }));
    }

    return {
        valid: true,
        data: { selectedText, action, userMessage, conversationHistory },
    };
}

// ── Controller ──────────────────────────────────────────────────────────────

/**
 * POST /api/chat - Process a chat message about an artifact
 */
export async function chat(req, res) {
    let body;
    try {
        body = await getBody(req);
    } catch (err) {
        logger.error('Failed to read request body', { error: err.message });
        return sendError(res, 'Failed to read request body', 400);
    }

    const rawData = parseJSON(body);
    const validation = validateRequest(rawData);

    if (!validation.valid) {
        return sendError(res, validation.error, 400);
    }

    const { selectedText, action, userMessage, conversationHistory } = validation.data;

    try {
        logger.info('Processing chat request', {
            action,
            selectedTextLength: selectedText.length,
            messageLength: userMessage.length,
            historyLength: conversationHistory.length,
        });

        // ── Check LLM availability ──────────────────────────────────────
        const llmRouter = agentService.getLLMRouter();
        if (!llmRouter) {
            return sendError(res, 'LLM service not initialized. Please check your API keys and restart the server.', 503);
        }

        // ── Fetch RAG context (non-blocking failure) ────────────────────
        let ragContext = [];
        try {
            const ragEngine = agentService.getRAGEngine();
            if (ragEngine) {
                const docs = await ragEngine.retrieve(selectedText, { maxDocuments: 3 });
                ragContext = Array.isArray(docs) ? docs : [];
            }
        } catch (ragError) {
            logger.warn('RAG retrieval failed, continuing without document context', {
                error: ragError.message,
            });
        }

        // ── Build the full prompt ───────────────────────────────────────
        const systemPrompt = buildSystemPrompt(action, selectedText, ragContext);
        let fullPrompt = systemPrompt;

        // Append conversation history (limited to last few turns)
        if (conversationHistory.length > 0) {
            fullPrompt += '\n\nPrevious conversation:';
            for (const msg of conversationHistory) {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                fullPrompt += `\n${role}: ${msg.content}`;
            }
        }

        // Append current user message
        if (userMessage) {
            fullPrompt += `\n\nUser: ${userMessage}`;
        }
        fullPrompt += '\n\nAssistant:';

        // ── Call LLM ────────────────────────────────────────────────────
        const llmResult = await llmRouter.generate(fullPrompt, {
            taskType: 'analysis',
        });

        // Extract the reply text from the LLM response
        const rawReply = llmResult.response;
        let reply;

        if (typeof rawReply === 'string') {
            reply = rawReply.trim();
        } else if (rawReply && typeof rawReply === 'object') {
            // Some providers return { text: '...' } or { content: '...' }
            reply = (rawReply.text || rawReply.content || JSON.stringify(rawReply)).trim();
        } else {
            reply = '';
        }

        if (!reply) {
            return sendError(res, 'LLM returned an empty response. Please try again.', 502);
        }

        // ── Build response ──────────────────────────────────────────────
        const isEditAction = action === 'refine' || action === 'edit';
        const suggestedEdit = isEditAction ? reply : null;

        sendSuccess(res, {
            reply,
            provider: llmResult.provider || 'unknown',
            suggestedEdit,
            action,
            latencyMs: llmResult.latencyMs || 0,
            hasDocumentContext: ragContext.length > 0,
        });

        logger.info('Chat request completed', {
            action,
            provider: llmResult.provider,
            latencyMs: llmResult.latencyMs,
            replyLength: reply.length,
            hasSuggestedEdit: !!suggestedEdit,
            ragDocsUsed: ragContext.length,
        });

    } catch (error) {
        logger.error('Chat request failed', {
            error: error.message,
            action,
            stack: error.stack?.split('\n').slice(0, 3).join(' | '),
        });

        // Differentiate between provider errors and internal errors
        if (error.message?.includes('All providers failed')) {
            return sendError(res, 'All LLM providers are currently unavailable. Please check your API keys or try again later.', 503);
        }
        if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
            return sendError(res, 'The request timed out. Try selecting a shorter text or simplifying your request.', 504);
        }

        sendError(res, `Chat processing failed: ${error.message}`, 500);
    }
}

export default {
    chat,
};
