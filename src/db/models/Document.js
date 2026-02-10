/**
 * Document Model
 * Stores RAG knowledge documents in MongoDB
 */

import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['md', 'txt', 'json', 'pdf'],
        default: 'md',
    },
    size: {
        type: Number,
        default: 0,
    },
    uploadedBy: {
        type: String,
        default: 'user',
    },
    isIngested: {
        type: Boolean,
        default: false,
    },
    metadata: {
        originalName: String,
        mimeType: String,
        chunkCount: Number,
    },
}, {
    timestamps: true,
});

// Index for search
DocumentSchema.index({ name: 'text', content: 'text' });

export const Document = mongoose.model('Document', DocumentSchema);
export default Document;
