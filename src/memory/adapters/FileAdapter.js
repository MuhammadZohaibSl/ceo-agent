/**
 * File Adapter
 * JSON file persistence for long-term memory
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class FileAdapter {
    /**
     * @param {string} filePath - Path to the JSON file
     */
    constructor(filePath) {
        this.filePath = filePath;
        this._ensureDirectory();
    }

    /**
     * Load data from file
     * @returns {Object} Parsed JSON data or empty object
     */
    load() {
        try {
            if (!existsSync(this.filePath)) {
                return { entries: [], metadata: { createdAt: new Date().toISOString() } };
            }

            const content = readFileSync(this.filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`FileAdapter: Failed to load ${this.filePath}:`, error.message);
            return { entries: [], metadata: { createdAt: new Date().toISOString() } };
        }
    }

    /**
     * Save data to file
     * @param {Object} data - Data to save
     * @returns {boolean} Success status
     */
    save(data) {
        try {
            this._ensureDirectory();

            const content = JSON.stringify({
                ...data,
                metadata: {
                    ...data.metadata,
                    updatedAt: new Date().toISOString(),
                },
            }, null, 2);

            writeFileSync(this.filePath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error(`FileAdapter: Failed to save ${this.filePath}:`, error.message);
            return false;
        }
    }

    /**
     * Append entries to file
     * @param {Object[]} entries - Entries to append
     * @returns {boolean} Success status
     */
    append(entries) {
        const data = this.load();
        data.entries = [...(data.entries ?? []), ...entries];
        return this.save(data);
    }

    /**
     * Check if file exists
     * @returns {boolean}
     */
    exists() {
        return existsSync(this.filePath);
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _ensureDirectory() {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }
}

export default FileAdapter;
