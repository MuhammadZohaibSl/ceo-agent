/**
 * Documents Controller
 * Handles RAG document management
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

import { getBody, parseJSON, sendSuccess, sendError } from '../middleware/index.js';
import agentService from '../services/agent.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to documents directory (relative to project root)
const DOCUMENTS_DIR = join(__dirname, '..', '..', '..', 'data', 'documents');

/**
 * GET /api/documents - List RAG documents
 */
export async function getDocuments(req, res) {
    if (!existsSync(DOCUMENTS_DIR)) {
        return sendSuccess(res, []);
    }

    const files = readdirSync(DOCUMENTS_DIR).filter(f =>
        ['.md', '.txt', '.json'].includes(extname(f).toLowerCase())
    );

    const documents = files.map(filename => ({
        id: filename,
        name: basename(filename, extname(filename)),
        type: extname(filename).slice(1),
        path: join(DOCUMENTS_DIR, filename),
    }));

    sendSuccess(res, documents);
}

/**
 * POST /api/documents - Upload a new document
 */
export async function uploadDocument(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.name || !data.content) {
        return sendError(res, 'Missing required fields: name, content', 400);
    }

    if (!existsSync(DOCUMENTS_DIR)) {
        mkdirSync(DOCUMENTS_DIR, { recursive: true });
    }

    const ext = data.type ?? 'md';
    const filename = `${data.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
    const filepath = join(DOCUMENTS_DIR, filename);

    try {
        writeFileSync(filepath, data.content, 'utf-8');

        // Re-ingest documents
        const ragEngine = agentService.getRAGEngine();
        await ragEngine.ingestDirectory('./data/documents', false);

        sendSuccess(res, { id: filename, name: data.name, path: filepath }, 201);
    } catch (error) {
        sendError(res, error.message, 500);
    }
}

/**
 * DELETE /api/documents/:id - Delete a document
 */
export async function deleteDocument(req, res, documentId) {
    const filepath = join(DOCUMENTS_DIR, documentId);

    if (!existsSync(filepath)) {
        return sendError(res, 'Document not found', 404);
    }

    try {
        unlinkSync(filepath);

        // Re-ingest documents
        const ragEngine = agentService.getRAGEngine();
        await ragEngine.ingestDirectory('./data/documents', false);

        sendSuccess(res, { id: documentId, deleted: true });
    } catch (error) {
        sendError(res, error.message, 500);
    }
}

export default {
    getDocuments,
    uploadDocument,
    deleteDocument,
};
