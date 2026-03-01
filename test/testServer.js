import {MCPTestClient} from './McpTestClient.js';

async function main() {
    const client = new MCPTestClient('http-server');
    try {
        // await client.connectWithHttp('http://localhost:3001/mcp');
        await client.connectWithStdio('node', ['dist/index.js']);
        // await client.connectWithStdio('npm', ['run', 'start']);

        // await client.connectWithSSE('http://localhost:3001/sse');

        console.log('Richiedo la lista dei tool...');
        const data = await client.listTools();

        if (data && data.tools) {
            console.log('Tool trovati:', data.tools.map(t => t.name));
            console.log('Proprietà del primo tool:', JSON.stringify(data.tools[0].inputSchema.properties, null, 2));
        }
        else {
            console.log('Nessun tool ricevuto. Risposta:', data);
        }

        const res = await client.callTool('generate_diagram', {
            definition:
                'classDiagram\n' +
                '    Animal <|-- Duck\n' +
                '    Animal <|-- Fish\n' +
                '    Animal <|-- Zebra\n' +
                '    Animal : +int age\n' +
                '    Animal : +String gender\n' +
                '    Animal: +isMammal()\n' +
                '    Animal: +mate()\n' +
                '    class Duck{\n' +
                '      +String beakColor\n' +
                '      +swim()\n' +
                '      +quack()\n' +
                '    }\n' +
                '    class Fish{\n' +
                '      -int sizeInFeet\n' +
                '      -canEat()\n' +
                '    }\n' +
                '    class Zebra{\n' +
                '      +bool is_wild\n' +
                '      +run()\n' +
                '    }'
        });

        console.log('result type:', res.content[0].type);
        console.log('result:', res);

    }
    catch (err) {
        console.error('Errore durante l\'esecuzione:', err);
    }
    finally {
        await client.cleanup();
    }
}

main();
