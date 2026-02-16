/**
 * Analysis Pipeline
 * Orchestrates multi-step analysis with 6 areas:
 *   1. Ideation
 *   2. Business Model
 *   3. Market Risk
 *   4. Technical Feasibility
 *   5. Technical Risk
 *   6. User Experience
 *
 * Supports: step-by-step execution, human review gates,
 *           artifact editing, and inline commenting.
 */

import logger from '../utils/logger.js';

// Simple unique ID generator (no external dependency)
function generateId() {
    return `pipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateCommentId() {
    return `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function generateEditId() {
    return `edit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ─────────────────────────────────────────────────────────────
// Step Definitions
// ─────────────────────────────────────────────────────────────

export const PIPELINE_STEPS = [
    {
        id: 'ideation',
        name: 'Ideation',
        icon: '💡',
        description: 'Creative options, brainstorming, innovative approaches',
    },
    {
        id: 'business_model',
        name: 'Business Model',
        icon: '📊',
        description: 'Revenue model, unit economics, monetization strategy',
    },
    {
        id: 'market_risk',
        name: 'Market Risk',
        icon: '📉',
        description: 'Market size, competitors, adoption barriers, timing',
    },
    {
        id: 'technical_feasibility',
        name: 'Technical Feasibility',
        icon: '⚙️',
        description: 'Tech stack, implementation complexity, resource requirements',
    },
    {
        id: 'technical_risk',
        name: 'Technical Risk',
        icon: '🛡️',
        description: 'Scalability, security, technical debt, integration risk',
    },
    {
        id: 'user_experience',
        name: 'User Experience',
        icon: '🎨',
        description: 'User needs, usability, adoption friction, UX strategy',
    },
];

// ─────────────────────────────────────────────────────────────
// Prompts for each analysis area
// ─────────────────────────────────────────────────────────────

const STEP_PROMPTS = {
    ideation: `You are a creative strategist helping a CEO brainstorm solutions.

## BUSINESS QUESTION
{{query}}

## PREVIOUS CONTEXT
{{previousContext}}

## YOUR TASK
Generate creative and innovative ideas to address this business question.
Think broadly — consider unconventional approaches, emerging technologies, and cross-industry inspiration.

Provide your analysis in this exact format:

KEY_FINDINGS:
- [Insight 1]
- [Insight 2]
- [Insight 3]
- [Insight 4]
- [Insight 5]

IDEAS:
1. **[Idea Title]**: [2-3 sentence description of the idea, how it works, and why it could succeed]
2. **[Idea Title]**: [2-3 sentence description]
3. **[Idea Title]**: [2-3 sentence description]
4. **[Idea Title]**: [2-3 sentence description]
5. **[Idea Title]**: [2-3 sentence description]

RECOMMENDATIONS:
- [Top recommendation and why]
- [Second recommendation]
- [What to avoid]

SCORE: [1-10 rating of how promising the ideation space is]`,

    business_model: `You are a business model strategist advising a CEO.

## BUSINESS QUESTION
{{query}}

## PREVIOUS CONTEXT
{{previousContext}}

## YOUR TASK
Analyze the business model implications of this question. Consider revenue streams, cost structures, value propositions, and unit economics.

Provide your analysis in this exact format:

KEY_FINDINGS:
- [Finding 1 about business viability]
- [Finding 2 about revenue potential]
- [Finding 3 about cost structure]
- [Finding 4 about competitive positioning]
- [Finding 5 about scalability]

ANALYSIS:
**Revenue Model**: [Describe potential revenue streams and pricing strategy]
**Cost Structure**: [Describe key cost drivers and economics]
**Value Proposition**: [What unique value does this deliver?]
**Unit Economics**: [Key metrics — CAC, LTV, margins]
**Scalability**: [Can this grow efficiently?]

RISKS:
- [Business model risk 1]
- [Business model risk 2]
- [Business model risk 3]

RECOMMENDATIONS:
- [Top business model recommendation]
- [Alternative approach]
- [Key metric to track]

SCORE: [1-10 rating of business model strength]`,

    market_risk: `You are a market analyst advising a CEO on risk.

## BUSINESS QUESTION
{{query}}

## PREVIOUS CONTEXT
{{previousContext}}

## YOUR TASK
Assess market risks, competitive landscape, and adoption barriers.

Provide your analysis in this exact format:

KEY_FINDINGS:
- [Market size insight]
- [Competitive landscape finding]
- [Timing/adoption finding]
- [Regulatory/external risk]
- [Opportunity window finding]

ANALYSIS:
**Market Size & Growth**: [TAM, SAM, SOM estimates and growth trajectory]
**Competitive Landscape**: [Key competitors, their strengths, and gaps]
**Adoption Barriers**: [What could prevent market adoption?]
**Market Timing**: [Is the timing right? What factors affect timing?]
**Regulatory Environment**: [Any regulatory risks or requirements?]

RISKS:
- [Market risk 1 with probability: high/medium/low]
- [Market risk 2 with probability: high/medium/low]
- [Market risk 3 with probability: high/medium/low]
- [Market risk 4 with probability: high/medium/low]

RECOMMENDATIONS:
- [How to mitigate the top market risk]
- [Market entry strategy recommendation]
- [Key market signal to monitor]

SCORE: [1-10 rating of market favorability]`,

    technical_feasibility: `You are a technical architect advising a CEO.

## BUSINESS QUESTION
{{query}}

## PREVIOUS CONTEXT
{{previousContext}}

## YOUR TASK
Assess the technical feasibility of implementing solutions to this business question.

Provide your analysis in this exact format:

KEY_FINDINGS:
- [Technical capability finding]
- [Resource/skill requirement]
- [Integration complexity finding]
- [Timeline feasibility]
- [Technology maturity finding]

ANALYSIS:
**Technology Stack**: [What technologies are needed? Are they mature?]
**Implementation Complexity**: [How complex is this to build? Rate: Low/Medium/High]
**Resource Requirements**: [Team size, skills needed, infrastructure]
**Integration Points**: [What existing systems need integration?]
**Build vs Buy**: [Should components be built in-house or purchased?]

RISKS:
- [Technical feasibility risk 1]
- [Technical feasibility risk 2]
- [Technical feasibility risk 3]

RECOMMENDATIONS:
- [Primary technical approach recommendation]
- [Phase 1 quick-win suggestion]
- [Critical technical decision to make first]

SCORE: [1-10 rating of technical feasibility]`,

    technical_risk: `You are a technical risk assessor advising a CEO.

## BUSINESS QUESTION
{{query}}

## PREVIOUS CONTEXT
{{previousContext}}

## YOUR TASK
Identify and assess technical risks, including scalability, security, technical debt, and integration risks.

Provide your analysis in this exact format:

KEY_FINDINGS:
- [Scalability risk finding]
- [Security concern]
- [Technical debt implication]
- [Integration risk]
- [Data/compliance finding]

ANALYSIS:
**Scalability Risks**: [Can the solution handle growth? What breaks at scale?]
**Security Concerns**: [Data protection, attack vectors, compliance]
**Technical Debt**: [What shortcuts might be taken? Long-term implications?]
**Integration Risks**: [What can go wrong with system integrations?]
**Data & Compliance**: [Data governance, privacy regulations, audit requirements]

RISKS:
- [Technical risk 1: severity high/medium/low, mitigation strategy]
- [Technical risk 2: severity high/medium/low, mitigation strategy]
- [Technical risk 3: severity high/medium/low, mitigation strategy]
- [Technical risk 4: severity high/medium/low, mitigation strategy]

RECOMMENDATIONS:
- [Top risk mitigation strategy]
- [Security hardening recommendation]
- [Technical debt management approach]

SCORE: [1-10 rating of technical risk level, where 10 = lowest risk]`,

    user_experience: `You are a UX strategist advising a CEO.

## BUSINESS QUESTION
{{query}}

## PREVIOUS CONTEXT
{{previousContext}}

## YOUR TASK
Analyze the user experience implications. Consider user needs, usability, adoption friction, and UX strategy.

Provide your analysis in this exact format:

KEY_FINDINGS:
- [User need insight]
- [Usability finding]
- [Adoption friction point]
- [Competitive UX benchmark]
- [UX opportunity]

ANALYSIS:
**User Needs**: [Who are the target users? What are their core needs?]
**User Journey**: [Key touchpoints and pain points in the user journey]
**Adoption Friction**: [What barriers exist to user adoption?]
**Competitive UX**: [How does the proposed UX compare to competitors?]
**Accessibility**: [Accessibility and inclusivity considerations]

RISKS:
- [UX risk 1]
- [UX risk 2]
- [UX risk 3]

RECOMMENDATIONS:
- [Primary UX recommendation]
- [Quick UX win for early adoption]
- [UX metric to track for success]

SCORE: [1-10 rating of UX potential]`,
};

// ─────────────────────────────────────────────────────────────
// Pipeline State Manager
// ─────────────────────────────────────────────────────────────

export class AnalysisPipeline {
    constructor(options = {}) {
        this.llmClient = options.llmClient ?? null;
        this.ragEngine = options.ragEngine ?? null;
        this.memoryManager = options.memoryManager ?? null;
        this.pipelines = new Map(); // id → PipelineState
        this.log = logger.child({ component: 'AnalysisPipeline' });
    }

    /**
     * Start a new pipeline for a query
     * @param {string} query - The business question
     * @param {Object} constraints - Budget, timeline, risk tolerance
     * @param {string} preferredProvider - LLM provider preference
     * @returns {Object} Initial pipeline state
     */
    startPipeline(query, constraints = {}, preferredProvider = null) {
        const id = generateId();

        const pipeline = {
            id,
            query,
            constraints,
            preferredProvider,
            status: 'active', // active | completed | cancelled
            currentStepIndex: 0,
            steps: PIPELINE_STEPS.map((step) => ({
                ...step,
                status: 'pending', // pending | running | completed | approved | rejected
                result: null,
                artifact: null, // { lines: string[], edits: [], comments: [] }
                reviewFeedback: null,
                startedAt: null,
                completedAt: null,
                approvedAt: null,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        this.pipelines.set(id, pipeline);
        this.log.info('Pipeline started', { id, query: query.substring(0, 80) });

        return this._sanitizePipeline(pipeline);
    }

    /**
     * Get pipeline state
     */
    getPipeline(id) {
        const pipeline = this.pipelines.get(id);
        if (!pipeline) return null;
        return this._sanitizePipeline(pipeline);
    }

    /**
     * Execute the next pending step
     */
    async executeNextStep(id) {
        const pipeline = this.pipelines.get(id);
        if (!pipeline) throw new Error('Pipeline not found');
        if (pipeline.status !== 'active') throw new Error('Pipeline is not active');

        // Find next pending step
        const stepIndex = pipeline.steps.findIndex((s) => s.status === 'pending');
        if (stepIndex === -1) {
            pipeline.status = 'completed';
            pipeline.updatedAt = new Date().toISOString();
            return this._sanitizePipeline(pipeline);
        }

        // Check if previous step needs approval (skip for first step)
        if (stepIndex > 0) {
            const prevStep = pipeline.steps[stepIndex - 1];
            if (prevStep.status === 'completed') {
                throw new Error(
                    `Previous step "${prevStep.name}" must be approved before proceeding. Use the approve endpoint.`
                );
            }
        }

        const step = pipeline.steps[stepIndex];
        step.status = 'running';
        step.startedAt = new Date().toISOString();
        pipeline.currentStepIndex = stepIndex;
        pipeline.updatedAt = new Date().toISOString();

        this.log.info('Executing step', { pipelineId: id, step: step.id, stepIndex });

        try {
            // Build previous context from completed steps
            const previousContext = this._buildPreviousContext(pipeline, stepIndex);

            // Get the prompt for this step
            const prompt = STEP_PROMPTS[step.id]
                .replace('{{query}}', pipeline.query)
                .replace('{{previousContext}}', previousContext || 'No previous analysis steps completed yet.');

            // Execute LLM call
            let result;
            if (this.llmClient) {
                const llmResult = await this.llmClient.generate(prompt, {
                    preferredProvider: pipeline.preferredProvider,
                });

                const responseStr =
                    typeof llmResult === 'object'
                        ? llmResult.response ?? llmResult.content ?? JSON.stringify(llmResult)
                        : llmResult;

                result = this._parseStepResult(step.id, responseStr);
                result.provider = llmResult?.provider ?? pipeline.preferredProvider ?? 'unknown';
            } else {
                // Fallback: generate placeholder result
                result = this._generateFallbackResult(step.id, pipeline.query);
                result.provider = 'fallback';
            }

            // Store result and create artifact
            step.result = result;
            step.artifact = {
                lines: result.content.split('\n'),
                edits: [],
                comments: [],
            };
            step.status = 'completed';
            step.completedAt = new Date().toISOString();
            pipeline.updatedAt = new Date().toISOString();

            this.log.info('Step completed', {
                pipelineId: id,
                step: step.id,
                score: result.score,
            });

            return this._sanitizePipeline(pipeline);
        } catch (error) {
            step.status = 'pending'; // Reset to allow retry
            step.startedAt = null;
            pipeline.updatedAt = new Date().toISOString();
            this.log.error('Step execution failed', { pipelineId: id, step: step.id, error: error.message });
            throw error;
        }
    }

    /**
     * Approve a step (human review gate)
     */
    approveStep(id, stepId, approverNotes = '') {
        const pipeline = this.pipelines.get(id);
        if (!pipeline) throw new Error('Pipeline not found');

        const step = pipeline.steps.find((s) => s.id === stepId);
        if (!step) throw new Error('Step not found');
        if (step.status !== 'completed') {
            throw new Error(`Step "${step.name}" is not ready for approval (status: ${step.status})`);
        }

        step.status = 'approved';
        step.approvedAt = new Date().toISOString();
        step.reviewFeedback = { action: 'approved', notes: approverNotes };
        pipeline.updatedAt = new Date().toISOString();

        // Check if all steps are approved
        const allApproved = pipeline.steps.every((s) => s.status === 'approved');
        if (allApproved) {
            pipeline.status = 'completed';
        }

        this.log.info('Step approved', { pipelineId: id, step: stepId });
        return this._sanitizePipeline(pipeline);
    }

    /**
     * Reject a step (request changes)
     */
    rejectStep(id, stepId, feedback = '') {
        const pipeline = this.pipelines.get(id);
        if (!pipeline) throw new Error('Pipeline not found');

        const step = pipeline.steps.find((s) => s.id === stepId);
        if (!step) throw new Error('Step not found');
        if (step.status !== 'completed') {
            throw new Error(`Step "${step.name}" is not ready for review (status: ${step.status})`);
        }

        // Reset step to pending so it can be re-run
        step.status = 'pending';
        step.reviewFeedback = { action: 'rejected', notes: feedback };
        step.result = null;
        step.artifact = null;
        step.startedAt = null;
        step.completedAt = null;
        pipeline.updatedAt = new Date().toISOString();

        this.log.info('Step rejected', { pipelineId: id, step: stepId, feedback });
        return this._sanitizePipeline(pipeline);
    }

    /**
     * Edit an artifact line
     */
    editArtifact(id, stepId, lineIndex, newContent) {
        const pipeline = this.pipelines.get(id);
        if (!pipeline) throw new Error('Pipeline not found');

        const step = pipeline.steps.find((s) => s.id === stepId);
        if (!step) throw new Error('Step not found');
        if (!step.artifact) throw new Error('No artifact for this step');

        if (lineIndex < 0 || lineIndex >= step.artifact.lines.length) {
            throw new Error('Line index out of range');
        }

        const originalContent = step.artifact.lines[lineIndex];
        step.artifact.lines[lineIndex] = newContent;
        step.artifact.edits.push({
            id: generateEditId(),
            lineIndex,
            originalContent,
            newContent,
            editedAt: new Date().toISOString(),
        });

        // Update the content in result as well
        step.result.content = step.artifact.lines.join('\n');
        pipeline.updatedAt = new Date().toISOString();

        this.log.info('Artifact edited', { pipelineId: id, step: stepId, lineIndex });
        return this._sanitizePipeline(pipeline);
    }

    /**
     * Add a comment to an artifact line
     */
    addComment(id, stepId, lineIndex, commentText, author = 'User') {
        const pipeline = this.pipelines.get(id);
        if (!pipeline) throw new Error('Pipeline not found');

        const step = pipeline.steps.find((s) => s.id === stepId);
        if (!step) throw new Error('Step not found');
        if (!step.artifact) throw new Error('No artifact for this step');

        const comment = {
            id: generateCommentId(),
            lineIndex,
            text: commentText,
            author,
            createdAt: new Date().toISOString(),
            resolved: false,
        };

        step.artifact.comments.push(comment);
        pipeline.updatedAt = new Date().toISOString();

        this.log.info('Comment added', { pipelineId: id, step: stepId, lineIndex });
        return { comment, pipeline: this._sanitizePipeline(pipeline) };
    }

    /**
     * List all pipelines (for dashboard)
     */
    listPipelines() {
        return Array.from(this.pipelines.values()).map((p) => ({
            id: p.id,
            query: p.query,
            status: p.status,
            currentStepIndex: p.currentStepIndex,
            completedSteps: p.steps.filter((s) => s.status === 'approved').length,
            totalSteps: p.steps.length,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));
    }

    // ─────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────

    _buildPreviousContext(pipeline, currentIndex) {
        const parts = [];
        for (let i = 0; i < currentIndex; i++) {
            const step = pipeline.steps[i];
            if (step.result) {
                parts.push(`### ${step.icon} ${step.name} (Score: ${step.result.score}/10)`);
                if (step.result.keyFindings?.length) {
                    parts.push('Key Findings:');
                    step.result.keyFindings.forEach((f) => parts.push(`- ${f}`));
                }
                if (step.result.recommendations?.length) {
                    parts.push('Recommendations:');
                    step.result.recommendations.forEach((r) => parts.push(`- ${r}`));
                }
                parts.push('');
            }
        }
        return parts.join('\n');
    }

    _parseStepResult(stepId, responseText) {
        const text = typeof responseText === 'string' ? responseText : String(responseText);

        // Extract KEY_FINDINGS
        const keyFindings = this._extractSection(text, 'KEY_FINDINGS');

        // Extract RISKS
        const risks = this._extractSection(text, 'RISKS');

        // Extract RECOMMENDATIONS
        const recommendations = this._extractSection(text, 'RECOMMENDATIONS');

        // Extract SCORE
        const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
        const score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 5;

        return {
            stepId,
            content: text,
            keyFindings,
            risks,
            recommendations,
            score,
            generatedAt: new Date().toISOString(),
        };
    }

    _extractSection(text, sectionName) {
        const items = [];
        // Match the section header and capture until the next section or end
        const regex = new RegExp(
            `${sectionName}\\s*:([\\s\\S]*?)(?=\\n(?:KEY_FINDINGS|ANALYSIS|IDEAS|RISKS|RECOMMENDATIONS|SCORE|$))`,
            'i'
        );
        const match = text.match(regex);
        if (match) {
            const lines = match[1].split('\n');
            for (const line of lines) {
                const itemMatch = line.match(/^\s*[-*•\d.]+\s*(.+)/);
                if (itemMatch) {
                    const item = itemMatch[1].trim();
                    if (item.length > 3) items.push(item);
                }
            }
        }
        return items.slice(0, 10);
    }

    _generateFallbackResult(stepId, query) {
        const step = PIPELINE_STEPS.find((s) => s.id === stepId);
        return {
            stepId,
            content: `# ${step.icon} ${step.name} Analysis\n\n**Query:** ${query}\n\nThis is a placeholder analysis. Connect an LLM provider for AI-generated analysis.\n\nKEY_FINDINGS:\n- Analysis pending LLM connection\n- No data available without AI provider\n\nRECOMMENDATIONS:\n- Configure an LLM provider (Groq or OpenRouter) for full analysis\n\nSCORE: 5`,
            keyFindings: ['Analysis pending LLM connection'],
            risks: ['No AI analysis available without LLM provider'],
            recommendations: ['Configure an LLM provider for full analysis'],
            score: 5,
            generatedAt: new Date().toISOString(),
        };
    }

    _sanitizePipeline(pipeline) {
        // Return a clean copy safe for API response
        return {
            id: pipeline.id,
            query: pipeline.query,
            constraints: pipeline.constraints,
            status: pipeline.status,
            currentStepIndex: pipeline.currentStepIndex,
            steps: pipeline.steps.map((step) => ({
                id: step.id,
                name: step.name,
                icon: step.icon,
                description: step.description,
                status: step.status,
                result: step.result,
                artifact: step.artifact,
                reviewFeedback: step.reviewFeedback,
                startedAt: step.startedAt,
                completedAt: step.completedAt,
                approvedAt: step.approvedAt,
            })),
            createdAt: pipeline.createdAt,
            updatedAt: pipeline.updatedAt,
        };
    }
}

export default AnalysisPipeline;
