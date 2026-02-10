/**
 * Vision Model
 * Stores strategic vision statements
 */

import mongoose from 'mongoose';

const VisionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    statement: {
        type: String,
        required: true,
    },
    description: String,
    companyName: String,
    industry: String,
    timeHorizon: String,
    pillars: [{
        name: String,
        description: String,
        priority: Number,
    }],
    values: [String],
    goals: [String],
    isActive: {
        type: Boolean,
        default: false,
        index: true,
    },
    coherenceScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    generatedBy: {
        type: String,
        default: 'llm',
    },
    metadata: {
        context: String,
        strengths: [String],
        challenges: [String],
    },
}, {
    timestamps: true,
    optimisticConcurrency: true,
});

// Only one vision can be active
VisionSchema.pre('save', async function (next) {
    if (this.isActive && this.isModified('isActive')) {
        await mongoose.model('Vision').updateMany(
            { _id: { $ne: this._id }, isActive: true },
            { isActive: false }
        );
    }
    next();
});

export const Vision = mongoose.model('Vision', VisionSchema);
export default Vision;
