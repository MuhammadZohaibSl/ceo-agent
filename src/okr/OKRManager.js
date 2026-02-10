/**
 * OKR Manager
 * Manages Objectives and Key Results for strategic planning
 * 
 * OKR Structure:
 * - Objective: High-level goal with title, description, timeframe
 * - Key Results: Measurable outcomes with metrics and progress
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

/**
 * OKR Status
 */
export const OKRStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    AT_RISK: 'at_risk',
    ON_TRACK: 'on_track',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

/**
 * Key Result Types
 */
export const KeyResultType = {
    PERCENTAGE: 'percentage',
    NUMBER: 'number',
    CURRENCY: 'currency',
    BINARY: 'binary',
};

/**
 * OKR Manager Class
 */
export class OKRManager {
    /**
     * @param {Object} options
     * @param {string} options.storageDir - Directory for OKR storage
     * @param {Object} options.auditLogger - Audit logger instance
     */
    constructor(options = {}) {
        this.storageDir = options.storageDir ?? './data/okrs';
        this.auditLogger = options.auditLogger;
        this.log = logger.child({ component: 'OKRManager' });

        this._ensureDir(this.storageDir);
        this.log.info('OKRManager initialized', { storageDir: this.storageDir });
    }

    /**
     * Create a new OKR
     * @param {Object} params
     * @param {string} params.title - Objective title
     * @param {string} params.description - Objective description
     * @param {string} params.owner - Owner of the OKR
     * @param {string} params.timeframe - e.g., 'Q1 2026', 'H1 2026'
     * @param {Date} params.startDate - Start date
     * @param {Date} params.endDate - End date
     * @param {Object[]} params.keyResults - Array of key results
     * @returns {Object} Created OKR
     */
    create(params) {
        const {
            title,
            description,
            owner,
            timeframe,
            startDate,
            endDate,
            keyResults = []
        } = params;

        const id = this._generateId();
        const now = new Date().toISOString();

        // Process key results with IDs and initial progress
        const processedKeyResults = keyResults.map((kr, index) => ({
            id: `kr_${id}_${index}`,
            title: kr.title,
            description: kr.description ?? '',
            type: kr.type ?? KeyResultType.PERCENTAGE,
            startValue: kr.startValue ?? 0,
            targetValue: kr.targetValue ?? 100,
            currentValue: kr.currentValue ?? kr.startValue ?? 0,
            unit: kr.unit ?? '',
            weight: kr.weight ?? 1,
            status: OKRStatus.DRAFT,
            createdAt: now,
            updatedAt: now,
        }));

        const okr = {
            id,
            title,
            description: description ?? '',
            owner: owner ?? 'Unassigned',
            timeframe: timeframe ?? this._getCurrentTimeframe(),
            startDate: startDate ?? now,
            endDate: endDate ?? this._getDefaultEndDate(),
            keyResults: processedKeyResults,
            status: OKRStatus.DRAFT,
            progress: 0,
            parentId: null, // For cascading OKRs
            tags: [],
            createdAt: now,
            updatedAt: now,
            version: 1,
            history: [{
                action: 'created',
                timestamp: now,
                actor: owner ?? 'system',
            }],
        };

        // Calculate initial progress
        okr.progress = this._calculateProgress(okr);
        okr.status = this._determineStatus(okr);

        // Save to storage
        this._save(okr);

        // Log audit event
        if (this.auditLogger) {
            this.auditLogger.logEvent({
                contextId: id,
                eventType: 'okr_created',
                data: { title, owner, keyResultCount: processedKeyResults.length },
                actor: owner ?? 'system',
            });
        }

        this.log.info('OKR created', { id, title, keyResultCount: processedKeyResults.length });
        return okr;
    }

    /**
     * Get OKR by ID
     * @param {string} id - OKR ID
     * @returns {Object|null} OKR or null if not found
     */
    get(id) {
        return this._load(id);
    }

