/**
 * Feedback Model
 * Stores user feedback (ratings, corrections, outcomes)
 */

import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
    contextId: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['rating', 'correction', 'outcome'],
        required: true,
        index: true,
    },
    // For ratings
    rating: {
        value: { type: Number, min: 1, max: 5 },
        comment: String,
        ratedBy: String,
    },
    // For corrections
    correction: {
        field: String,
        originalValue: mongoose.Schema.Types.Mixed,
        correctedValue: mongoose.Schema.Types.Mixed,
        reason: String,
        correctedBy: String,
    },
    // For outcomes
    outcome: {
        status: { type: String, enum: ['success', 'partial', 'failure', 'unknown'] },
        metrics: mongoose.Schema.Types.Mixed,
        notes: String,
        recordedBy: String,
    },
}, {
    timestamps: true,
});

// Compound indexes for analytics
FeedbackSchema.index({ contextId: 1, type: 1 });
FeedbackSchema.index({ type: 1, createdAt: -1 });
FeedbackSchema.index({ 'rating.value': 1 });

export const Feedback = mongoose.model('Feedback', FeedbackSchema);
export default Feedback;
