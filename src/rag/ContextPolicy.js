/**
 * Context Policy
 * Enforces RAG context governance: token budgets, quality thresholds, rejection behavior
 */

/**
 * Default policy values
 */
const DEFAULT_POLICY = {
    maxTokenBudget: 4000,
    minSimilarityScore: 0.7,
    maxRetrievedDocuments: 5,
    onLowQualityRetrieval: 'warn_and_proceed', // 'fail' | 'warn_and_proceed' | 'proceed_silent'
    onNoRetrieval: 'proceed_without_context',  // 'fail' | 'proceed_without_context'
    contextPriority: ['recent_memory', 'relevant_documents', 'historical_decisions'],
};

/**
 * Approximate tokens from text (rough estimate: 4 chars per token)
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

export class ContextPolicy {
    /**
     * @param {Object} policy - Policy configuration
     */
    constructor(policy = {}) {
        this.policy = { ...DEFAULT_POLICY, ...policy };
    }

    /**
     * Get max token budget
     * @returns {number}
     */
    get maxTokens() {
        return this.policy.maxTokenBudget;
    }

    /**
     * Get minimum similarity score
     * @returns {number}
     */
    get minSimilarity() {
        return this.policy.minSimilarityScore;
    }

    /**
     * Get max documents to retrieve
     * @returns {number}
     */
    get maxDocuments() {
        return this.policy.maxRetrievedDocuments;
    }

    /**
     * Filter documents by similarity threshold
     * @param {Object[]} documents - Documents with similarity scores
     * @returns {{ passed: Object[], rejected: Object[] }}
     */
    filterBySimilarity(documents) {
        const passed = [];
        const rejected = [];

        for (const doc of documents) {
            if ((doc.similarity ?? doc.score ?? 0) >= this.policy.minSimilarityScore) {
                passed.push(doc);
            } else {
                rejected.push(doc);
            }
        }

        return { passed, rejected };
    }

    /**
     * Enforce token budget on documents
     * @param {Object[]} documents - Documents to trim
     * @returns {{ included: Object[], excluded: Object[], totalTokens: number }}
     */
    enforceTokenBudget(documents) {
        const included = [];
        const excluded = [];
        let totalTokens = 0;

        for (const doc of documents) {
            const docTokens = estimateTokens(doc.content ?? doc.text ?? '');

            if (totalTokens + docTokens <= this.policy.maxTokenBudget) {
                included.push({ ...doc, tokens: docTokens });
                totalTokens += docTokens;
            } else {
                excluded.push({ ...doc, tokens: docTokens, reason: 'token_budget_exceeded' });
            }
        }

        return { included, excluded, totalTokens };
    }

    /**
     * Apply full policy to retrieved documents
     * @param {Object[]} documents - Raw retrieved documents
     * @returns {{ documents: Object[], warnings: string[], totalTokens: number }}
     */
    apply(documents) {
        const warnings = [];

        // 1. Filter by similarity
        const { passed, rejected } = this.filterBySimilarity(documents);

        if (rejected.length > 0) {
            warnings.push(`${rejected.length} documents below similarity threshold (${this.policy.minSimilarityScore})`);
        }

        // 2. Limit by max documents
        const limited = passed.slice(0, this.policy.maxRetrievedDocuments);
        if (passed.length > this.policy.maxRetrievedDocuments) {
            warnings.push(`Limited from ${passed.length} to ${this.policy.maxRetrievedDocuments} documents`);
        }

        // 3. Enforce token budget
        const { included, excluded, totalTokens } = this.enforceTokenBudget(limited);

        if (excluded.length > 0) {
            warnings.push(`${excluded.length} documents excluded due to token budget (${this.policy.maxTokenBudget})`);
        }

        // 4. Handle low quality retrieval
        if (included.length === 0 && documents.length > 0) {
            const behavior = this.policy.onLowQualityRetrieval;
            if (behavior === 'fail') {
                throw new Error('RAG retrieval quality too low');
            } else if (behavior === 'warn_and_proceed') {
                warnings.push('All retrieved documents below quality threshold');
            }
        }

        // 5. Handle no retrieval
        if (documents.length === 0) {
            const behavior = this.policy.onNoRetrieval;
            if (behavior === 'fail') {
                throw new Error('No documents retrieved');
            }
            warnings.push('No documents found for query');
        }

        return {
            documents: included,
            warnings,
            totalTokens,
            stats: {
                retrieved: documents.length,
                passedSimilarity: passed.length,
                includedFinal: included.length,
            },
        };
    }

    /**
     * Get policy summary
     * @returns {Object}
     */
    toJSON() {
        return { ...this.policy };
    }
}

export default ContextPolicy;