    /**
     * List all OKRs
     * @param {Object} filters - Optional filters
     * @param {string} filters.status - Filter by status
     * @param {string} filters.owner - Filter by owner
     * @param {string} filters.timeframe - Filter by timeframe
     * @returns {Object[]} Array of OKRs
     */
    list(filters = {}) {
        const files = readdirSync(this.storageDir).filter(f => f.endsWith('.json'));
        const okrs = [];

        for (const file of files) {
            try {
                const content = readFileSync(join(this.storageDir, file), 'utf-8');
                const okr = JSON.parse(content);

                // Apply filters
                if (filters.status && okr.status !== filters.status) continue;
                if (filters.owner && okr.owner !== filters.owner) continue;
                if (filters.timeframe && okr.timeframe !== filters.timeframe) continue;

                okrs.push(okr);
            } catch (error) {
                this.log.warn('Failed to load OKR file', { file, error: error.message });
            }
        }

        // Sort by creation date (newest first)
        return okrs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Update an OKR
     * @param {string} id - OKR ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated OKR or null if not found
     */
    update(id, updates) {
        const okr = this._load(id);
        if (!okr) {
            this.log.warn('OKR not found for update', { id });
            return null;
        }

        const now = new Date().toISOString();

        // Apply updates (except protected fields)
        const protectedFields = ['id', 'createdAt', 'version', 'history'];
        for (const [key, value] of Object.entries(updates)) {
            if (!protectedFields.includes(key)) {
                okr[key] = value;
            }
        }

        // Update metadata
        okr.updatedAt = now;
        okr.version += 1;
        okr.history.push({
            action: 'updated',
            timestamp: now,
            actor: updates.actor ?? 'system',
            changes: Object.keys(updates).filter(k => !protectedFields.includes(k)),
        });

        // Recalculate progress and status
        okr.progress = this._calculateProgress(okr);
        okr.status = this._determineStatus(okr);

        // Save
        this._save(okr);

        // Log audit event
        if (this.auditLogger) {
            this.auditLogger.logEvent({
                contextId: id,
                eventType: 'okr_updated',
                data: { changes: Object.keys(updates) },
                actor: updates.actor ?? 'system',
            });
        }

        this.log.info('OKR updated', { id, version: okr.version });
        return okr;
    }

    /**
     * Update key result progress
     * @param {string} okrId - OKR ID
     * @param {string} keyResultId - Key Result ID
     * @param {number} currentValue - New current value
     * @param {string} actor - Who made the update
     * @returns {Object|null} Updated OKR or null
     */
    updateKeyResultProgress(okrId, keyResultId, currentValue, actor = 'system') {
        const okr = this._load(okrId);
        if (!okr) {
            this.log.warn('OKR not found for progress update', { okrId });
            return null;
        }

        const now = new Date().toISOString();
        const kr = okr.keyResults.find(k => k.id === keyResultId);

        if (!kr) {
            this.log.warn('Key Result not found', { okrId, keyResultId });
            return null;
        }

        const previousValue = kr.currentValue;
        kr.currentValue = currentValue;
        kr.updatedAt = now;
        kr.status = this._determineKeyResultStatus(kr);

        // Update OKR metadata
        okr.updatedAt = now;
        okr.version += 1;
        okr.history.push({
            action: 'progress_updated',
            timestamp: now,
            actor,
            keyResultId,
            previousValue,
            newValue: currentValue,
        });

        // Recalculate progress
        okr.progress = this._calculateProgress(okr);
        okr.status = this._determineStatus(okr);

        // Save
        this._save(okr);

        // Log audit event
        if (this.auditLogger) {
            this.auditLogger.logEvent({
                contextId: okrId,
                eventType: 'okr_progress_updated',
                data: {
                    keyResultId,
                    previousValue,
                    newValue: currentValue,
                    overallProgress: okr.progress,
                },
                actor,
            });
        }

        this.log.info('Key Result progress updated', {
            okrId,
            keyResultId,
            progress: Math.round((currentValue / kr.targetValue) * 100)
        });

        return okr;
    }

    /**
     * Delete an OKR
     * @param {string} id - OKR ID
     * @returns {boolean} Success
     */
    delete(id) {
        const filepath = join(this.storageDir, `${id}.json`);

        if (!existsSync(filepath)) {
            this.log.warn('OKR not found for deletion', { id });
            return false;
        }

        try {
            unlinkSync(filepath);

            // Log audit event
            if (this.auditLogger) {
                this.auditLogger.logEvent({
                    contextId: id,
                    eventType: 'okr_deleted',
                    data: { id },
                    actor: 'system',
                });
            }

            this.log.info('OKR deleted', { id });
            return true;
        } catch (error) {
            this.log.error('Failed to delete OKR', { id, error: error.message });
            return false;
        }
    }

    /**
     * Get aggregate statistics
     * @returns {Object} Statistics
     */
    getStats() {
        const okrs = this.list();

        const stats = {
            total: okrs.length,
            byStatus: {},
            averageProgress: 0,
            totalKeyResults: 0,
            completedKeyResults: 0,
        };

        for (const okr of okrs) {
            stats.byStatus[okr.status] = (stats.byStatus[okr.status] ?? 0) + 1;
            stats.averageProgress += okr.progress;
            stats.totalKeyResults += okr.keyResults.length;
            stats.completedKeyResults += okr.keyResults.filter(
                kr => kr.currentValue >= kr.targetValue
            ).length;
        }

        if (okrs.length > 0) {
            stats.averageProgress = Math.round(stats.averageProgress / okrs.length);
        }

        return stats;
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _ensureDir(dir) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    _generateId() {
        return `okr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    _getCurrentTimeframe() {
        const now = new Date();
        const quarter = Math.ceil((now.getMonth() + 1) / 3);
        return `Q${quarter} ${now.getFullYear()}`;
    }

    _getDefaultEndDate() {
        const now = new Date();
        const quarter = Math.ceil((now.getMonth() + 1) / 3);
        const endMonth = quarter * 3;
        return new Date(now.getFullYear(), endMonth, 0).toISOString();
    }

    _calculateProgress(okr) {
        if (okr.keyResults.length === 0) return 0;

        let totalWeight = 0;
        let weightedProgress = 0;

        for (const kr of okr.keyResults) {
            const weight = kr.weight ?? 1;
            totalWeight += weight;

            let progress = 0;
            if (kr.type === KeyResultType.BINARY) {
                progress = kr.currentValue ? 100 : 0;
            } else {
                const range = kr.targetValue - kr.startValue;
                if (range !== 0) {
                    progress = ((kr.currentValue - kr.startValue) / range) * 100;
                }
            }

            weightedProgress += Math.min(Math.max(progress, 0), 100) * weight;
        }

        return totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
    }

    _determineStatus(okr) {
        // If manually set to completed/cancelled, keep it
        if (okr.status === OKRStatus.COMPLETED || okr.status === OKRStatus.CANCELLED) {
            return okr.status;
        }

        // Draft until activated
        if (okr.status === OKRStatus.DRAFT) {
            return OKRStatus.DRAFT;
        }

        // Check completion
        if (okr.progress >= 100) {
            return OKRStatus.COMPLETED;
        }

        // Check if on track based on time elapsed vs progress
        const now = new Date();
        const start = new Date(okr.startDate);
        const end = new Date(okr.endDate);
        const totalDuration = end - start;
        const elapsed = now - start;
        const expectedProgress = (elapsed / totalDuration) * 100;

        if (okr.progress >= expectedProgress - 10) {
            return OKRStatus.ON_TRACK;
        } else {
            return OKRStatus.AT_RISK;
        }
    }

    _determineKeyResultStatus(kr) {
        if (kr.currentValue >= kr.targetValue) {
            return OKRStatus.COMPLETED;
        }
        return OKRStatus.ACTIVE;
    }

    _save(okr) {
        const filepath = join(this.storageDir, `${okr.id}.json`);
        writeFileSync(filepath, JSON.stringify(okr, null, 2));
    }

    _load(id) {
        const filepath = join(this.storageDir, `${id}.json`);

        if (!existsSync(filepath)) {
            return null;
        }

        try {
            const content = readFileSync(filepath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            this.log.error('Failed to load OKR', { id, error: error.message });
            return null;
        }
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {OKRManager}
 */
export function createOKRManager(options = {}) {
    return new OKRManager(options);
}

export default OKRManager;
