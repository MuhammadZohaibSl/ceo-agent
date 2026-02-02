/**
 * Document Loader
 * Load, parse, and chunk documents for RAG
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

/**
 * Supported file extensions
 */
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json'];

/**
 * Default chunk settings
 */
const DEFAULT_CHUNK_SIZE = 500;  // characters
const DEFAULT_CHUNK_OVERLAP = 50;

export class DocumentLoader {
    /**
     * @param {Object} options
     * @param {number} options.chunkSize - Characters per chunk
     * @param {number} options.chunkOverlap - Overlap between chunks
     */
    constructor(options = {}) {
        this.chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
        this.chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
    }

    /**
     * Load a single document
     * @param {string} filePath - Path to document
     * @returns {Object} Document with metadata
     */
    loadDocument(filePath) {
        if (!existsSync(filePath)) {
            throw new Error(`Document not found: ${filePath}`);
        }

        const ext = extname(filePath).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
            throw new Error(`Unsupported file type: ${ext}`);
        }

        const content = readFileSync(filePath, 'utf-8');
        const name = basename(filePath);

        return {
            id: this._generateId(filePath),
            name,
            path: filePath,
            content,
            type: ext.slice(1), // Remove leading dot
            loadedAt: new Date().toISOString(),
        };
    }

    /**
     * Load all documents from a directory
     * @param {string} dirPath - Path to directory
     * @param {boolean} recursive - Search subdirectories
     * @returns {Object[]} Array of documents
     */
    loadDirectory(dirPath, recursive = false) {
        if (!existsSync(dirPath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        const documents = [];
        const entries = readdirSync(dirPath);

        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stat = statSync(fullPath);

            if (stat.isFile()) {
                const ext = extname(entry).toLowerCase();
                if (SUPPORTED_EXTENSIONS.includes(ext)) {
                    try {
                        documents.push(this.loadDocument(fullPath));
                    } catch (error) {
                        console.warn(`Failed to load ${fullPath}: ${error.message}`);
                    }
                }
            } else if (stat.isDirectory() && recursive) {
                documents.push(...this.loadDirectory(fullPath, true));
            }
        }

        return documents;
    }

    /**
     * Chunk a document into smaller pieces
     * @param {Object} document - Document to chunk
     * @returns {Object[]} Array of chunks
     */
    chunkDocument(document) {
        const content = document.content ?? '';
        const chunks = [];

        // Split by paragraphs first for more natural breaks
        const paragraphs = content.split(/\n\n+/);
        let currentChunk = '';
        let chunkIndex = 0;

        for (const paragraph of paragraphs) {
            // If adding this paragraph exceeds chunk size, save current and start new
            if (currentChunk.length + paragraph.length > this.chunkSize && currentChunk.length > 0) {
                chunks.push(this._createChunk(document, currentChunk, chunkIndex));
                chunkIndex++;

                // Keep overlap from previous chunk
                const overlapStart = Math.max(0, currentChunk.length - this.chunkOverlap);
                currentChunk = currentChunk.slice(overlapStart) + '\n\n' + paragraph;
            } else {
                currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
            }

            // If single paragraph exceeds chunk size, force split
            while (currentChunk.length > this.chunkSize) {
                const splitPoint = this._findSplitPoint(currentChunk, this.chunkSize);
                chunks.push(this._createChunk(document, currentChunk.slice(0, splitPoint), chunkIndex));
                chunkIndex++;
                currentChunk = currentChunk.slice(splitPoint - this.chunkOverlap);
            }
        }

        // Don't forget the last chunk
        if (currentChunk.trim().length > 0) {
            chunks.push(this._createChunk(document, currentChunk, chunkIndex));
        }

        return chunks;
    }

    /**
     * Load and chunk a document in one step
     * @param {string} filePath - Path to document
     * @returns {Object[]} Array of chunks
     */
    loadAndChunk(filePath) {
        const document = this.loadDocument(filePath);
        return this.chunkDocument(document);
    }

    /**
     * Load and chunk all documents from a directory
     * @param {string} dirPath - Path to directory
     * @param {boolean} recursive - Search subdirectories
     * @returns {Object[]} Array of all chunks
     */
    loadAndChunkDirectory(dirPath, recursive = false) {
        const documents = this.loadDirectory(dirPath, recursive);
        const allChunks = [];

        for (const doc of documents) {
            allChunks.push(...this.chunkDocument(doc));
        }

        return allChunks;
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _generateId(filePath) {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _createChunk(document, content, index) {
        return {
            id: `${document.id}_chunk_${index}`,
            documentId: document.id,
            documentName: document.name,
            content: content.trim(),
            chunkIndex: index,
            charCount: content.length,
            createdAt: new Date().toISOString(),
        };
    }

    _findSplitPoint(text, maxLength) {
        // Try to split at sentence boundary
        const sentenceEnd = text.lastIndexOf('. ', maxLength);
        if (sentenceEnd > maxLength * 0.5) {
            return sentenceEnd + 2;
        }

        // Try to split at word boundary
        const wordEnd = text.lastIndexOf(' ', maxLength);
        if (wordEnd > maxLength * 0.5) {
            return wordEnd + 1;
        }

        // Force split at maxLength
        return maxLength;
    }
}

export default DocumentLoader;
