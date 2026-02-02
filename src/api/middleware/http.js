/**
 * HTTP Utility Middleware
 * Common request/response utilities
 */

/**
 * Parse JSON body from request
 */
export function parseJSON(body) {
    try {
        return JSON.parse(body);
    } catch {
        return null;
    }
}

/**
 * Send JSON response with CORS headers
 */
export function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data));
}

/**
 * Get request body as string
 */
export function getBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(body));
    });
}

/**
 * Send success response
 */
export function sendSuccess(res, data, statusCode = 200) {
    sendJSON(res, statusCode, { success: true, data });
}

/**
 * Send error response
 */
export function sendError(res, message, statusCode = 400) {
    sendJSON(res, statusCode, { success: false, error: message });
}

export default {
    parseJSON,
    sendJSON,
    getBody,
    sendSuccess,
    sendError,
};
