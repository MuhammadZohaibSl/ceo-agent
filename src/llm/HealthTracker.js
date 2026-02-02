/**
 * Health Tracker
 * Tracks LLM provider health with dynamic scoring
 * Based on latency, failure rates, and availability
 */

import logger from '../utils/logger.js';

/**
 * Health status thresholds
 */
const HEALTH_THRESHOLDS = {
    healthy: 0.8,
    degraded: 0.5,
    unhealthy: 0.2,
};

/**
 * Default weights for health scoring
 */
const DEFAULT_WEIGHTS = {
    successRate: 0.4,
    latency: 0.3,
    availability: 0.3,
};

export class HealthTracker {
    /**
     * @param {Object} options
     * @param {number} options.windowSize - Number of requests to track
     * @param {number} options.latencyThreshold - Max acceptable latency (ms)
     */
    constructor(options = {}) {
        this.windowSize = options.windowSize ?? 100;
        this.latencyThreshold = options.latencyThreshold ?? 5000;
        this.weights = { ...DEFAULT_WEIGHTS, ...options.weights };

        /** @type {Map<string, ProviderMetrics>} */
        this._metrics = new Map();

        this.log = logger.child({ component: 'HealthTracker' });
    }

    /**
     * Record a successful request
     * @param {string} provider - Provider name
     * @param {number} latencyMs - Request latency in ms
     */
    recordSuccess(provider, latencyMs) {
        const metrics = this._getOrCreateMetrics(provider);

        metrics.requests.push({
            timestamp: Date.now(),
            success: true,
            latencyMs,
        });

        this._trimWindow(metrics);
        this._updateScore(provider, metrics);
    }

    /**
     * Record a failed request
     * @param {string} provider - Provider name
     * @param {string} error - Error message
     */
    recordFailure(provider, error) {
        const metrics = this._getOrCreateMetrics(provider);

        metrics.requests.push({
            timestamp: Date.now(),
            success: false,
            error,
        });

        metrics.consecutiveFailures++;

        this._trimWindow(metrics);
        this._updateScore(provider, metrics);

        this.log.warn('Provider failure recorded', { provider, error, score: metrics.score });
    }

    /**
     * Get current health score for a provider
     * @param {string} provider - Provider name
     * @returns {number} Health score (0-1)
     */
    getScore(provider) {
        const metrics = this._metrics.get(provider);
        return metrics?.score ?? 1.0; // Default to healthy if no data
    }

    /**
     * Get health status label
     * @param {string} provider - Provider name
     * @returns {string} 'healthy' | 'degraded' | 'unhealthy'
     */
    getStatus(provider) {
        const score = this.getScore(provider);

        if (score >= HEALTH_THRESHOLDS.healthy) return 'healthy';
        if (score >= HEALTH_THRESHOLDS.degraded) return 'degraded';
        if (score >= HEALTH_THRESHOLDS.unhealthy) return 'unhealthy';
        return 'critical';
    }

    /**
     * Check if provider is available for requests
     * @param {string} provider - Provider name
     * @returns {boolean}
     */
    isAvailable(provider) {
        const metrics = this._metrics.get(provider);
        if (!metrics) return true;

        // Mark unavailable if too many consecutive failures
        if (metrics.consecutiveFailures >= 5) return false;

        // Check if score is above minimum threshold
        return metrics.score >= HEALTH_THRESHOLDS.unhealthy;
    }

    /**
     * Get all provider health info
     * @returns {Object[]}
     */
    getAll() {
        const providers = [];

        for (const [name, metrics] of this._metrics.entries()) {
            providers.push({
                provider: name,
                score: metrics.score,
                status: this.getStatus(name),
                available: this.isAvailable(name),
                stats: this._calculateStats(metrics),
            });
        }

        return providers.sort((a, b) => b.score - a.score);
    }

    /**
     * Reset health data for a provider
     * @param {string} provider - Provider name
     */
    reset(provider) {
        this._metrics.delete(provider);
        this.log.info('Provider health reset', { provider });
    }

    /**
     * Mark provider as recovered (after manual check)
     * @param {string} provider - Provider name
     */
    markRecovered(provider) {
        const metrics = this._metrics.get(provider);
        if (metrics) {
            metrics.consecutiveFailures = 0;
            metrics.score = Math.max(metrics.score, HEALTH_THRESHOLDS.degraded);
            this.log.info('Provider marked as recovered', { provider });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _getOrCreateMetrics(provider) {
        if (!this._metrics.has(provider)) {
            this._metrics.set(provider, {
                requests: [],
                score: 1.0,
                consecutiveFailures: 0,
                lastUpdated: Date.now(),
            });
        }
        return this._metrics.get(provider);
    }

    _trimWindow(metrics) {
        // Keep only recent requests within window
        if (metrics.requests.length > this.windowSize) {
            metrics.requests = metrics.requests.slice(-this.windowSize);
        }

        // Also remove old requests (older than 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        metrics.requests = metrics.requests.filter(r => r.timestamp > oneHourAgo);
    }

    _updateScore(provider, metrics) {
        const stats = this._calculateStats(metrics);

        // Calculate weighted score
        let score = 0;

        // Success rate component (0-1)
        score += stats.successRate * this.weights.successRate;

        // Latency component (0-1, lower is better)
        const latencyScore = Math.max(0, 1 - (stats.avgLatency / this.latencyThreshold));
        score += latencyScore * this.weights.latency;

        // Availability component (penalize consecutive failures)
        const availabilityScore = Math.max(0, 1 - (metrics.consecutiveFailures * 0.2));
        score += availabilityScore * this.weights.availability;

        // Normalize
        const totalWeight = this.weights.successRate + this.weights.latency + this.weights.availability;
        metrics.score = score / totalWeight;

        // Reset consecutive failures on success
        if (metrics.requests[metrics.requests.length - 1]?.success) {
            metrics.consecutiveFailures = 0;
        }

        metrics.lastUpdated = Date.now();
    }

    _calculateStats(metrics) {
        if (metrics.requests.length === 0) {
            return { successRate: 1, avgLatency: 0, requestCount: 0 };
        }

        const successes = metrics.requests.filter(r => r.success);
        const successRate = successes.length / metrics.requests.length;

        const latencies = successes.map(r => r.latencyMs).filter(Boolean);
        const avgLatency = latencies.length > 0
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length
            : 0;

        return {
            successRate,
            avgLatency: Math.round(avgLatency),
            requestCount: metrics.requests.length,
            failureCount: metrics.requests.length - successes.length,
        };
    }
}

export default HealthTracker;
