/**
 * Approval Model
 * Stores approval requests for human-in-the-loop decisions
 */

import mongoose from 'mongoose';

const ApprovalSchema = new mongoose.Schema({
    contextId: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired', 'modified'],
        default: 'pending',
        index: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
        index: true,
    },
    proposal: {
        summary: String,
        recommendation: String,
        options: [mongoose.Schema.Types.Mixed],
        riskLevel: String,
        confidence: Number,
        requiresHumanApproval: Boolean,
    },
    requiredBy: {
        type: String,
        default: 'human',
    },
    outcome: {
        decision: String,
        decidedBy: String,
        decidedAt: Date,
        notes: String,
        modifications: mongoose.Schema.Types.Mixed,
    },
    expiresAt: {
        type: Date,
        index: true,
    },
}, {
    timestamps: true,
    optimisticConcurrency: true,
});

// Compound index for common queries
ApprovalSchema.index({ status: 1, createdAt: -1 });
ApprovalSchema.index({ contextId: 1, status: 1 });

// Virtual for checking expiration
ApprovalSchema.virtual('isExpired').get(function () {
    return this.expiresAt && new Date() > this.expiresAt;
});

export const Approval = mongoose.model('Approval', ApprovalSchema);
export default Approval;
