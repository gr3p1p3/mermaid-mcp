import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {SSEServerTransport} from "@modelcontextprotocol/sdk/server/sse.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {isInitializeRequest} from "@modelcontextprotocol/sdk/types.js";

import express from "express";

import {GenerateDiagramSchema, TOOL_DESCRIPTION} from "./schemas.js";
import {renderMermaid} from "./renderer.js";


function createServer() {
    const server = new McpServer({
        name: "MermaidMcp",
        version: "1.0.0"
    });

    // Registering tool
    server.tool(
        "generate_diagram",
        TOOL_DESCRIPTION,
        GenerateDiagramSchema,
        async ({definition, format, theme, width, css}) => {
            try {
                // Iniezione del tema nella sintassi Mermaid
                const fullDefinition = `%%{init: {'theme':'${theme}'}}%%\n${definition}`;
                // Rendering tramite Puppeteer (logica offline nel file renderer.ts)
                const result = await renderMermaid(fullDefinition, format, width, css);

                const contentBlock = format === 'svg'
                    ? {
                        // SVG is type "text"
                        type: "text" as const,
                        text: result.data
                    }
                    : {
                        // PNG/JPG — type "image" è lo standard MCP per immagini inline
                        type: "image" as const,
                        data: result.data,       // base64 puro
                        mimeType: result.mimeType
                    };

                return {
                    content: [
                        contentBlock,
                        {
                            type: "text" as const,
                            text: `Diagram generated successfully - format: ${format.toUpperCase()}.`
                        }
                    ]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: error.message
                        }
                    ]
                };
            }
        }
    );

    return server;
}


// Start del server tramite trasporto STDIO (standard per Docker/Claude Desktop)
async function main() {
    // Leggiamo il tipo di trasporto da variabile d'ambiente, default a 'stdio'
    const transportType = process.env.MCP_TRANSPORT || "stdio";

    if (transportType === "sse") {
        const app = express();

        // app.use(express.json());
        const transportsSSE = new Map<string, SSEServerTransport>();

        const port = process.env.PORT || 3000;

        app.post("/messages", (req, res) => {
            const sessionId = req.query.sessionId as string;
            if (!sessionId) {
                console.error('Message received without sessionId');
                res.status(400).json({error: 'sessionId is required'});
                return;
            }

            const transport = transportsSSE.get(sessionId);

            if (transport) {
                transport.handlePostMessage(req, res);
            }
        });


        app.get("/sse", async (req, res) => {
            const transport = new SSEServerTransport("/messages", res);
            transportsSSE.set(transport.sessionId, transport);

            const server = createServer(); // ✅ nuova istanza per ogni connessione
            await server.connect(transport);
        });


        const transportsHTTP = new Map<string, StreamableHTTPServerTransport>();
        app.post("/mcp", express.raw({type: "application/json"}), async (req, res) => {
            const sessionId = req.headers["mcp-session-id"] as string | undefined;

            let body: any;
            try {
                body = JSON.parse(req.body.toString());
            } catch {
                res.status(400)
                    .json({
                        jsonrpc: "2.0",
                        error: {code: -32700, message: "Parse error: invalid JSON"},
                        id: null
                    });
                return;
            }

            if (sessionId && transportsHTTP.has(sessionId)) {
                // Sessione esistente → riusa transport e server già connessi
                const transport = transportsHTTP.get(sessionId)!;
                await transport.handleRequest(req, res, body);
                return;
            }

            if (!sessionId && isInitializeRequest(body)) {
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => crypto.randomUUID(),
                    onsessioninitialized: (newSessionId) => {
                        transportsHTTP.set(newSessionId, transport);
                    }
                });

                transport.onclose = () => {
                    if (transport.sessionId) transportsHTTP.delete(transport.sessionId);
                };

                const server = createServer(); // new instance for each session
                await server.connect(transport);
                await transport.handleRequest(req, res, body);
                return;
            }

            res.status(400)
                .json({
                    jsonrpc: "2.0",
                    error: {code: -32000, message: "Bad Request: missing or invalid session"},
                    id: req.body?.id ?? null
                });
        });

        // GET per SSE streaming (opzionale ma parte dello spec Streamable HTTP)
        app.get("/mcp", async (req, res) => {
            const sessionId = req.headers["mcp-session-id"] as string | undefined;
            if (!sessionId || !transportsHTTP.has(sessionId)) {
                res.status(400).send("Session not found");
                return;
            }
            await transportsHTTP.get(sessionId)!.handleRequest(req, res);
        });

        // DELETE per chiudere la sessione
        app.delete("/mcp", async (req, res) => {
            const sessionId = req.headers["mcp-session-id"] as string | undefined;
            if (sessionId && transportsHTTP.has(sessionId)) {
                await transportsHTTP.get(sessionId)!.close();
                transportsHTTP.delete(sessionId);
            }
            res.status(204).end();
        });


        app.get("/health", (req, res) => res.send("OK"));

        app.listen(port, () => {
            console.error(`Mermaid MCP Server avviato in modalità SSE sulla porta ${port}`);
        });
    } else if (transportType === "stdio") {
        // Logic Standard STDIO (for Docker/Claude)
        const transport = new StdioServerTransport();
        await createServer().connect(transport);
        console.error("Mermaid MCP Server avviato in modalità STDIO.");
    }
}

main()
    .catch((err) => {
        console.error("Error on start:", err);
        process.exit(1);
    });
