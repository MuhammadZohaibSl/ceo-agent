/**
 * MongoDB Connection Manager
 * Handles database connection with retry logic and graceful shutdown
 */

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

let isConnected = false;

/**
 * Connect to MongoDB
 * @param {string} uri - MongoDB connection URI
 * @returns {Promise<void>}
 */
export async function connectDB(uri) {
    if (isConnected) {
        logger.info('MongoDB already connected');
        return;
    }

    if (!uri) {
        throw new Error('MongoDB URI is required');
    }

    try {
        mongoose.set('strictQuery', true);

        await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        logger.info('MongoDB connected successfully', {
            host: mongoose.connection.host,
            name: mongoose.connection.name,
        });

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error', { error: err.message });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
            isConnected = true;
        });

    } catch (error) {
        logger.error('MongoDB connection failed', { error: error.message });
        throw error;
    }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        logger.info('MongoDB disconnected gracefully');
    } catch (error) {
        logger.error('MongoDB disconnect error', { error: error.message });
    }
}

/**
 * Check connection status
 * @returns {boolean}
 */
export function isDBConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Get MongoDB connection
 * @returns {mongoose.Connection}
 */
export function getConnection() {
    return mongoose.connection;
}

export default { connectDB, disconnectDB, isDBConnected, getConnection };
