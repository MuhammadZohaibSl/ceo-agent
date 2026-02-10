/**
 * Settings Model
 * Stores application settings with optimistic locking
 */

import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    updatedBy: {
        type: String,
        default: 'system',
    },
}, {
    timestamps: true,
    optimisticConcurrency: true, // Enables version-based optimistic locking
});

// Static method to get a setting with default value
SettingsSchema.statics.getSetting = async function (key, defaultValue = null) {
    const setting = await this.findOne({ key });
    return setting ? setting.value : defaultValue;
};

// Static method to set a setting (upsert)
SettingsSchema.statics.setSetting = async function (key, value, updatedBy = 'system') {
    return this.findOneAndUpdate(
        { key },
        { value, updatedBy },
        { upsert: true, new: true, runValidators: true }
    );
};

export const Settings = mongoose.model('Settings', SettingsSchema);
export default Settings;
