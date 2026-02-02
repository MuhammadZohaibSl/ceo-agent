/**
 * Memory Manager
 * Unified interface for short-term and long-term memory
 * Orchestrates storage and retrieval across both memory types
 */

import { ShortTermMemory } from './ShortTermMemory.js';
import { LongTermMemory } from './LongTermMemory.js';
import logger from '../utils/logger.js';

/**
 * Memory types
 */
export const MemoryType = {
    SHORT_TERM: 'short_term',
    LONG_TERM: 'long_term',
    BOTH: 'both',
};

/**
 * Memory Manager class
 */
export class MemoryManager {
    /**
     * @param {Object} options
     * @param {Object} options.shortTerm - Short-term memory options
     * @param {Object} options.longTerm - Long-term memory options
     */
    constructor(options = {}) {
        this.shortTerm = new ShortTermMemory(options.shortTerm ?? {});
        this.longTerm = new LongTermMemory(options.longTerm ?? {});
        this.log = logger.child({ component: 'MemoryManager' });

        this.log.info('MemoryManager initialized');
    }

    /**
     * Store a memory entry
     * @param {Object} entry - Entry to store
     * @param {Object} options - Storage options
     * @param {string} options.type - Memory type (short_term, long_term, both)
     * @param {boolean} options.persist - Whether to persist to long-term
     * @returns {Object} Storage result with IDs
     */
    store(entry, options = {}) {
        const type = options.type ?? MemoryType.SHORT_TERM;
        const result = { shortTermId: null, longTermId: null };

        // Always store in short-term for session context
        if (type === MemoryType.SHORT_TERM || type === MemoryType.BOTH) {
            result.shortTermId = this.shortTerm.store({
                ...entry,
                type: entry.type ?? 'interaction',
            });
        }

        // Store in long-term if requested or if it's a significant entry
        if (type === MemoryType.LONG_TERM || type === MemoryType.BOTH || options.persist) {
            result.longTermId = this.longTerm.store({
                ...entry,
                type: entry.type ?? 'decision',
                tags: entry.tags ?? this._autoTag(entry),
            });
        }

        this.log.debug('Memory stored', {
            type,
            shortTermId: result.shortTermId,
            longTermId: result.longTermId,
        });

        return result;
    }

    /**
     * Retrieve relevant memories for a query
     * @param {string} query - Search query
     * @param {Object} options - Retrieval options
     * @param {number} options.limit - Max results
     * @param {number} options.minRelevance - Minimum relevance score
     * @param {string} options.type - Memory type to search
     * @param {boolean} options.includeShortTerm - Include short-term memories
     * @param {boolean} options.includeLongTerm - Include long-term memories
     * @returns {Promise<Object[]>} Combined relevant memories
     */
    async retrieve(query, options = {}) {
        const limit = options.limit ?? 10;
        const minRelevance = options.minRelevance ?? 0.3;
        const includeShortTerm = options.includeShortTerm ?? true;
        const includeLongTerm = options.includeLongTerm ?? true;

        const results = [];

        // Retrieve from short-term (recent context)
        if (includeShortTerm) {
            const shortTermResults = this.shortTerm.retrieve(query, {
                limit: Math.ceil(limit / 2),
                minRelevance,
            });

            for (const entry of shortTermResults) {
                results.push({
                    ...entry,
                    source: MemoryType.SHORT_TERM,
                });
            }
        }

        // Retrieve from long-term (historical knowledge)
        if (includeLongTerm) {
            const longTermResults = this.longTerm.retrieve(query, {
                limit: Math.ceil(limit / 2),
                minRelevance,
                tags: options.tags,
            });

            for (const entry of longTermResults) {
                results.push({
                    ...entry,
                    source: MemoryType.LONG_TERM,
                });
            }
        }

        // Sort by relevance and deduplicate
        const sorted = this._deduplicateAndSort(results);

        this.log.debug('Memory retrieved', {
            query: query.substring(0, 50),
            resultCount: sorted.length,
        });

        return sorted.slice(0, limit);
    }

