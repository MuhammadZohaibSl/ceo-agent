/**
 * Database Module Index
 * Exports all models and connection utilities
 */

export { connectDB, disconnectDB, isDBConnected, getConnection } from './connection.js';

// Models
export { Settings } from './models/Settings.js';
export { Approval } from './models/Approval.js';
export { Feedback } from './models/Feedback.js';
export { OKR } from './models/OKR.js';
export { Vision } from './models/Vision.js';
export { Document } from './models/Document.js';

export default {
    connectDB: (await import('./connection.js')).connectDB,
    disconnectDB: (await import('./connection.js')).disconnectDB,
    isDBConnected: (await import('./connection.js')).isDBConnected,
};
