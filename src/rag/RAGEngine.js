/**
 * RAG Engine
 * Orchestrates document loading, embedding, storage, and retrieval
 */

import { DocumentLoader } from './DocumentLoader.js';
import { Embedder } from './Embedder.js';
import { VectorStore } from './VectorStore.js';
import { ContextPolicy } from './ContextPolicy.js';
import logger from '../utils/logger.js';

export class RAGEngine {
    /**
     * @param {Object} options
     * @param {Object} options.contextPolicy - Context policy config
     * @param {Object} options.embedder - Embedder options
     * @param {Object} options.loader - Document loader options
     */
    constructor(options = {}) {
        this.embedder = new Embedder(options.embedder ?? {});
        this.vectorStore = new VectorStore({ embedder: this.embedder });
        this.loader = new DocumentLoader(options.loader ?? {});
        this.contextPolicy = new ContextPolicy(options.contextPolicy ?? {});

        this.log = logger.child({ component: 'RAGEngine' });
        this.log.info('RAGEngine initialized');
    }

    /**
     * Ingest a single document
     * @param {string} filePath - Path to document
     * @returns {Promise<Object>} Ingestion stats
     */
    async ingestDocument(filePath) {
        this.log.debug('Ingesting document', { filePath });

        const chunks = this.loader.loadAndChunk(filePath);
        const ids = await this.vectorStore.addChunks(chunks);

        this.log.info('Document ingested', {
            filePath,
            chunkCount: chunks.length,
        });

        return {
            documentPath: filePath,
            chunksCreated: chunks.length,
            vectorIds: ids,
        };
    }

    /**
     * Ingest all documents from a directory
     * @param {string} dirPath - Path to directory
     * @param {boolean} recursive - Search subdirectories
     * @returns {Promise<Object>} Ingestion stats
     */
    async ingestDirectory(dirPath, recursive = false) {
        this.log.debug('Ingesting directory', { dirPath, recursive });

        const chunks = this.loader.loadAndChunkDirectory(dirPath, recursive);
        const ids = await this.vectorStore.addChunks(chunks);

        this.log.info('Directory ingested', {
            dirPath,
            chunkCount: chunks.length,
        });

        return {
            directoryPath: dirPath,
            chunksCreated: chunks.length,
            vectorIds: ids,
        };
    }

    /**
     * Ingest text directly (no file)
     * @param {string} text - Text content
     * @param {Object} metadata - Document metadata
     * @returns {Promise<Object>} Ingestion stats
     */
    async ingestText(text, metadata = {}) {
        const document = {
            id: `text_${Date.now()}`,
            name: metadata.name ?? 'inline_text',
            content: text,
            type: 'text',
            ...metadata,
        };

        const chunks = this.loader.chunkDocument(document);
        const ids = await this.vectorStore.addChunks(chunks);

        return {
            documentId: document.id,
            chunksCreated: chunks.length,
            vectorIds: ids,
        };
    }

    /**
     * Retrieve relevant context for a query
     * @param {string} query - Query text
     * @param {Object} options - Retrieval options
     * @param {number} options.maxTokens - Override max token budget
     * @param {number} options.minSimilarity - Override min similarity
     * @param {number} options.maxDocuments - Override max documents
     * @returns {Promise<Object>} Retrieved context with policy application
     */
    async retrieve(query, options = {}) {
        this.log.debug('Retrieving context', { query: query.substring(0, 50) });

        // Use options or fall back to policy defaults
        const searchOptions = {
            topK: options.maxDocuments ?? this.contextPolicy.maxDocuments * 2, // Get extra for filtering
            minSimilarity: 0, // We'll filter manually with policy
        };

        // Search vector store
        const rawResults = await this.vectorStore.search(query, searchOptions);

        // Apply context policy
        const policyResult = this.contextPolicy.apply(rawResults);

        // Log warnings
        for (const warning of policyResult.warnings) {
            this.log.warn(warning, { query: query.substring(0, 50) });
        }

        this.log.debug('Context retrieved', {
            query: query.substring(0, 50),
            rawCount: rawResults.length,
            finalCount: policyResult.documents.length,
            totalTokens: policyResult.totalTokens,
        });

        return policyResult.documents;
    }

    /**
     * Retrieve with full stats (for debugging/auditing)
     * @param {string} query - Query text
     * @param {Object} options - Retrieval options
     * @returns {Promise<Object>} Full retrieval result
     */
    async retrieveWithStats(query, options = {}) {
        const searchOptions = {
            topK: (options.maxDocuments ?? this.contextPolicy.maxDocuments) * 2,
            minSimilarity: 0,
        };

        const rawResults = await this.vectorStore.search(query, searchOptions);
        const policyResult = this.contextPolicy.apply(rawResults);

        return {
            query,
            documents: policyResult.documents,
            warnings: policyResult.warnings,
            stats: {
                ...policyResult.stats,
                totalTokens: policyResult.totalTokens,
                policy: this.contextPolicy.toJSON(),
            },
        };
    }

    /**
     * Get engine statistics
     * @returns {Object}
     */
    getStats() {
        return {
            vectorStore: this.vectorStore.getStats(),
            policy: this.contextPolicy.toJSON(),
        };
    }

    /**
     * Clear all indexed data
     */
    clear() {
        this.vectorStore.clear();
        this.log.info('RAGEngine cleared');
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {RAGEngine}
 */
export function createRAGEngine(options = {}) {
    return new RAGEngine(options);
}

export default RAGEngine;
