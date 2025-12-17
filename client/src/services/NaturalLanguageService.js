/* global Excel */
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
// CAUTION: Exposing API Key in client side code.
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const ACTION_SCHEMA = `
You are an AI assistant for Microsoft Excel. Your job is to translate user requests into JSON actions that can be executed by the Excel Add-in.

Return a JSON OBJECT with a key "actions" containing an ARRAY of action objects.
Do NOT return markdown. Return ONLY raw JSON.

Supported Actions:

1. **editCell**
   - description: Write values or formulas to specific cells.
   - properties:
     - address: string (e.g., "A1", "B2:C5")
     - values: array of array of strings/numbers (row-major). 
     - isFormula: boolean (true if values start with "=")

2. **formatRange**
   - description: Apply formatting to a range.
   - properties:
     - address: string (e.g., "A1:Z1")
     - format: object containing:
       - fill: string (hex color e.g., "#FF0000")
       - fontColor: string (hex color)
       - bold: boolean
       - italic: boolean
       - fontSize: number
       - numberFormat: string (e.g., "$#,##0.00", "0.00%")
       - horizontalAlignment: "Left" | "Center" | "Right"
       - columnWidth: "AutoFit" | number

3. **createTable**
   - description: Turn a range into a table.
   - properties:
     - address: string
     - hasHeaders: boolean
     - name: string (optional)

4. **createChart**
   - description: Create a chart from data.
   - properties:
     - dataRange: string
     - type: "ColumnClustered" | "Line" | "Pie" | "BarClustered"
     - title: string
     - seriesBy: "Auto" | "Rows" | "Columns"

5. **addWorksheet**
   - description: Add a new sheet.
   - properties:
     - name: string

6. **freezePanes**
    - description: Freeze rows or columns
    - properties:
      - type: "Row" | "Column"
      - count: number (e.g., 1 for top row)
`;

/**
 * Helper to convert Blob to Base64 Part for Gemini
 */
async function blobToGenerativePart(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64data,
                    mimeType: blob.type
                }
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Natural Language Service (Client-Side Only)
 * Uses Google Generative AI SDK directly.
 */
