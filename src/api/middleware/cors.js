/**
 * CORS Middleware
 * Handle Cross-Origin Resource Sharing
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle CORS preflight request
 * @returns {boolean} True if request was handled (OPTIONS request)
 */
export function handleCORS(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return true;
    }
    return false;
}

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(res) {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
        res.setHeader(key, value);
    }
}

export default {
    handleCORS,
    addCORSHeaders,
    CORS_HEADERS,
};