    /**
     * Store a decision interaction (query + proposal)
     * @param {Object} interaction - Interaction data
     * @param {string} interaction.query - Original query
     * @param {Object} interaction.proposal - Decision proposal
     * @param {string} interaction.timestamp - Timestamp
     * @returns {Object} Storage result
     */
    storeInteraction(interaction) {
        // Store in short-term for immediate context
        const shortTermId = this.shortTerm.store({
            type: 'interaction',
            content: `Query: ${interaction.query}\nConfidence: ${interaction.proposal?.confidence}`,
            metadata: {
                query: interaction.query,
                confidence: interaction.proposal?.confidence,
                requiresApproval: interaction.proposal?.requiresHumanApproval,
            },
        });

        // Store significant interactions in long-term
        const isSignificant =
            interaction.proposal?.confidence >= 0.7 ||
            interaction.proposal?.requiresHumanApproval;

        let longTermId = null;
        if (isSignificant) {
            longTermId = this.longTerm.store({
                type: 'decision',
                content: JSON.stringify({
                    query: interaction.query,
                    recommendation: interaction.proposal?.recommendation,
                    confidence: interaction.proposal?.confidence,
                }),
                summary: interaction.query.substring(0, 100),
                tags: this._extractDecisionTags(interaction),
                metadata: {
                    timestamp: interaction.timestamp,
                    confidence: interaction.proposal?.confidence,
                },
            });
        }

        return { shortTermId, longTermId };
    }

    /**
     * Get memory statistics
     * @returns {Object}
     */
    getStats() {
        return {
            shortTerm: {
                size: this.shortTerm.size,
            },
            longTerm: this.longTerm.getStats(),
        };
    }

    /**
     * Clear short-term memory (session reset)
     */
    clearSession() {
        this.shortTerm.clear();
        this.log.info('Session memory cleared');
    }

    /**
     * Persist short-term to long-term (session end)
     * @param {Object} options
     * @param {number} options.minRelevance - Minimum relevance to persist
     */
    persistSession(options = {}) {
        const minRelevance = options.minRelevance ?? 0.5;
        const entries = this.shortTerm.getAll();

        let persistedCount = 0;
        for (const entry of entries) {
            if ((entry.relevance ?? 1) >= minRelevance) {
                this.longTerm.store({
                    ...entry,
                    type: entry.type ?? 'session_context',
                    tags: ['session', 'persisted'],
                });
                persistedCount++;
            }
        }

        this.log.info('Session persisted to long-term', {
            totalEntries: entries.length,
            persistedCount,
        });
    }

    /**
     * Cleanup and shutdown
     */
    destroy() {
        this.shortTerm.destroy();
        this.longTerm.flush();
        this.log.info('MemoryManager destroyed');
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _autoTag(entry) {
        const tags = [];
        const content = (entry.content ?? entry.query ?? '').toLowerCase();

        // Simple keyword-based auto-tagging
        const tagPatterns = [
            { pattern: /strateg/i, tag: 'strategy' },
            { pattern: /financ|budget|cost/i, tag: 'financial' },
            { pattern: /risk/i, tag: 'risk' },
            { pattern: /market|expansion/i, tag: 'market' },
            { pattern: /decision/i, tag: 'decision' },
            { pattern: /urgent|immediate/i, tag: 'urgent' },
        ];

        for (const { pattern, tag } of tagPatterns) {
            if (pattern.test(content)) {
                tags.push(tag);
            }
        }

        return tags;
    }

    _extractDecisionTags(interaction) {
        const tags = ['decision'];

        if (interaction.proposal?.requiresHumanApproval) {
            tags.push('requires_approval');
        }

        if (interaction.proposal?.confidence >= 0.8) {
            tags.push('high_confidence');
        } else if (interaction.proposal?.confidence < 0.5) {
            tags.push('low_confidence');
        }

        // Add auto-generated tags from query
        const autoTags = this._autoTag({ content: interaction.query });
        return [...new Set([...tags, ...autoTags])];
    }

    _deduplicateAndSort(results) {
        // Deduplicate by content similarity
        const seen = new Set();
        const unique = [];

        for (const entry of results) {
            const contentKey = (entry.content ?? '').substring(0, 100);
            if (!seen.has(contentKey)) {
                seen.add(contentKey);
                unique.push(entry);
            }
        }

        // Sort by relevance (descending)
        return unique.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {MemoryManager}
 */
export function createMemoryManager(options = {}) {
    return new MemoryManager(options);
}

export default MemoryManager;
