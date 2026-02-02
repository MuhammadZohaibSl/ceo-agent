/**
 * Error Handler Middleware
 * Centralized error handling
 */

import { sendError } from './http.js';
import logger from '../../utils/logger.js';

/**
 * Handle async route errors
 */
export function asyncHandler(fn) {
    return async (req, res, ...args) => {
        try {
            await fn(req, res, ...args);
        } catch (error) {
            logger.error('Request handler error', {
                error: error.message,
                stack: error.stack,
                url: req.url,
                method: req.method,
            });
            sendError(res, 'Internal server error', 500);
        }
    };
}

/**
 * Create standardized API error
 */
export class APIError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'APIError';
    }
}

/**
 * Handle route not found
 */
export function handleNotFound(req, res) {
    sendError(res, 'Not found', 404);
}

export default {
    asyncHandler,
    APIError,
    handleNotFound,
};
