/**
 * OKR Model
 * Stores Objectives and Key Results
 */

import mongoose from 'mongoose';

const KeyResultSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['percentage', 'number', 'currency', 'binary'],
        default: 'percentage',
    },
    targetValue: {
        type: Number,
        required: true,
    },
    currentValue: {
        type: Number,
        default: 0,
    },
    startValue: {
        type: Number,
        default: 0,
    },
    unit: String,
    status: {
        type: String,
        enum: ['not_started', 'on_track', 'at_risk', 'behind', 'completed'],
        default: 'not_started',
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    history: [{
        value: Number,
        updatedAt: Date,
        updatedBy: String,
    }],
});

const OKRSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        index: true,
    },
    description: String,
    owner: {
        type: String,
        index: true,
    },
    timeframe: {
        type: String,
        index: true,
    },
    startDate: Date,
    endDate: Date,
    status: {
        type: String,
        enum: ['draft', 'active', 'completed', 'cancelled'],
        default: 'draft',
        index: true,
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    keyResults: [KeyResultSchema],
    tags: [String],
}, {
    timestamps: true,
    optimisticConcurrency: true,
});

// Compound indexes
OKRSchema.index({ status: 1, timeframe: 1 });
OKRSchema.index({ owner: 1, status: 1 });

export const OKR = mongoose.model('OKR', OKRSchema);
export default OKR;
