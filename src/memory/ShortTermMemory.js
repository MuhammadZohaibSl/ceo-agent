/**
 * Short-Term Memory
 * Session-scoped in-RAM memory for current conversation context
 */

/**
 * Memory entry structure
 * @typedef {Object} MemoryEntry
 * @property {string} id - Unique identifier
 * @property {string} type - Entry type (query, response, context)
 * @property {string} content - Text content
 * @property {Object} metadata - Additional metadata
 * @property {string} timestamp - ISO timestamp
 * @property {number} relevance - Relevance score (0-1)
 */

export class ShortTermMemory {
    /**
     * @param {Object} options
     * @param {number} options.maxEntries - Maximum entries to keep
     * @param {number} options.ttlMs - Time-to-live in milliseconds
     */
    constructor(options = {}) {
        this.maxEntries = options.maxEntries ?? 100;
        this.ttlMs = options.ttlMs ?? 30 * 60 * 1000; // 30 minutes default

        /** @type {Map<string, MemoryEntry>} */
        this._store = new Map();

        // Start cleanup interval
        this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
    }

    /**
     * Store a memory entry
     * @param {Object} entry - Entry to store
     * @returns {string} Entry ID
     */
    store(entry) {
        const id = entry.id ?? this._generateId();

        const memoryEntry = {
            id,
            type: entry.type ?? 'general',
            content: entry.content ?? JSON.stringify(entry),
            metadata: entry.metadata ?? {},
            timestamp: new Date().toISOString(),
            relevance: entry.relevance ?? 1.0,
            expiresAt: Date.now() + this.ttlMs,
        };

        // Enforce max entries (remove oldest)
        if (this._store.size >= this.maxEntries) {
            const oldest = this._findOldest();
            if (oldest) {
                this._store.delete(oldest.id);
            }
        }

        this._store.set(id, memoryEntry);
        return id;
    }

    /**
     * Retrieve memories by query
     * @param {string} query - Search query
     * @param {Object} options - Retrieval options
     * @param {number} options.limit - Max results
     * @param {number} options.minRelevance - Minimum relevance score
     * @returns {MemoryEntry[]} Matching entries
     */
    retrieve(query, options = {}) {
        const limit = options.limit ?? 10;
        const minRelevance = options.minRelevance ?? 0.0;
        const queryLower = query.toLowerCase();

        const results = [];

        for (const entry of this._store.values()) {
            // Skip expired entries
            if (entry.expiresAt && entry.expiresAt < Date.now()) {
                continue;
            }

            // Simple keyword matching for relevance scoring
            const relevance = this._calculateRelevance(entry, queryLower);

            if (relevance >= minRelevance) {
                results.push({ ...entry, relevance });
            }
        }

        // Sort by relevance (descending) then by timestamp (newest first)
        return results
            .sort((a, b) => {
                if (b.relevance !== a.relevance) {
                    return b.relevance - a.relevance;
                }
                return new Date(b.timestamp) - new Date(a.timestamp);
            })
            .slice(0, limit);
    }

    /**
     * Get all entries (for persistence)
     * @returns {MemoryEntry[]}
     */
    getAll() {
        return Array.from(this._store.values()).filter(
            entry => !entry.expiresAt || entry.expiresAt >= Date.now()
        );
    }

    /**
     * Load entries (from persistence)
     * @param {MemoryEntry[]} entries
     */
    load(entries) {
        for (const entry of entries) {
            this._store.set(entry.id, entry);
        }
    }

    /**
     * Clear all entries
     */
    clear() {
        this._store.clear();
    }

    /**
     * Get entry count
     * @returns {number}
     */
    get size() {
        return this._store.size;
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
        }
        this._store.clear();
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _generateId() {
        return `stm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _findOldest() {
        let oldest = null;
        let oldestTime = Infinity;

        for (const entry of this._store.values()) {
            const time = new Date(entry.timestamp).getTime();
            if (time < oldestTime) {
                oldestTime = time;
                oldest = entry;
            }
        }

        return oldest;
    }

    _calculateRelevance(entry, queryLower) {
        const contentLower = (entry.content ?? '').toLowerCase();
        const words = queryLower.split(/\s+/).filter(w => w.length > 2);

        if (words.length === 0) return 0.5;

        const matches = words.filter(word => contentLower.includes(word));
        return matches.length / words.length;
    }

    _cleanup() {
        const now = Date.now();
        for (const [id, entry] of this._store.entries()) {
            if (entry.expiresAt && entry.expiresAt < now) {
                this._store.delete(id);
            }
        }
    }
}

export default ShortTermMemory;
