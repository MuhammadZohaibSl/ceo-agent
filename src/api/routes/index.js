/**
 * API Router
 * Maps HTTP routes to controller handlers
 */

import { handleCORS, handleNotFound } from '../middleware/index.js';
import { statusController, analysisController, approvalsController, documentsController, settingsController } from '../controllers/index.js';
import logger from '../../utils/logger.js';

/**
 * Parse URL into parts for route matching
 */
function parseUrl(url) {
    const [path, query] = url.split('?');
    const parts = path.split('/').filter(Boolean);
    return { path, parts, query };
}

/**
 * Route definitions
 */
const routes = [
    // Status routes
    { method: 'GET', path: '/api/status', handler: statusController.getStatus },
    { method: 'GET', path: '/api/stats', handler: statusController.getStats },
    { method: 'GET', path: '/api/history', handler: statusController.getHistory },

    // Analysis routes
    { method: 'POST', path: '/api/analyze', handler: analysisController.analyze },

    // Approval routes (static paths)
    { method: 'GET', path: '/api/approvals', handler: approvalsController.getApprovals },

    // Document routes (static paths)
    { method: 'GET', path: '/api/documents', handler: documentsController.getDocuments },
    { method: 'POST', path: '/api/documents', handler: documentsController.uploadDocument },

    // Settings routes
    { method: 'GET', path: '/api/settings/llm', handler: settingsController.getLLMSettings },
    { method: 'PUT', path: '/api/settings/llm', handler: settingsController.updateLLMSettings },
];

/**
 * Handle incoming HTTP request
 */
export async function handleRequest(req, res) {
    const { method, url } = req;

    // Handle CORS preflight
    if (handleCORS(req, res)) {
        return;
    }

    const { path, parts } = parseUrl(url);

    try {
        // Check static routes first
        for (const route of routes) {
            if (method === route.method && path === route.path) {
                return await route.handler(req, res);
            }
        }

        // Dynamic routes with parameters

        // GET /api/approvals/:id
        if (method === 'GET' && parts[0] === 'api' && parts[1] === 'approvals' && parts[2] && !parts[3]) {
            return await approvalsController.getApproval(req, res, parts[2]);
        }

        // POST /api/approvals/:id/approve
        if (method === 'POST' && parts[0] === 'api' && parts[1] === 'approvals' && parts[2] && parts[3] === 'approve') {
            return await approvalsController.approve(req, res, parts[2]);
        }

        // POST /api/approvals/:id/reject
        if (method === 'POST' && parts[0] === 'api' && parts[1] === 'approvals' && parts[2] && parts[3] === 'reject') {
            return await approvalsController.reject(req, res, parts[2]);
        }

        // DELETE /api/documents/:id
        if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'documents' && parts[2]) {
            return await documentsController.deleteDocument(req, res, parts[2]);
        }

        // 404 Not Found
        handleNotFound(req, res);
    } catch (error) {
        logger.error('Request handling error', { error: error.message, url, method });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
    }
}

export default handleRequest;
