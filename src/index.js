/**
 * CEO Agent Entry Point
 * Example usage and initialization
 */

// Load .env file
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        }
    }
}

import { createAgent } from './core/Agent.js';
import { createMemoryManager } from './memory/index.js';
import { createRAGEngine } from './rag/index.js';
import { OptionGenerator, OptionEvaluator, RiskModel, DecisionFormatter } from './reasoning/index.js';
import { createLLMRouter, OpenRouterClient, GroqClient, RoutingStrategy } from './llm/index.js';
import { createSafetyGuard } from './safety/index.js';
import { createAuditLogger, createApprovalManager, createFeedbackCollector } from './audit/index.js';
import config, { validateConfig } from './config/index.js';
import logger from './utils/logger.js';

/**
 * Initialize and run the agent
 */
async function main() {
    logger.info('CEO Agent starting', { version: '1.0.0' });

    // Validate configuration
    const { valid, errors } = validateConfig();
    if (!valid) {
        logger.warn('Configuration validation warnings', { errors });
    }

    // Initialize LLM Router with providers
    const llmRouter = createLLMRouter({
        strategy: RoutingStrategy.BEST_AVAILABLE,
        providers: {
            groq: new GroqClient({
                apiKey: process.env.GROQ_API_KEY ?? '',
                model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
                timeout: parseInt(process.env.LLM_TIMEOUT, 10) || 60000,
            }),
            openrouter: new OpenRouterClient({
                apiKey: process.env.OPENROUTER_API_KEY ?? '',
                model: process.env.OPENROUTER_MODEL ?? 'openrouter/auto',
                timeout: parseInt(process.env.LLM_TIMEOUT, 10) || 60000,
            }),
        },
    });

    logger.info('LLM Router initialized', llmRouter.getStatus());

    // Initialize memory system
    const memoryManager = createMemoryManager({
        shortTerm: {
            maxEntries: 100,
            ttlMs: 30 * 60 * 1000,
        },
        longTerm: {
            storagePath: './data/memory/long_term.json',
            maxEntries: 1000,
        },
    });

    // Initialize RAG engine
    const ragEngine = createRAGEngine({
        contextPolicy: config.policies.context,
        loader: {
            chunkSize: 500,
            chunkOverlap: 50,
        },
    });

    // Ingest sample documents
    try {
        await ragEngine.ingestDirectory('./data/documents', false);
        logger.info('Documents ingested', ragEngine.getStats());
    } catch (error) {
        logger.warn('No documents to ingest', { error: error.message });
    }

    // Initialize reasoning components with LLM router
    const optionGenerator = new OptionGenerator({
        llmClient: llmRouter, // Connected to router!
    });

    const optionEvaluator = new OptionEvaluator();
    const riskModel = new RiskModel();
    const decisionFormatter = new DecisionFormatter();

    // Initialize safety guard
    const safetyGuard = createSafetyGuard({
        loopConfig: {
            maxIterations: config.agent.maxIterations,
        },
        contentConfig: {
            ethicalRedLines: config.policies.decision?.ethicalRedLines ?? [],
        },
        strictMode: false, // Set to true for stricter safety checks
    });

    logger.info('SafetyGuard initialized', safetyGuard.getStats());

    // Initialize audit system
    const auditLogger = createAuditLogger({
        logDir: './data/audit',
        enableFileLogging: true,
    });

    const approvalManager = createApprovalManager({
        storageDir: './data/approvals',
        expirationHours: 24,
        auditLogger,
    });

    const feedbackCollector = createFeedbackCollector({
        storageDir: './data/feedback',
        auditLogger,
    });

    logger.info('Audit system initialized', {
        auditStats: auditLogger.getStats(),
        approvalStats: approvalManager.getStats(),
        feedbackStats: feedbackCollector.getStats(),
    });

    // Create agent with all systems connected
    const agent = createAgent({
        memoryManager,              // Phase 3 ✓
        ragEngine,                  // Phase 4 ✓
        optionGenerator,            // Phase 5 ✓ (now with LLM)
        optionEvaluator,            // Phase 5 ✓
        riskModel,                  // Phase 5 ✓
        decisionFormatter,          // Phase 5 ✓
        safetyGuard,                // Phase 7 ✓
    });

    // Log agent status
    const status = agent.getStatus();
    logger.info('Agent ready', status);

    // Interactive CLI - get query from user
    const readline = await import('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (prompt) => new Promise((resolve) => {
        rl.question(prompt, (answer) => resolve(answer));
    });

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('                     CEO AGENT - READY');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const query = await askQuestion('🎯 Enter your strategic question: ');

    if (!query.trim()) {
        console.log('No query provided. Exiting.');
        rl.close();
        memoryManager.destroy();
        return;
    }

    rl.close();

    // Example: Process a strategic query
    try {
        const result = await agent.process(
            query,
            {
                constraints: {
                    budgetLimit: 500000,
                    timeHorizon: 'Q1 2026',
                },
            }
        );

        logger.info('Decision proposal generated', {
            id: result.id,
            confidence: result.proposal?.confidence,
            requiresApproval: result.proposal?.requiresHumanApproval,
        });

        // Output the proposal
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('                     CEO AGENT - DECISION PROPOSAL');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        const proposal = result.proposal;

        // Recommendation
        if (proposal.recommendation) {
            console.log('📌 RECOMMENDATION:', proposal.recommendation.title);
            console.log('   ', proposal.recommendation.description);
            console.log('   Estimated Cost:', `$${(proposal.recommendation.estimatedCost ?? 0).toLocaleString()}`);
            console.log('   Timeline:', proposal.recommendation.timeToImplement);
            console.log('   Risk Level:', proposal.recommendation.riskLevel);
            console.log('   Score:', (proposal.recommendation.score * 100).toFixed(1) + '%');
            console.log('   Rationale:', proposal.recommendation.rationale);
        }

        // Alternatives
        if (proposal.alternatives?.length > 0) {
            console.log('\n📋 ALTERNATIVES:');
            for (const alt of proposal.alternatives) {
                console.log(`   ${alt.rank}. ${alt.title} (Score: ${(alt.score * 100).toFixed(1)}%)`);
                console.log(`      ${alt.tradeoffVsTop}`);
            }
        }

        // Risk summary
        if (proposal.risks) {
            console.log('\n⚠️  RISK ASSESSMENT:');
            console.log('   Overall Risk:', proposal.risks.overallLevel ?? 'unknown');
            if (proposal.risks.alerts?.length > 0) {
                console.log('   Alerts:', proposal.risks.alerts.map(a => a.optionTitle).join(', '));
            }
        }

        // Confidence
        console.log('\n📊 CONFIDENCE:', (proposal.confidence * 100).toFixed(1) + '%', `(${proposal.confidenceLevel})`);

        // Missing data
        if (proposal.missingData?.length > 0) {
            console.log('\n⚠️  MISSING DATA:', proposal.missingData.join(', '));
        }

        // Approval
        if (proposal.requiresHumanApproval) {
            console.log('\n🔐 REQUIRES HUMAN APPROVAL');
            console.log('   Reason:', proposal.approvalReason);
        }

        console.log('\n═══════════════════════════════════════════════════════════════════\n');

        // System stats
        console.log('Memory Stats:', memoryManager.getStats());
        console.log('RAG Stats:', ragEngine.getStats().vectorStore);
        console.log('LLM Router:', {
            strategy: llmRouter.getStatus().strategy,
            providers: Object.keys(llmRouter.getStatus().providers).length,
            available: llmRouter.getStatus().availableCount,
        });

        // Demo: Submit for approval if required
        if (proposal.requiresHumanApproval) {
            const approvalRequest = approvalManager.submitForApproval({
                contextId: result.id,
                proposal: proposal,
                priority: 'medium',
            });
            console.log('\n📋 APPROVAL REQUEST SUBMITTED:', approvalRequest.id);
            console.log('   Pending approvals:', approvalManager.getPending().length);
        }

        // Demo: Log to audit trail
        auditLogger.logProposalCreated(result.id, proposal);
        console.log('\n📝 AUDIT TRAIL:', auditLogger.getStats());

        // Demo: Record feedback (simulated)
        feedbackCollector.recordRating({
            contextId: result.id,
            rating: 4,
            comment: 'Good recommendation, needs more market data.',
            ratedBy: 'demo_user',
        });
        console.log('⭐ FEEDBACK RECORDED:', feedbackCollector.getStats());

    } catch (error) {
        logger.error('Failed to process query', { error: error.message, code: error.code });
        console.error('Error:', error.message);
    }

    // Cleanup
    memoryManager.destroy();
}

// Run if executed directly
main().catch(console.error);

export { main };