const NaturalLanguageService = {

    /**
     * Process voice command audio blob.
     */
    processVoiceCommand: async (audioBlob) => {
        try {
            // Get context
            let contextInfo = "No selection info.";
            try {
                await Excel.run(async (context) => {
                    const range = context.workbook.getSelectedRange();
                    range.load("address");
                    await context.sync();
                    contextInfo = `Selected Range: "${range.address}"`;
                });
            } catch (e) {
                console.warn("Excel context error:", e);
            }

            const audioPart = await blobToGenerativePart(audioBlob);
            
            const prompt = `${ACTION_SCHEMA}\n\nContext: ${contextInfo}\nUser Voice Command (Audio Provided)\n\nJSON Response:`;
            
            const result = await model.generateContent([prompt, audioPart]);
            const responseText = result.response.text();
            
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            if (!parsed.actions || !Array.isArray(parsed.actions)) {
                return { text: "I heard you, but didn't generate any Excel actions.", actions: [] };
            }

            // Execute Actions
            await NaturalLanguageService.executeActions(parsed.actions);

            return {
                text: `Done! Executed ${parsed.actions.length} action(s).`,
                actions: parsed.actions
            };

        } catch (error) {
            console.error("Voice Processing Error:", error);
            throw error;
        }
    },

    /**
     * Process a natural language command text.
     */
    processCommand: async (command) => {
        try {
            // Get context (current selection)
            let contextInfo = "No selection info.";
            try {
                await Excel.run(async (context) => {
                    const range = context.workbook.getSelectedRange();
                    range.load("address");
                    const sheet = context.workbook.worksheets.getActiveWorksheet();
                    sheet.load("name");
                    await context.sync();
                    contextInfo = `Current Sheet: "${sheet.name}". Selected Range: "${range.address}"`;
                });
            } catch (e) {
                console.warn("Could not get Excel context (likely not in Excel):", e);
            }

            const prompt = `${ACTION_SCHEMA}\n\nContext: ${contextInfo}\nUser Request: "${command}"\n\nJSON Response:`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            let parsed;
            try {
                 parsed = JSON.parse(cleanJson);
            } catch (e) {
                // If it fails, sometimes Gemini adds extra text. We might want to be more robust, 
                // but usually the prompt engineering handles it.
                throw new Error("Failed to parse AI response: " + responseText);
            }

            if (!parsed.actions || !Array.isArray(parsed.actions)) {
                return "No valid actions generated.";
            }

            // Execute Actions
            await NaturalLanguageService.executeActions(parsed.actions);

            return `Done! Executed ${parsed.actions.length} action(s).`;

        } catch (error) {
            console.error("AI Processing Error:", error);
            return `Error: ${error.message}`;
        }
    },

    /**
     * Execute the array of JSON actions in Excel.
     */
    executeActions: async (actions) => {
        console.log("Executing Actions:", actions);
        let errorMessages = [];

        await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getActiveWorksheet();

            // Get current selection address to use as default
            const selection = context.workbook.getSelectedRange();
            selection.load("address");
            await context.sync();
            const defaultAddress = selection.address;

            for (const action of actions) {
                try {
                    // Resolve address: Use provided or default to selection
                    const targetAddress = action.address || defaultAddress;
                    let targetRange = sheet.getRange(targetAddress);

                    switch (action.type) {
                        case 'editCell':
                            if (action.values) {
                                targetRange.values = action.values;
                            }
                            break;

                        case 'formatRange':
                            const f = action.format;
                            if (f.fill) targetRange.format.fill.color = f.fill;
                            if (f.fontColor) targetRange.format.font.color = f.fontColor;
                            if (f.bold !== undefined) targetRange.format.font.bold = f.bold;
                            if (f.italic !== undefined) targetRange.format.font.italic = f.italic;
                            if (f.fontSize) targetRange.format.font.size = f.fontSize;
                            if (f.numberFormat) targetRange.numberFormat = [[f.numberFormat]];
                            if (f.horizontalAlignment) targetRange.format.horizontalAlignment = f.horizontalAlignment;

                            if (f.columnWidth === 'AutoFit') targetRange.getEntireColumn().format.autofitColumns();
                            else if (typeof f.columnWidth === 'number') targetRange.columnWidth = f.columnWidth;
                            break;

                        case 'createTable':
                            // tables.add requires string address.
                            const table = sheet.tables.add(targetAddress, action.hasHeaders || true);
                            if (action.name) table.name = action.name;
                            break;

                        case 'createChart':
                            let chartType = Excel.ChartType.columnClustered;
                            if (action.type === 'Line') chartType = Excel.ChartType.line;
                            if (action.type === 'Pie') chartType = Excel.ChartType.pie;
                            if (action.type === 'BarClustered') chartType = Excel.ChartType.barClustered;

                            // Use provided dataRange or default selection
                            const dataRange = action.dataRange ? sheet.getRange(action.dataRange) : targetRange;

                            const chart = sheet.charts.add(chartType, dataRange, action.seriesBy === 'Rows' ? Excel.ChartSeriesBy.rows : Excel.ChartSeriesBy.columns);

                            if (action.title) chart.title.text = action.title;
                            break;

                        case 'addWorksheet':
                            context.workbook.worksheets.add(action.name);
                            break;

                        case 'freezePanes':
                            if (action.type === 'Row') sheet.freezePanes.freezeRows(action.count || 1);
                            if (action.type === 'Column') sheet.freezePanes.freezeColumns(action.count || 1);
                            break;
                    }
                } catch (innerError) {
                    console.warn(`Failed to execute action ${action.type}:`, innerError);
                    errorMessages.push(`${action.type}: ${innerError.message}`);
                }
            }
            await context.sync();
        });

        if (errorMessages.length > 0) {
            throw new Error(`Errors during execution: ${errorMessages.join(", ")}`);
        }
    }
};

export default NaturalLanguageService;
