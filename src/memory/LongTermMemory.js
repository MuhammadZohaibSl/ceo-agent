/**
 * Long-Term Memory
 * Persistent memory stored to disk
 */

import { FileAdapter } from './adapters/FileAdapter.js';

/**
 * Long-term memory entry
 * @typedef {Object} LongTermEntry
 * @property {string} id - Unique identifier
 * @property {string} type - Entry type
 * @property {string} content - Text content
 * @property {string} summary - Short summary for quick retrieval
 * @property {string[]} tags - Categorization tags
 * @property {Object} metadata - Additional metadata
 * @property {string} createdAt - Creation timestamp
 * @property {number} accessCount - Times accessed
 * @property {string} lastAccessedAt - Last access timestamp
 */

export class LongTermMemory {
    /**
     * @param {Object} options
     * @param {string} options.storagePath - Path to storage file
     * @param {number} options.maxEntries - Maximum entries to keep
     */
    constructor(options = {}) {
        this.maxEntries = options.maxEntries ?? 1000;

        const storagePath = options.storagePath ?? './data/memory/long_term.json';
        this.adapter = new FileAdapter(storagePath);

        // Load existing entries
        this._entries = new Map();
        this._loadFromDisk();
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
            type: entry.type ?? 'decision',
            content: typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content ?? entry),
            summary: entry.summary ?? this._generateSummary(entry),
            tags: entry.tags ?? [],
            metadata: entry.metadata ?? {},
            createdAt: new Date().toISOString(),
            accessCount: 0,
            lastAccessedAt: null,
        };

        // Enforce max entries (remove least accessed)
        if (this._entries.size >= this.maxEntries) {
            this._removeLeastAccessed();
        }

        this._entries.set(id, memoryEntry);
        this._saveToDisk();

        return id;
    }

    /**
     * Retrieve memories by query
     * @param {string} query - Search query
     * @param {Object} options - Retrieval options
     * @param {number} options.limit - Max results
     * @param {number} options.minRelevance - Minimum relevance score
     * @param {string[]} options.tags - Filter by tags
     * @returns {LongTermEntry[]} Matching entries
     */
    retrieve(query, options = {}) {
        const limit = options.limit ?? 10;
        const minRelevance = options.minRelevance ?? 0.3;
        const filterTags = options.tags ?? [];
        const queryLower = query.toLowerCase();

        const results = [];

        for (const entry of this._entries.values()) {
            // Filter by tags if specified
            if (filterTags.length > 0) {
                const hasTag = filterTags.some(tag => entry.tags.includes(tag));
                if (!hasTag) continue;
            }

            // Calculate relevance
            const relevance = this._calculateRelevance(entry, queryLower);

            if (relevance >= minRelevance) {
                // Update access metadata
                entry.accessCount += 1;
                entry.lastAccessedAt = new Date().toISOString();

                results.push({ ...entry, relevance });
            }
        }

        // Save updated access counts
        if (results.length > 0) {
            this._saveToDisk();
        }

        // Sort by relevance (descending) then by access count (most accessed first)
        return results
            .sort((a, b) => {
                if (b.relevance !== a.relevance) {
                    return b.relevance - a.relevance;
                }
                return b.accessCount - a.accessCount;
            })
            .slice(0, limit);
    }

    /**
     * Get entry by ID
     * @param {string} id - Entry ID
     * @returns {LongTermEntry|null}
     */
    get(id) {
        const entry = this._entries.get(id);
        if (entry) {
            entry.accessCount += 1;
            entry.lastAccessedAt = new Date().toISOString();
            this._saveToDisk();
        }
        return entry ?? null;
    }

    /**
     * Delete entry by ID
     * @param {string} id - Entry ID
     * @returns {boolean} Success status
     */
    delete(id) {
        const deleted = this._entries.delete(id);
        if (deleted) {
            this._saveToDisk();
        }
        return deleted;
    }

    /**
     * Search by tags
     * @param {string[]} tags - Tags to search for
     * @param {number} limit - Max results
     * @returns {LongTermEntry[]}
     */
    findByTags(tags, limit = 10) {
        const results = [];

        for (const entry of this._entries.values()) {
            const matchCount = tags.filter(tag => entry.tags.includes(tag)).length;
            if (matchCount > 0) {
                results.push({ ...entry, matchCount });
            }
        }

        return results
            .sort((a, b) => b.matchCount - a.matchCount)
            .slice(0, limit);
    }

    /**
     * Get statistics
     * @returns {Object}
     */
    getStats() {
        const entries = Array.from(this._entries.values());

        return {
            totalEntries: entries.length,
            typeBreakdown: this._countByField(entries, 'type'),
            tagBreakdown: this._countTags(entries),
            avgAccessCount: entries.reduce((sum, e) => sum + e.accessCount, 0) / (entries.length || 1),
        };
    }

    /**
     * Get entry count
     * @returns {number}
     */
    get size() {
        return this._entries.size;
    }

    /**
     * Force save to disk
     */
    flush() {
        this._saveToDisk();
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _generateId() {
        return `ltm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _generateSummary(entry) {
        const content = entry.content ?? entry.query ?? '';
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        return text.substring(0, 100) + (text.length > 100 ? '...' : '');
    }

    _calculateRelevance(entry, queryLower) {
        const contentLower = (entry.content ?? '').toLowerCase();
        const summaryLower = (entry.summary ?? '').toLowerCase();
        const words = queryLower.split(/\s+/).filter(w => w.length > 2);

        if (words.length === 0) return 0.5;

        let score = 0;
        for (const word of words) {
            if (contentLower.includes(word)) score += 1;
            if (summaryLower.includes(word)) score += 0.5;
            if (entry.tags.some(tag => tag.toLowerCase().includes(word))) score += 0.3;
        }

        return Math.min(1, score / words.length);
    }

    _removeLeastAccessed() {
        let leastAccessed = null;
        let minAccess = Infinity;

        for (const entry of this._entries.values()) {
            if (entry.accessCount < minAccess) {
                minAccess = entry.accessCount;
                leastAccessed = entry;
            }
        }

        if (leastAccessed) {
            this._entries.delete(leastAccessed.id);
        }
    }

    _loadFromDisk() {
        const data = this.adapter.load();
        const entries = data.entries ?? [];

        for (const entry of entries) {
            this._entries.set(entry.id, entry);
        }
    }

    _saveToDisk() {
        const entries = Array.from(this._entries.values());
        this.adapter.save({ entries });
    }

    _countByField(entries, field) {
        const counts = {};
        for (const entry of entries) {
            const value = entry[field] ?? 'unknown';
            counts[value] = (counts[value] ?? 0) + 1;
        }
        return counts;
    }

    _countTags(entries) {
        const counts = {};
        for (const entry of entries) {
            for (const tag of entry.tags ?? []) {
                counts[tag] = (counts[tag] ?? 0) + 1;
            }
        }
        return counts;
    }
}

export default LongTermMemory;
