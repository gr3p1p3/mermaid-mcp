// ---------------------------------------------------------------------------
// Test script — SSE (legacy) + Streamable HTTP transports
// Requires the server already running: MCP_TRANSPORT=sse node dist/index.js
// Usage: node test/test.http.js
// ---------------------------------------------------------------------------

import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SSEClientTransport} from '@modelcontextprotocol/sdk/client/sse.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {URL} from 'url';
import {runTests} from './testRunner.js';

const BASE_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

import {MCPTestClient} from './McpTestClient.js';

// ---------------------------------------------------------------------------
// Wait for the server to be ready before running tests
// ---------------------------------------------------------------------------
async function waitForServer(url, retries = 10, delayMs = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(`${url}/health`);
            if (res.ok) return;
        } catch {
            // Server not ready yet
        }
        console.log(`⏳ Waiting for server... (${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error(`Server at ${url} did not respond after ${retries} retries`);
}

async function main() {
    try {
        await waitForServer(BASE_URL);
    } catch (err) {
        console.error(`❌ ${err.message}`);
        console.error(`   Make sure the server is running: MCP_TRANSPORT=sse node dist/index.js`);
        process.exitCode = 1;
        return;
    }

    // --- SSE ---
    const sseClient = new MCPTestClient('sse');
    try {
        await sseClient.connectWithSSE('http://localhost:3000/sse');
        await runTests(sseClient, 'SSE');
    } catch (err) {
        console.error('Fatal error (SSE):', err);
        process.exitCode = 1;
    } finally {
        await sseClient.cleanup();
    }

    // --- Streamable HTTP ---
    const httpClient = new MCPTestClient('http');
    try {
        await httpClient.connectWithHttp('http://localhost:3000/mcp');
        await runTests(httpClient, 'Streamable HTTP');
    } catch (err) {
        console.error('Fatal error (HTTP):', err);
        process.exitCode = 1;
    } finally {
        await httpClient.cleanup();
    }
}

main();
