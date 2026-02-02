/**
 * Custom Error Classes
 * Structured errors for the CEO Agent
 */

/**
 * Base error class for CEO Agent
 */
export class AgentError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'AgentError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp,
        };
    }
}

/**
 * Insufficient data to proceed
 */
export class InsufficientDataError extends AgentError {
    constructor(missingFields = []) {
        super('INSUFFICIENT DATA', 'INSUFFICIENT_DATA', { missingFields });
        this.name = 'InsufficientDataError';
    }
}

/**
 * Confidence below threshold
 */
export class LowConfidenceError extends AgentError {
    constructor(confidence, threshold) {
        super(
            `Confidence ${confidence} below threshold ${threshold}`,
            'LOW_CONFIDENCE',
            { confidence, threshold }
        );
        this.name = 'LowConfidenceError';
    }
}

/**
 * Loop or repetition detected
 */
export class LoopDetectedError extends AgentError {
    constructor(iteration, similarity) {
        super(
            `Loop detected at iteration ${iteration} with similarity ${similarity}`,
            'LOOP_DETECTED',
            { iteration, similarity }
        );
        this.name = 'LoopDetectedError';
    }
}

/**
 * LLM provider error
 */
export class LLMProviderError extends AgentError {
    constructor(provider, originalError) {
        super(
            `LLM provider ${provider} failed: ${originalError.message}`,
            'LLM_PROVIDER_ERROR',
            { provider, originalMessage: originalError.message }
        );
        this.name = 'LLMProviderError';
    }
}

/**
 * Policy violation
 */
export class PolicyViolationError extends AgentError {
    constructor(policyType, violation) {
        super(
            `Policy violation: ${violation}`,
            'POLICY_VIOLATION',
            { policyType, violation }
        );
        this.name = 'PolicyViolationError';
    }
}

/**
 * Human approval required
 */
export class ApprovalRequiredError extends AgentError {
    constructor(reason, proposedDecision) {
        super(
            `Human approval required: ${reason}`,
            'APPROVAL_REQUIRED',
            { reason, proposedDecision }
        );
        this.name = 'ApprovalRequiredError';
    }
}

/**
 * Validation error
 */
export class ValidationError extends AgentError {
    constructor(field, message) {
        super(
            `Validation failed for ${field}: ${message}`,
            'VALIDATION_ERROR',
            { field }
        );
        this.name = 'ValidationError';
    }
}
