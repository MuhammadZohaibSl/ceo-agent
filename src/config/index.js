/**
 * Configuration Loader
 * Loads and validates all configuration files for the CEO Agent
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

/**
 * Default configuration values
 */
const DEFAULTS = {
  agent: {
    maxIterations: 5,
    confidenceThreshold: 0.7,
    similarityThreshold: 0.85,
  },
  llm: {
    defaultProvider: 'groq',
    timeout: 30000,
    maxRetries: 3,
  },
};

/**
 * Load a JSON policy file
 * @param {string} filename - Policy filename
 * @returns {Object} Parsed policy object
 */
function loadPolicy(filename) {
  const policyPath = join(ROOT_DIR, 'policies', filename);

  if (!existsSync(policyPath)) {
    console.warn(`Policy file not found: ${filename}, using defaults`);
    return {};
  }

  try {
    const content = readFileSync(policyPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load policy ${filename}:`, error.message);
    return {};
  }
}

/**
 * Load environment variables with defaults
 * @param {string} key - Environment variable key
 * @param {*} defaultValue - Default value if not set
 * @returns {*} Environment value or default
 */
function env(key, defaultValue = undefined) {
  return process.env[key] ?? defaultValue;
}

/**
 * Configuration object
 */
const config = {
  // Agent settings
  agent: {
    maxIterations: parseInt(env('AGENT_MAX_ITERATIONS', DEFAULTS.agent.maxIterations)),
    confidenceThreshold: parseFloat(env('AGENT_CONFIDENCE_THRESHOLD', DEFAULTS.agent.confidenceThreshold)),
    similarityThreshold: parseFloat(env('AGENT_SIMILARITY_THRESHOLD', DEFAULTS.agent.similarityThreshold)),
  },

  // LLM settings
  llm: {
    defaultProvider: env('LLM_DEFAULT_PROVIDER', DEFAULTS.llm.defaultProvider),
    timeout: parseInt(env('LLM_TIMEOUT', DEFAULTS.llm.timeout)),
    maxRetries: parseInt(env('LLM_MAX_RETRIES', DEFAULTS.llm.maxRetries)),
    providers: {
      groq: {
        apiKey: env('GROQ_API_KEY'),
        model: env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
      },
    },
  },

  // Policies (loaded from files)
  policies: {
    decision: loadPolicy('default.decision.json'),
    context: loadPolicy('default.context.json'),
  },

  // Paths
  paths: {
    root: ROOT_DIR,
    data: join(ROOT_DIR, 'data'),
    memory: join(ROOT_DIR, 'data', 'memory'),
    audit: join(ROOT_DIR, 'data', 'audit'),
  },
};

/**
 * Validate required configuration
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateConfig() {
  const errors = [];

  // Check at least one LLM provider is configured
  const hasProvider = Object.values(config.llm.providers).some(p => p.apiKey);
  if (!hasProvider) {
    errors.push('At least one LLM provider API key must be configured');
  }

  // Check decision policy has required fields
  const requiredPolicyFields = ['riskAppetite', 'ethicalRedLines'];
  for (const field of requiredPolicyFields) {
    if (config.policies.decision[field] === undefined) {
      errors.push(`Decision policy missing required field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get a nested config value safely
 * @param {string} path - Dot-notation path (e.g., 'llm.timeout')
 * @param {*} defaultValue - Default if not found
 * @returns {*} Config value
 */
export function get(path, defaultValue = undefined) {
  const keys = path.split('.');
  let value = config;

  for (const key of keys) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    value = value[key];
  }

  return value ?? defaultValue;
}

export default config;
