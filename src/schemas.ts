import { z } from "zod";

/**
 * Tool description for the LLM.
 * This helps the model understand WHEN and HOW to use the tool.
 */
export const TOOL_DESCRIPTION = `
Render Mermaid.js syntax into high-quality diagrams (PNG, JPG, or SVG). 
Use this tool whenever the user asks for a flowchart, sequence diagram, Gantt chart, 
class diagram, or any visualization supported by Mermaid. 
Example input: "graph TD; A[Start] --> B{Process}; B -->|Yes| C[End]; B -->|No| D[Retry];"
`.trim();

export const GenerateDiagramSchema = {
    definition: z.string()
        .describe("The raw Mermaid syntax string. Must be valid Mermaid code. Do not wrap in markdown code blocks."),

    format: z.enum(["png", "jpg", "svg"])
        .optional()
        .default("png")
        .describe("The output file format. Use 'svg' for vector text-based output, 'png' or 'jpg' for raster images."),

    theme: z.enum(["default", "dark", "forest", "neutral"])
        .optional()
        .default("default")
        .describe("The visual theme of the diagram. 'dark' is recommended for dark-mode interfaces."),

    width: z.number()
        .optional()
        .default(800)
        .describe("The width of the output image in pixels. Only applies to PNG and JPG formats."),

    css: z.string()
        .optional()
        .describe("Optional CSS to inject. Use it to change fonts, colors, or specific element styles (e.g., 'rect { fill: red; }').")
};
