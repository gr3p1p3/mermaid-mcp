import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {
    StdioClientTransport
} from '@modelcontextprotocol/sdk/client/stdio.js';
import {
    SSEClientTransport
} from '@modelcontextprotocol/sdk/client/sse.js';
import {URL} from 'url';
import {
    StreamableHTTPClientTransport
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export class MCPTestClient {
    constructor(serverName) {
        this.client = new Client(
            {
                name: `mcp-client-for-${serverName}`,
                version: '1.0.0'
            },
            {capabilities: {}}
        );
        this.transport = null;
        this.httpUrl = null;
    }

    async connectWithStdio(command, args = []) {
        this.transport = new StdioClientTransport({
            command,
            args
        });
        await this.client.connect(this.transport);
        console.log('✅ Connected via STDIO');
    }

    async connectWithSSE(serverUrl) {
        this.transport = new SSEClientTransport(
            new URL(serverUrl),
            {requestInit: {headers: {Accept: 'text/event-stream'}}}
        );
        await this.client.connect(this.transport);
        console.log('⚠️ Connected via SSE (legacy)');
    }

    async connectWithHttp(serverUrl) {
        this.transport = new StreamableHTTPClientTransport(new URL(serverUrl));
        await this.client.connect(this.transport);
        console.log('✅ Connected via Streamable HTTP');
    }

    async listTools() {
        return await this.client.listTools();
    }

    async callTool(name, args) {
        return await this.client.callTool({
            name,
            arguments: args
        });
    }

    async cleanup() {
        if (this.transport) {
            await this.client.close();
            console.log('🔌 Closed connection');
        }
    }
}
