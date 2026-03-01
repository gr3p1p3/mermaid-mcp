import puppeteer from 'puppeteer';
import {readFileSync} from 'fs';
import {join} from 'path';

// resolving mermaid path
const mermaidPath = join(process.cwd(), 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
const mermaidScript = readFileSync(mermaidPath, 'utf8');

export async function renderMermaid(
    definition: string,
    format: "png" | "jpg" | "svg",
    width: number,
    customCss?: string
): Promise<{ data: string; mimeType: string }> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({width, height: 600, deviceScaleFactor: 2});

        // create clean container to use for rendering
        const html = `
    <html>
      <head>
        <style>
          body { background: white; margin: 0; padding: 20px; display: inline-block; }
          #container { display: inline-block; position: relative; }
          ${customCss || ''}
        </style>
      </head>
      <body>
        <div id="container"></div>
        <script>${mermaidScript};</script>
      </body>
    </html>`;
        await page.setContent(html);

        //TODO use this for better error handling?!
        // page.on('console', msg => console.error('BROWSER LOG:', msg.text()));

        const validation = await page.evaluate(async (code) => {
            try {
                // Initialize mermaid
                (window as any).mermaid.initialize({startOnLoad: false});
                // Trying doing parsing
                await (window as any).mermaid.parse(code);

                return {valid: true};
            } catch (error: any) {
                return {valid: false, error: error.message};
            }
        }, definition);

        if (!validation.valid) {
            throw new Error(`Mermaid Syntax Error: ${validation.error}`);
        }

        // these come as env-variables
        const WATERMARK = process.env.WATERMARK_TEXT || '';
        const LOGO_URL = process.env.LOGO_URL || '';

        // Executing rendering
        const renderData = await page.evaluate(async (code, css, watermark, logo) => {
            const {mermaid} = (window as any);
            mermaid.initialize({startOnLoad: false, theme: 'default'}); // TODO maybe inject theme directly here?

            // render()-Method return the svg directly
            let {svg} = await mermaid.render('diagram', code);

            if (css) {
                // add custom CSS
                const styleTag = `<style type="text/css"><![CDATA[${css}]]></style>`;
                svg = svg.replace(/(<svg[^>]*>)/, `$1${styleTag}`);
            }

            const container = document.querySelector('#container');
            // @ts-ignore
            container.innerHTML = svg;

            if (logo || watermark) {
                const overlayContainer = document.createElement('div');
                overlayContainer.style.position = 'absolute';
                overlayContainer.style.top = '0';
                overlayContainer.style.left = '0';
                overlayContainer.style.width = '100%';
                overlayContainer.style.height = '100%';
                overlayContainer.style.pointerEvents = 'none'; // no mouse problem

                container?.appendChild(overlayContainer);

                // Add Logo if exists
                if (logo) {
                    //TODO make position customizable/configurable
                    const img = document.createElement('img');
                    img.src = logo;
                    img.style.position = 'absolute';
                    img.style.opacity = '0.6';

                    //TODO maybe calculate this dynamically
                    img.style.bottom = '10px';
                    img.style.right = '10px';
                    img.style.width = '80px';

                    overlayContainer.appendChild(img);

                    // waiting for loaded image
                    //TODO add race with sleep in case of failed loading
                    await new Promise(r => img.onload = r);
                }

                // Add Watermark if exists
                if (watermark) {
                    //TODO make position, etc.. customizable
                    const wm = document.createElement('div');
                    wm.textContent = watermark;
                    wm.style.position = 'absolute';
                    wm.style.top = '50%';
                    wm.style.left = '50%';
                    wm.style.transform = 'translate(-50%, -50%) rotate(-30deg)';
                    wm.style.fontSize = '32px';
                    wm.style.fontWeight = 'bold';
                    wm.style.color = 'rgba(150, 150, 150, 0.15)';
                    wm.style.whiteSpace = 'nowrap';

                    overlayContainer.appendChild(wm);
                }
            }

            return {success: true, svg};
        }, definition, customCss, WATERMARK, LOGO_URL);

        if (!renderData?.success) {
            // this should not happen
            throw new Error("Problem while rendering");
        }

        // waiting for selector
        const element = await page.$('#container');
        if (!element) {
            throw new Error("Rendering failed");
        }

        let finalData: string;
        let mime: string;

        if (format === 'svg') {
            // @ts-ignore
            finalData = renderData.svg ?? await page.evaluate(() => document.querySelector('#container')?.innerHTML);
            mime = "image/svg+xml";
        } else {
            const buffer = await element.screenshot({
                type: format === "jpg" ? "jpeg" : "png",
                omitBackground: format === "png"
            });
            finalData = (buffer as Buffer).toString('base64');
            mime = format === "jpg" ? "image/jpeg" : "image/png";
        }

        await browser.close();

        return {data: finalData, mimeType: mime};
    }
        // TODO should delete this
        // catch (err: any) {
        //     throw new Error(err.message);
        // }
    finally {
        await browser.close();
    }
}
