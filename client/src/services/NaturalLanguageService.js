/* global Excel */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const BASE_URL = "https://api.groq.com/openai/v1";

const ACTION_SCHEMA = `
You are an AI assistant for Microsoft Excel. Your job is to translate user requests into JSON actions that can be executed by the Excel Add-in.

CRITICAL INSTRUCTION:
- You must prioritize **DOING** over **EXPLAINING**.
- If the user request is vague (e.g., "format this table", "make it look good"), **INFER REASONABLE DEFAULTS** (e.g., use a professional blue header style, standard font ranges) and EXECUTE the actions immediately.
- Do NOT simply describe what you can do. Do it.
- Only ask for clarification if the request is impossible to infer (e.g., "put the value here" with no value provided).

Return a JSON OBJECT with two keys:
1. "actions": an ARRAY of action objects. Each object MUST have a "type" field matching the Supported Actions below.
2. "message": a string containing a natural language response to the user. be helpful, concise and friendly. If you execute actions, briefly mention what you did (e.g., "I've applied a professional format to your table.").

Do NOT return markdown. Return ONLY raw JSON.

Supported Actions:
1. **editCell** (address, values, isFormula)
2. **formatRange** (address, format: {fill, fontColor, bold, italic, fontSize, numberFormat, horizontalAlignment, columnWidth})
   - Example Defaults: header fill "#4F81BD", header text "white", bold true.
3. **createTable** (address, hasHeaders, name)
4. **createChart** (dataRange, type, title, seriesBy)
5. **addWorksheet** (name)
6. **freezePanes** (type: "Row"|"Column", count)
`;


const NaturalLanguageService = {

    /**
     * Process voice command audio blob.
     */
    processVoiceCommand: async (audioBlob) => {
        try {
            const formData = new FormData();
            formData.append("file", audioBlob, "command.wav");
            formData.append("model", "distil-whisper-large-v3-en");
            formData.append("response_format", "json");

            const response = await fetch(`${BASE_URL}/audio/transcriptions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Groq Voice Error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const userCommand = data.text;
            console.log("Transcribed Command:", userCommand);

            if (!userCommand || userCommand.trim().length === 0) {
                return { text: "I couldn't hear any command.", actions: [] };
            }

            return await NaturalLanguageService.processCommand(userCommand);

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
                console.warn("Could not get Excel context:", e);
            }

            const payload = {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: ACTION_SCHEMA },
                    { role: "user", content: `Context: ${contextInfo}\nUser Request: ${command}` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            };

            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Groq API Error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const responseText = data.choices[0].message.content;
            console.log("Groq Response:", responseText);

            let parsed;
            try {
                parsed = JSON.parse(responseText);
            } catch (e) {
                throw new Error("Failed to parse AI response: " + responseText);
            }

            if (!parsed.actions || !Array.isArray(parsed.actions)) {
                return "No valid actions generated.";
            }

            // Execute Actions
            await NaturalLanguageService.executeActions(parsed.actions);

            const userFriendlyMessage = parsed.message || `Done! Executed ${parsed.actions.length} action(s).`;

            return {
                text: userFriendlyMessage,
                actions: parsed.actions
            };

        } catch (error) {
            console.error("AI Processing Error:", error);
            return `Error: ${error.message}`;
        }
    },

    executeActions: async (actions) => {
        // Implementation remains the same as before, just referencing the existing logic
        // We will copy the full executeActions block from previous version or rewrite it if we overwrite.
        // For specific tool call, I will include the full body.

        console.log("Executing Actions:", actions);
        let errorMessages = [];

        await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getActiveWorksheet();
            const selection = context.workbook.getSelectedRange();
            selection.load("address");
            await context.sync();
            const defaultAddress = selection.address;

            for (const action of actions) {
                // Fallback: Check 'action' if 'type' is missing
                const actionType = action.type || action.action;

                try {
                    const targetAddress = action.address || defaultAddress;
                    // Get 'Top-Left' cell of the target address to start anchoring
                    // We will use this to resize based on data shape
                    let anchorRange = sheet.getRange(targetAddress).getCell(0, 0);

                    switch (actionType) {
                        case 'editCell':
                            if (action.values) {
                                let val = action.values;
                                // Normalize to 2D array if it's a string, number, or 1D array
                                if (!Array.isArray(val)) {
                                    val = [[val]];
                                } else if (val.length > 0 && !Array.isArray(val[0])) {
                                    // If 1D array, AI usually means a list.
                                    // Heuristic: If user asked for "Column", transpose to vertical?
                                    // For now, let's treat 1D as 1 Row (standard). 
                                    // If AI is smart, it sends [[1],[2]] for column.
                                    val = [val];
                                }

                                const rows = val.length;
                                const cols = val[0].length;

                                // Resize range to match data dimensions
                                const target = anchorRange.getResizedRange(rows - 1, cols - 1);
                                target.values = val;
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
                            const table = sheet.tables.add(targetAddress, action.hasHeaders || true);
                            if (action.name) table.name = action.name;
                            break;
                        case 'createChart':
                            let chartType = Excel.ChartType.columnClustered;
                            if (action.type === 'Line') chartType = Excel.ChartType.line;
                            if (action.type === 'Pie') chartType = Excel.ChartType.pie;
                            if (action.type === 'BarClustered') chartType = Excel.ChartType.barClustered;
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
                    console.warn(`Failed to execute action ${actionType}:`, innerError);
                    errorMessages.push(`${actionType}: ${innerError.message}`);
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
