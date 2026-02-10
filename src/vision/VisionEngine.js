/**
 * Vision Engine
 * LLM-powered vision statement generation and management
 * 
 * Generates:
 * - Mission statements
 * - Vision statements
 * - Strategic bets (max 3 as per strategy chart)
 * - Strategic priorities
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

/**
 * Vision status
 */
export const VisionStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    ARCHIVED: 'archived',
};

/**
 * Maximum strategic bets allowed (from strategy chart constraint)
 */
const MAX_STRATEGIC_BETS = 3;

/**
 * Vision generation prompt template
 */
const VISION_PROMPT = `
You are a strategic planning expert helping a CEO formulate a company vision. Use any relevant details from the given context (industry, size, products, challenges, etc.) to inform your answers.

Based on the following context:
{context}

Generate a comprehensive strategic vision with:
1. A clear, inspiring **VISION** statement (1-2 sentences about the future state).
2. A concise **MISSION** statement (what the company does and for whom).
3. Up to 3 **STRATEGIC BETS** (major initiatives to achieve the vision).

For each strategic bet, provide:
- **Title** (short, memorable initiative name)
- **Description** (2-3 sentences, data-driven and realistic)
- **Timeline** (realistic timeframe, e.g. "12–18 months")
- **Success Metrics** (2-3 specific, measurable outcomes, e.g., growth targets, KPIs)
- **Risk Level** (low/medium/high, with justification via context)

Use a formal, data-driven tone. Make each initiative realistic and innovative, citing relevant context or industry trends if possible. 

Format your response exactly as follows (do not add extra sections or labels):

VISION: [Vision statement]  
MISSION: [Mission statement]  

STRATEGIC BET 1: [Title]  
DESCRIPTION: [Description]  
TIMELINE: [Timeline]  
METRICS: [Comma-separated metrics, numerical where possible]  
RISK: [low/medium/high]  

STRATEGIC BET 2: [Title]  
DESCRIPTION: [Description]  
TIMELINE: [Timeline]  
METRICS: [Comma-separated metrics]  
RISK: [low/medium/high]  

(Continue for up to 3 strategic bets in the same format.)
`;


/**
 * Vision Engine Class
 */
export class VisionEngine {
    /**
     * @param {Object} options
     * @param {Object} options.llmClient - LLM client for generation
     * @param {string} options.storageDir - Directory for vision storage
     * @param {Object} options.auditLogger - Audit logger instance
     */
    constructor(options = {}) {
        this.llmClient = options.llmClient ?? null;
        this.storageDir = options.storageDir ?? './data/vision';
        this.auditLogger = options.auditLogger;
        this.log = logger.child({ component: 'VisionEngine' });

        this._ensureDir(this.storageDir);
        this.log.info('VisionEngine initialized', { storageDir: this.storageDir });
    }

    /**
     * Generate a new vision using LLM
     * @param {Object} params
     * @param {string} params.context - Company/market context
     * @param {string} params.industry - Industry/sector
     * @param {string} params.companyName - Company name
     * @param {string[]} params.existingStrengths - Current strengths
     * @param {string[]} params.challenges - Current challenges
     * @param {string} params.timeHorizon - Vision time horizon (e.g., "5 years")
     * @returns {Promise<Object>} Generated vision
     */
    async generate(params) {
        const {
            context = '',
            industry = '',
            companyName = 'Our Company',
            existingStrengths = [],
            challenges = [],
            timeHorizon = '3-5 years',
        } = params;

        this.log.info('Generating vision', { companyName, industry });

        // Build context for LLM
        const contextStr = this._buildContext({
            context,
            industry,
            companyName,
            existingStrengths,
            challenges,
            timeHorizon,
        });

        let visionData;

        if (this.llmClient) {
            // Generate using LLM
            visionData = await this._generateWithLLM(contextStr);
        } else {
            // Fallback to template-based generation
            visionData = this._generateFromTemplate(params);
        }

        // Create vision object
        const id = this._generateId();
        const now = new Date().toISOString();

        const vision = {
            id,
            companyName,
            industry,
            timeHorizon,
            vision: visionData.vision,
            mission: visionData.mission,
            strategicBets: visionData.strategicBets.slice(0, MAX_STRATEGIC_BETS),
            status: VisionStatus.DRAFT,
            context: {
                existingStrengths,
                challenges,
                rawContext: context,
            },
            createdAt: now,
            updatedAt: now,
            version: 1,
            history: [{
                action: 'generated',
                timestamp: now,
                actor: 'system',
            }],
        };

        // Validate coherence
        const coherence = this._validateCoherence(vision);
        vision.coherenceScore = coherence.score;
        vision.coherenceIssues = coherence.issues;

        // Save
        this._save(vision);

        // Log audit event
        if (this.auditLogger) {
            this.auditLogger.logEvent({
                contextId: id,
                eventType: 'vision_generated',
                data: {
                    companyName,
                    strategicBetCount: vision.strategicBets.length,
                    coherenceScore: coherence.score,
                },
                actor: 'system',
            });
        }

        this.log.info('Vision generated', {
            id,
            strategicBets: vision.strategicBets.length,
            coherenceScore: coherence.score,
        });

        return vision;
    }

