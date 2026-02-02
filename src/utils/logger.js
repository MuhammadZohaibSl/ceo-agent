/**
 * Logger Utility
 * Structured logging for the CEO Agent
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format log entry as structured JSON
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log entry
 */
function formatLog(level, message, meta = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
    };
    return JSON.stringify(entry);
}

/**
 * Logger object with level methods
 */
const logger = {
    debug(message, meta = {}) {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            console.debug(formatLog('DEBUG', message, meta));
        }
    },

    info(message, meta = {}) {
        if (currentLevel <= LOG_LEVELS.INFO) {
            console.info(formatLog('INFO', message, meta));
        }
    },

    warn(message, meta = {}) {
        if (currentLevel <= LOG_LEVELS.WARN) {
            console.warn(formatLog('WARN', message, meta));
        }
    },

    error(message, meta = {}) {
        if (currentLevel <= LOG_LEVELS.ERROR) {
            console.error(formatLog('ERROR', message, meta));
        }
    },

    /**
     * Create a child logger with preset context
     * @param {Object} context - Context to include in all logs
     * @returns {Object} Child logger
     */
    child(context) {
        return {
            debug: (msg, meta) => logger.debug(msg, { ...context, ...meta }),
            info: (msg, meta) => logger.info(msg, { ...context, ...meta }),
            warn: (msg, meta) => logger.warn(msg, { ...context, ...meta }),
            error: (msg, meta) => logger.error(msg, { ...context, ...meta }),
        };
    },
};

export default logger;
