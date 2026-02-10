/**
 * OpenRouter Integration Test
 * Verifies the OpenRouter provider works within the CEO Agent LLM system
 * Run: OPENROUTER_API_KEY=your_key node test-openrouter-integration.js
 */

// Load .env
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env');

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

import { createLLMRouter, OpenRouterClient, RoutingStrategy } from './src/llm/index.js';

async function testIntegration() {
    console.log('🔧 OpenRouter Integration Test');
    console.log('═'.repeat(55));

    // Test 1: Direct OpenRouterClient
    console.log('\n📍 Test 1: Direct OpenRouterClient');
    const client = new OpenRouterClient({
        apiKey: process.env.OPENROUTER_API_KEY,
        model: 'openrouter/auto',
    });

    console.log('   Configured:', client.isConfigured());
    console.log('   Model:', client.model);
    console.log('   Provider:', client.provider);

    if (!client.isConfigured()) {
        console.log('❌ OpenRouter API key not configured!');
        console.log('   Set OPENROUTER_API_KEY in .env or environment');
        return;
    }

    try {
        const response = await client.generate(
            'In one sentence, what is strategic decision making?',
            { systemPrompt: 'You are a CEO advisor. Be concise.' }
        );
        console.log('   ✅ Response:', response.substring(0, 100) + '...');
    } catch (error) {
        console.log('   ❌ Error:', error.message);
    }

    // Test 2: Through LLM Router
    console.log('\n📍 Test 2: Through LLM Router');
    const router = createLLMRouter({
        strategy: RoutingStrategy.COST_OPTIMIZED, // Prefers openrouter/ollama
        providers: {
            openrouter: new OpenRouterClient({
                apiKey: process.env.OPENROUTER_API_KEY,
                model: process.env.OPENROUTER_MODEL ?? 'openrouter/auto',
            }),
        },
    });

    const status = router.getStatus();
    console.log('   Strategy:', status.strategy);
    console.log('   Available providers:', status.availableCount);
    console.log('   Providers:', Object.keys(status.providers));

    try {
        const result = await router.generate(
            'What are 2 key factors in market expansion decisions?',
            { systemPrompt: 'You are a strategic advisor. Be brief.' }
        );
        console.log('   ✅ Provider used:', result.provider);
        console.log('   ✅ Latency:', result.latencyMs + 'ms');
        console.log('   ✅ Response:', result.response.substring(0, 150) + '...');
    } catch (error) {
        console.log('   ❌ Error:', error.message);
    }

    console.log('\n═'.repeat(55));
    console.log('✨ Integration test complete!');
}

testIntegration().catch(console.error);
