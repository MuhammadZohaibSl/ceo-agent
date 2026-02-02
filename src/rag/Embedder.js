/**
 * Embedder
 * Generate vector embeddings from text
 * 
 * NOTE: This is a simple TF-IDF-like implementation for Phase 4.
 * In production, replace with actual embedding API (OpenAI, Cohere, etc.)
 */

/**
 * Simple word tokenizer
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);
}

/**
 * Calculate term frequency
 * @param {string[]} tokens
 * @returns {Map<string, number>}
 */
function termFrequency(tokens) {
    const tf = new Map();
    for (const token of tokens) {
        tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    // Normalize
    const maxFreq = Math.max(...tf.values());
    for (const [token, freq] of tf.entries()) {
        tf.set(token, freq / maxFreq);
    }
    return tf;
}

export class Embedder {
    /**
     * @param {Object} options
     * @param {number} options.dimensions - Vector dimensions
     * @param {string} options.provider - 'local' | 'openai' | 'cohere'
     */
    constructor(options = {}) {
        this.dimensions = options.dimensions ?? 128;
        this.provider = options.provider ?? 'local';

        // Vocabulary for consistent dimensions
        this._vocabulary = new Map();
        this._vocabIndex = 0;
    }

    /**
     * Embed a single text
     * @param {string} text - Text to embed
     * @returns {Promise<number[]>} Embedding vector
     */
    async embed(text) {
        if (this.provider === 'local') {
            return this._localEmbed(text);
        }

        // Placeholder for external providers
        throw new Error(`Provider ${this.provider} not implemented yet`);
    }

    /**
     * Embed multiple texts
     * @param {string[]} texts - Texts to embed
     * @returns {Promise<number[][]>} Array of embedding vectors
     */
    async embedBatch(texts) {
        const embeddings = [];
        for (const text of texts) {
            embeddings.push(await this.embed(text));
        }
        return embeddings;
    }

    /**
     * Embed a document chunk
     * @param {Object} chunk - Chunk with content
     * @returns {Promise<Object>} Chunk with embedding
     */
    async embedChunk(chunk) {
        const embedding = await this.embed(chunk.content ?? '');
        return {
            ...chunk,
            embedding,
        };
    }

    /**
     * Embed multiple chunks
     * @param {Object[]} chunks - Chunks to embed
     * @returns {Promise<Object[]>} Chunks with embeddings
     */
    async embedChunks(chunks) {
        const embedded = [];
        for (const chunk of chunks) {
            embedded.push(await this.embedChunk(chunk));
        }
        return embedded;
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {number[]} a - First vector
     * @param {number[]} b - Second vector
     * @returns {number} Similarity score (0-1)
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same dimensions');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    /**
     * Local TF-based embedding (simple but works for demo)
     * @param {string} text
     * @returns {number[]}
     */
    _localEmbed(text) {
        const tokens = tokenize(text);
        const tf = termFrequency(tokens);

        // Build/update vocabulary
        for (const token of tokens) {
            if (!this._vocabulary.has(token)) {
                this._vocabulary.set(token, this._vocabIndex % this.dimensions);
                this._vocabIndex++;
            }
        }

        // Create embedding vector
        const embedding = new Array(this.dimensions).fill(0);

        for (const [token, freq] of tf.entries()) {
            const index = this._vocabulary.get(token) ?? (token.charCodeAt(0) % this.dimensions);
            embedding[index] += freq;
        }

        // Add some position-based features
        for (let i = 0; i < Math.min(tokens.length, 10); i++) {
            const token = tokens[i];
            const hash = this._hash(token) % this.dimensions;
            embedding[hash] += 0.1 * (1 - i / 10);
        }

        // Normalize
        return this._normalize(embedding);
    }

    _hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    _normalize(vector) {
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (norm === 0) return vector;
        return vector.map(v => v / norm);
    }
}

export default Embedder;
