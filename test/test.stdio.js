// ---------------------------------------------------------------------------
// Test script — STDIO transport
// Usage: node test/test.stdio.js
// ---------------------------------------------------------------------------

import {runTests} from './testRunner.js';

import {MCPTestClient} from './McpTestClient.js';

async function main() {
    const client = new MCPTestClient();
    try {
        await client.connectWithStdio('node', ['dist/index.js']);
        await runTests(client, 'STDIO');
    }
    catch (err) {
        console.error('Fatal error:', err);
        process.exitCode = 1;
    }
    finally {
        await client.cleanup();
    }
}

main();
