/**
 * Middleware Index
 * Export all middleware utilities
 */

export { parseJSON, sendJSON, getBody, sendSuccess, sendError } from './http.js';
export { handleCORS, addCORSHeaders } from './cors.js';
export { asyncHandler, APIError, handleNotFound } from './error.js';

// Re-export constants
import cors from './cors.js';
export const CORS_HEADERS = cors.CORS_HEADERS;