    /**
     * Get current active vision
     * @returns {Object|null} Active vision or null
     */
    getCurrent() {
        const visions = this.list({ status: VisionStatus.ACTIVE });
        return visions[0] ?? null;
    }

    /**
     * Get vision by ID
     * @param {string} id - Vision ID
     * @returns {Object|null} Vision or null
     */
    get(id) {
        return this._load(id);
    }

    /**
     * List all visions
     * @param {Object} filters
     * @param {string} filters.status - Filter by status
     * @returns {Object[]} Array of visions
     */
    list(filters = {}) {
        const files = existsSync(this.storageDir)
            ? require('fs').readdirSync(this.storageDir).filter(f => f.startsWith('vision_') && f.endsWith('.json'))
            : [];

        const visions = [];

        for (const file of files) {
            try {
                const content = readFileSync(join(this.storageDir, file), 'utf-8');
                const vision = JSON.parse(content);

                if (filters.status && vision.status !== filters.status) continue;

                visions.push(vision);
            } catch (error) {
                this.log.warn('Failed to load vision file', { file, error: error.message });
            }
        }

        return visions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Update a vision
     * @param {string} id - Vision ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated vision
     */
    update(id, updates) {
        const vision = this._load(id);
        if (!vision) {
            this.log.warn('Vision not found for update', { id });
            return null;
        }

        const now = new Date().toISOString();
        const protectedFields = ['id', 'createdAt', 'version', 'history'];

        // Apply updates
        for (const [key, value] of Object.entries(updates)) {
            if (!protectedFields.includes(key)) {
                // Enforce max strategic bets
                if (key === 'strategicBets' && Array.isArray(value)) {
                    vision[key] = value.slice(0, MAX_STRATEGIC_BETS);
                } else {
                    vision[key] = value;
                }
            }
        }

        // Update metadata
        vision.updatedAt = now;
        vision.version += 1;
        vision.history.push({
            action: 'updated',
            timestamp: now,
            actor: updates.actor ?? 'user',
            changes: Object.keys(updates).filter(k => !protectedFields.includes(k)),
        });

        // Re-validate coherence
        const coherence = this._validateCoherence(vision);
        vision.coherenceScore = coherence.score;
        vision.coherenceIssues = coherence.issues;

        // Save
        this._save(vision);

        // Log audit event
        if (this.auditLogger) {
            this.auditLogger.logEvent({
                contextId: id,
                eventType: 'vision_updated',
                data: { changes: Object.keys(updates), version: vision.version },
                actor: updates.actor ?? 'user',
            });
        }

        this.log.info('Vision updated', { id, version: vision.version });
        return vision;
    }

    /**
     * Activate a vision (deactivates others)
     * @param {string} id - Vision ID
     * @returns {Object|null} Activated vision
     */
    activate(id) {
        // Deactivate all other visions
        const allVisions = this.list();
        for (const v of allVisions) {
            if (v.id !== id && v.status === VisionStatus.ACTIVE) {
                this.update(v.id, { status: VisionStatus.ARCHIVED, actor: 'system' });
            }
        }

        // Activate this vision
        return this.update(id, { status: VisionStatus.ACTIVE, actor: 'system' });
    }

    /**
     * Validate vision coherence
     * @param {string} id - Vision ID
     * @returns {Object} Coherence check result
     */
    validateCoherence(id) {
        const vision = this._load(id);
        if (!vision) {
            return { valid: false, score: 0, issues: ['Vision not found'] };
        }
        return this._validateCoherence(vision);
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    _ensureDir(dir) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    _generateId() {
        return `vision_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    _buildContext(params) {
        const parts = [];

        if (params.companyName) {
            parts.push(`Company: ${params.companyName}`);
        }
        if (params.industry) {
            parts.push(`Industry: ${params.industry}`);
        }
        if (params.timeHorizon) {
            parts.push(`Time Horizon: ${params.timeHorizon}`);
        }
        if (params.existingStrengths?.length > 0) {
            parts.push(`Strengths: ${params.existingStrengths.join(', ')}`);
        }
        if (params.challenges?.length > 0) {
            parts.push(`Challenges: ${params.challenges.join(', ')}`);
        }
        if (params.context) {
            parts.push(`Additional Context: ${params.context}`);
        }

        return parts.join('\n');
    }

    async _generateWithLLM(context) {
        const prompt = VISION_PROMPT.replace('{context}', context);

        try {
            const response = await this.llmClient.generateText(prompt);
            return this._parseVisionResponse(response);
        } catch (error) {
            this.log.error('LLM vision generation failed', { error: error.message });
            return this._generateFromTemplate({ context });
        }
    }

    _parseVisionResponse(response) {
        const result = {
            vision: '',
            mission: '',
            strategicBets: [],
        };

        // Extract vision
        const visionMatch = response.match(/VISION:\s*([^\n]+(?:\n(?!MISSION)[^\n]+)*)/i);
        if (visionMatch) {
            result.vision = visionMatch[1].trim();
        }

        // Extract mission
        const missionMatch = response.match(/MISSION:\s*([^\n]+(?:\n(?!STRATEGIC)[^\n]+)*)/i);
        if (missionMatch) {
            result.mission = missionMatch[1].trim();
        }

        // Extract strategic bets
        const betPattern = /STRATEGIC BET \d+:\s*([^\n]+)\nDESCRIPTION:\s*([^\n]+(?:\n(?!TIMELINE)[^\n]+)*)\nTIMELINE:\s*([^\n]+)\nMETRICS:\s*([^\n]+)\nRISK:\s*([^\n]+)/gi;
        let match;

        while ((match = betPattern.exec(response)) !== null) {
            result.strategicBets.push({
                id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                title: match[1].trim(),
                description: match[2].trim(),
                timeline: match[3].trim(),
                metrics: match[4].split(',').map(m => m.trim()),
                riskLevel: match[5].trim().toLowerCase(),
                status: 'planned',
            });
        }

        return result;
    }

    _generateFromTemplate(params) {
        // Fallback template-based generation
        const companyName = params.companyName ?? 'Our Organization';
        const industry = params.industry ?? 'industry';
        const timeHorizon = params.timeHorizon ?? '3-5 years';

        return {
            vision: `To be the leading innovator in ${industry}, transforming how value is created and delivered to stakeholders over the next ${timeHorizon}.`,
            mission: `${companyName} exists to deliver exceptional solutions that address critical challenges in ${industry}, empowering our customers to achieve more.`,
            strategicBets: [
                {
                    id: `bet_${Date.now()}_1`,
                    title: 'Digital Transformation',
                    description: 'Accelerate digital capabilities to enhance customer experience and operational efficiency.',
                    timeline: '12-18 months',
                    metrics: ['Customer satisfaction +20%', 'Operational costs -15%'],
                    riskLevel: 'medium',
                    status: 'planned',
                },
                {
                    id: `bet_${Date.now()}_2`,
                    title: 'Market Expansion',
                    description: 'Enter new geographic markets and customer segments to diversify revenue streams.',
                    timeline: '18-24 months',
                    metrics: ['Revenue from new markets +30%', '3 new market entries'],
                    riskLevel: 'high',
                    status: 'planned',
                },
                {
                    id: `bet_${Date.now()}_3`,
                    title: 'Sustainability Leadership',
                    description: 'Establish industry-leading sustainability practices that create competitive advantage.',
                    timeline: '24-36 months',
                    metrics: ['Carbon footprint -40%', 'ESG rating improvement'],
                    riskLevel: 'low',
                    status: 'planned',
                },
            ],
        };
    }

    _validateCoherence(vision) {
        const issues = [];
        let score = 100;

        // Check vision statement
        if (!vision.vision || vision.vision.length < 20) {
            issues.push('Vision statement is too short or missing');
            score -= 20;
        }

        // Check mission statement
        if (!vision.mission || vision.mission.length < 20) {
            issues.push('Mission statement is too short or missing');
            score -= 20;
        }

        // Check strategic bets
        if (!vision.strategicBets || vision.strategicBets.length === 0) {
            issues.push('No strategic bets defined');
            score -= 30;
        } else {
            // Check each bet has required fields
            for (const bet of vision.strategicBets) {
                if (!bet.title || !bet.description) {
                    issues.push(`Strategic bet missing title or description`);
                    score -= 10;
                }
                if (!bet.metrics || bet.metrics.length === 0) {
                    issues.push(`Strategic bet "${bet.title}" has no success metrics`);
                    score -= 5;
                }
            }
        }

        // Check alignment between vision and bets
        if (vision.vision && vision.strategicBets?.length > 0) {
            const visionWords = vision.vision.toLowerCase().split(/\s+/);
            let alignedBets = 0;

            for (const bet of vision.strategicBets) {
                const betWords = (bet.title + ' ' + bet.description).toLowerCase().split(/\s+/);
                const overlap = visionWords.filter(w => betWords.includes(w) && w.length > 4);
                if (overlap.length > 0) alignedBets++;
            }

            if (alignedBets === 0) {
                issues.push('Strategic bets may not align well with vision statement');
                score -= 15;
            }
        }

        return {
            valid: score >= 60,
            score: Math.max(0, score),
            issues,
        };
    }

    _save(vision) {
        const filepath = join(this.storageDir, `${vision.id}.json`);
        writeFileSync(filepath, JSON.stringify(vision, null, 2));
    }

    _load(id) {
        const filepath = join(this.storageDir, `${id}.json`);

        if (!existsSync(filepath)) {
            return null;
        }

        try {
            const content = readFileSync(filepath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            this.log.error('Failed to load vision', { id, error: error.message });
            return null;
        }
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {VisionEngine}
 */
export function createVisionEngine(options = {}) {
    return new VisionEngine(options);
}

export default VisionEngine;
