/**
 * OpenRouter Free LLM Test Script
 * Run: node test-openrouter.js
 */

const OPENROUTER_API_KEY = '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';

async function testOpenRouter(model, prompt) {
    console.log(`\n🔄 Testing: ${model}`);
    console.log('-'.repeat(50));

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'CEO Agent Research'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 200,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.log(`❌ Error ${response.status}:`, data.error?.message || 'Unknown error');
            return null;
        }

        const content = data.choices?.[0]?.message?.content || 'No response';

        console.log(`✅ Success!`);
        console.log(`📝 Model used: ${data.model || model}`);
        console.log(`💬 Response:\n${content}`);

        return { model: data.model, content };
    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('🚀 OpenRouter Free LLM Test for CEO Agent Research');
    console.log('='.repeat(55));

    const testPrompt = `As a strategic advisor, give 2 key considerations for 
    a startup deciding between market expansion vs deepening current market. Be brief.`;

    // Models to try (in order of preference)
    const modelsToTry = [
        'openrouter/auto',                           // Auto-selects best available
        'deepseek/deepseek-chat:free',               // DeepSeek free tier
        'nvidia/llama-3.1-nemotron-70b-instruct:free',
        'meta-llama/llama-3.3-70b-instruct:free',
    ];

    for (const model of modelsToTry) {
        const result = await testOpenRouter(model, testPrompt);
        if (result) {
            console.log('\n' + '='.repeat(55));
            console.log('✨ OpenRouter is working with your API key!');
            console.log(`🎯 Working model: ${result.model}`);
            break;
        }
    }
}

main();
