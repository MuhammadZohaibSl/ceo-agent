/**
 * CEO Agent HTTP API Server
 * Modular Express-style server with clean architecture
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '..', '..', '.env');
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

// Import after env is loaded
import agentService from './services/agent.service.js';
import handleRequest from './routes/index.js';

const PORT = parseInt(process.env.API_PORT, 10) || 3001;

/**
 * Print startup banner
 */
function printBanner() {
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('                     CEO AGENT - API SERVER');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log('\nEndpoints:');
    console.log('  GET  /api/status            - Agent status');
    console.log('  POST /api/analyze           - Process strategic query');
    console.log('  GET  /api/approvals         - List pending approvals');
    console.log('  GET  /api/approvals/:id     - Get approval details');
    console.log('  POST /api/approvals/:id/approve - Approve decision');
    console.log('  POST /api/approvals/:id/reject  - Reject decision');
    console.log('  GET  /api/history           - Decision history');
    console.log('  GET  /api/stats             - System statistics');
    console.log('  GET  /api/documents         - List RAG documents');
    console.log('  POST /api/documents         - Upload document');
    console.log('  DELETE /api/documents/:id   - Delete document');
    console.log('\n═══════════════════════════════════════════════════════════════════\n');
}

/**
 * Start the HTTP server
 */
async function startServer() {
    // Initialize agent services
    await agentService.initialize();

    // Create HTTP server
    const server = createServer(handleRequest);

    server.listen(PORT, () => {
        printBanner();
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        agentService.destroy();
        server.close();
        process.exit(0);
    });

    return server;
}

// Start server
startServer().catch(console.error);

export { startServer };
