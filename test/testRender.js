import { renderMermaid } from './dist/renderer.js';
import fs from 'fs';

async function testRender() {
    try {
        console.log("Inizio rendering di prova...");
        const result = await renderMermaid('graph TD; A-->B', 'png', 800);

        // Salviamo il risultato per vederlo
        fs.writeFileSync('test-output.png', Buffer.from(result.data, 'base64'));
        console.log("✅ Successo! File 'test-output.png' creato.");
    } catch (err) {
        console.error("❌ Errore:", err);
    }
}

testRender();
