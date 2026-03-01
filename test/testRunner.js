// ---------------------------------------------------------------------------
// Shared test runner — used by all transport-specific test scripts
// ---------------------------------------------------------------------------

const DIAGRAM_DEFINITION =
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
    '    }';

export async function runTests(client, transportLabel) {
    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  ✅ PASS — ${testName}`);
            passed++;
        }
        else {
            console.error(`  ❌ FAIL — ${testName}`);
            failed++;
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Running tests — transport: ${transportLabel}`);
    console.log(`${'='.repeat(60)}\n`);

    // -----------------------------------------------------------------------
    // TEST 1 — tools/list
    // -----------------------------------------------------------------------
    console.log('📋 TEST 1: tools/list');
    let toolsData;
    try {
        toolsData = await client.listTools();
        assert(!!toolsData, 'Response is not null');
        assert(Array.isArray(toolsData.tools), 'Response contains a tools array');
        assert(toolsData.tools.length > 0, 'At least one tool is registered');
        assert(
            toolsData.tools.some(t => t.name === 'generate_diagram'),
            'Tool "generate_diagram" is present'
        );
        console.log(`     Tools found: ${toolsData.tools.map(t => t.name).join(', ')}`);
    }
    catch (err) {
        assert(false, `tools/list did not throw — got: ${err.message}`);
    }

    // -----------------------------------------------------------------------
    // TEST 2 — tools/call with SVG output
    // -----------------------------------------------------------------------
    console.log('\n🖼️  TEST 2: generate_diagram (SVG)');
    try {
        const res = await client.callTool('generate_diagram', {
            definition: DIAGRAM_DEFINITION,
            format: 'svg',
            theme: 'default',
            width: 800
        });

        assert(!!res, 'Response is not null');
        assert(Array.isArray(res.content), 'Response has content array');
        assert(res.content.length > 0, 'Content array is not empty');

        const svgBlock = res.content.find(c => c.type === 'text' && c.text?.includes('<svg'));
        const confirmBlock = res.content.find(c => c.type === 'text' && c.text?.includes('format: SVG'));
        assert(!!svgBlock, 'Content contains a text block with SVG markup');
        assert(!!confirmBlock, 'Content contains a text block confirming SVG format');
    }
    catch (err) {
        assert(false, `generate_diagram (SVG) did not throw — got: ${err.message}`);
    }

    // -----------------------------------------------------------------------
    // TEST 3 — tools/call with PNG output
    // -----------------------------------------------------------------------
    console.log('\n🖼️  TEST 3: generate_diagram (PNG)');
    try {
        const res = await client.callTool('generate_diagram', {
            definition: DIAGRAM_DEFINITION,
            format: 'png',
            theme: 'dark',
            width: 1024
        });

        const imageBlock = res.content.find(c => c.type === 'image');

        assert(!!imageBlock, 'Content contains a image block');
        assert(
            imageBlock?.mimeType === 'image/png',
            'Resource mimeType is image/png'
        );
        assert(
            typeof imageBlock?.data === 'string' &&
            imageBlock.data.length > 0,
            'Resource data is a non-empty base64 string'
        );
    }
    catch (err) {
        assert(false, `generate_diagram (PNG) did not throw — got: ${err.message}`);
    }

    // -----------------------------------------------------------------------
    // TEST 3 — tools/call with PNG output
    // -----------------------------------------------------------------------
    console.log('\n🖼️  TEST 4: generate_diagram (JPG)');
    try {
        const res = await client.callTool('generate_diagram', {
            definition: DIAGRAM_DEFINITION,
            format: 'jpg',
            theme: 'dark',
            width: 1024
        });

        const imageBlock = res.content.find(c => c.type === 'image');

        assert(!!imageBlock, 'Content contains a image block');
        assert(
            imageBlock?.mimeType === 'image/jpeg',
            'Resource mimeType is image/jpeg'
        );
        assert(
            typeof imageBlock?.data === 'string' &&
            imageBlock.data.length > 0,
            'Resource data is a non-empty base64 string'
        );
    }
    catch (err) {
        assert(false, `generate_diagram (JPG) did not throw — got: ${err.message}`);
    }

    // -----------------------------------------------------------------------
    // TEST 5 — error handling with invalid Mermaid syntax
    // -----------------------------------------------------------------------
    console.log('\n⚠️  TEST 5: error handling (invalid Mermaid syntax)');
    try {
        const res = await client.callTool('generate_diagram', {
            definition: DIAGRAM_DEFINITION.replace('Animal <|-- Duck', 'Animal <|- Duck'),
            format: 'svg',
            theme: 'default'
        });

        assert(res.isError === true, 'Response has isError: true');
        assert(
            res.content[0]?.type === 'text',
            'Error response contains a text block'
        );
        console.log(`     Error message: ${res.content[0]?.text}`);
    }
    catch (err) {
        assert(false, `Error handling test did not throw — got: ${err.message}`);
    }


    // -----------------------------------------------------------------------
    // TEST 7 — Custom CSS injection verification
    // -----------------------------------------------------------------------
    console.log('\n🎨 TEST 7: Custom CSS injection (SVG)');
    try {
        const customColor = '#ff00ff'; // Magenta acceso per il test
        const customStyle = `.node rect { fill: ${customColor} !important; stroke: #000; }`;

        const res = await client.callTool('generate_diagram', {
            definition: 'graph TD; A[Test Node] --> B',
            format: 'svg',
            theme: 'neutral',
            css: customStyle // La nostra nuova feature!
        });

        // 1. Verifichiamo che non ci siano errori
        assert(res.isError !== true, 'Response should not be an error');

        // 2. Troviamo il blocco di testo dell'SVG
        const svgContent = res.content.find(c => c.type === 'text' && c.text.includes('<svg'))?.text;
        assert(!!svgContent, 'Response should contain SVG text content');

        // 3. Verifichiamo che il nostro CSS sia presente nel codice SVG
        const hasCustomCss = svgContent.includes(customColor);
        assert(hasCustomCss === true, `SVG should contain the custom color: ${customColor}`);

        console.log('✅ TEST 7 PASSED: Custom CSS found in the generated SVG');
    }
    catch (err) {
        console.error('❌ TEST 7 FAILED:', err.message);
        process.exit(1);
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Results [${transportLabel}]: ${passed} passed, ${failed} failed`);
    console.log(`${'='.repeat(60)}\n`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}
