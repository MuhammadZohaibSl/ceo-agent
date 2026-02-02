/**
 * Vector Store
 * In-memory vector storage and similarity search
 * 
 * NOTE: This is a simple in-memory implementation for Phase 4.
 * In production, replace with a real vector DB (Pinecone, Qdrant, etc.)
 */

import { Embedder } from './Embedder.js';

export class VectorStore {
    /**
     * @param {Object} options
     * @param {Embedder} options.embedder - Embedder instance
     */
    constructor(options = {}) {
        this.embedder = options.embedder ?? new Embedder();

        /** @type {Map<string, { embedding: number[], metadata: Object }>} */
        this._store = new Map();
    }

    /**
     * Add a document chunk to the store
     * @param {string} id - Unique ID
     * @param {number[]} embedding - Vector embedding
     * @param {Object} metadata - Document metadata
     */
    add(id, embedding, metadata = {}) {
        this._store.set(id, { embedding, metadata });
    }

    /**
     * Add a chunk with automatic embedding
     * @param {Object} chunk - Chunk with content
     * @returns {Promise<string>} Chunk ID
     */
    async addChunk(chunk) {
        const embedding = await this.embedder.embed(chunk.content ?? '');
        const id = chunk.id ?? this._generateId();

        this._store.set(id, {
            embedding,
            metadata: {
                id,
                content: chunk.content,
                documentId: chunk.documentId,
                documentName: chunk.documentName,
                chunkIndex: chunk.chunkIndex,
                ...chunk.metadata,
            },
        });

        return id;
    }

    /**
     * Add multiple chunks
     * @param {Object[]} chunks - Chunks to add
     * @returns {Promise<string[]>} Chunk IDs
     */
    async addChunks(chunks) {
        const ids = [];
        for (const chunk of chunks) {
            ids.push(await this.addChunk(chunk));
        }
        return ids;
    }

    /**
     * Search for similar vectors
     * @param {string} query - Query text
     * @param {Object} options - Search options
     * @param {number} options.topK - Number of results
     * @param {number} options.minSimilarity - Minimum similarity threshold
     * @returns {Promise<Object[]>} Search results with similarity scores
     */
    async search(query, options = {}) {
        const topK = options.topK ?? 5;
        const minSimilarity = options.minSimilarity ?? 0;

        // Embed the query
        const queryEmbedding = await this.embedder.embed(query);

        // Calculate similarities
        const results = [];

        for (const [id, { embedding, metadata }] of this._store.entries()) {
            const similarity = this.embedder.cosineSimilarity(queryEmbedding, embedding);

            if (similarity >= minSimilarity) {
                results.push({
                    id,
                    similarity,
                    ...metadata,
                });
            }
        }

        // Sort by similarity (descending) and limit
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    /**
     * Delete a vector by ID
     * @param {string} id - Vector ID
     * @returns {boolean} Success status
     */
    delete(id) {
        return this._store.delete(id);
    }

    /**
     * Delete all vectors for a document
     * @param {string} documentId - Document ID
     * @returns {number} Number of deleted vectors
     */
    deleteByDocument(documentId) {
        let deleted = 0;

        for (const [id, { metadata }] of this._store.entries()) {
            if (metadata.documentId === documentId) {
                this._store.delete(id);
                deleted++;
            }
        }

        return deleted;
    }

    /**
     * Clear all vectors
     */
    clear() {
        this._store.clear();
    }

    /**
     * Get store size
     * @returns {number}
     */
    get size() {
        return this._store.size;
    }

    /**
     * Get statistics
     * @returns {Object}
     */
    getStats() {
        const documents = new Set();

        for (const { metadata } of this._store.values()) {
            if (metadata.documentId) {
                documents.add(metadata.documentId);
            }
        }

        return {
            totalVectors: this._store.size,
            uniqueDocuments: documents.size,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _generateId() {
        return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default VectorStore;
