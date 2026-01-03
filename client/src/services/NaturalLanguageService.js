/* global Excel */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const BASE_URL = "https://api.groq.com/openai/v1";

import taskLibrary from '../excel_task_library.json';

// Helper to map common color names to hex or use as-is
function getColor(colorName) {
    const colors = {
        "red": "#FF0000", "green": "#00FF00", "blue": "#0000FF",
        "yellow": "#FFFF00", "black": "#000000", "white": "#FFFFFF",
        "orange": "#FFA500", "purple": "#800080", "gray": "#808080"
    };
    return colors[colorName.toLowerCase()] || colorName;
}

const ACTION_SCHEMA = `
You are an AI assistant for Microsoft Excel. Your job is to translate user requests into JSON actions that can be executed by the Excel Add-in.

CRITICAL INSTRUCTION:
- **YOU CANNOT SEE THE DATA**. Do not guess cell addresses for "empty cells" or "values > 5". 
- ALWAYS use **conditional_formatting**  or **highlight_cells** for tasks involving data conditions (e.g. "highlight empty", "color values over 100").
- If the user request is vague, **INFER REASONABLE DEFAULTS** and EXECUTE.
- Do not ask for clarification.

Return a JSON OBJECT with two keys:
1. "actions": an ARRAY of action objects.
2. "message": a concise natural language response.

Supported Actions:
1. **editCell** (address, values)
2. **formatRange** (address, format: {fill, fontColor, ...})
3. **createTable**, **createChart**, **addWorksheet**, **freezePanes**
4. **createPivotTable**, **sortRange**, **removeDuplicates**
5. **highlight_cells** (range, condition: "empty"|"non-empty"|"errors", color)
   - Use this to highlight specific cells based on content.
6. **conditional_formatting** (range, rule, value, color)
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

    findMatchingTask: (command) => {
        const lowerCommand = command.toLowerCase();
        // Simple heuristic matching
        const match = taskLibrary.find(task => {
            return lowerCommand.includes(task.task_name.toLowerCase()) ||
                lowerCommand.includes(task.command_example.toLowerCase().replace("this", "").trim());
        });
        return match;
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

            // Check for Task Library Match
            const matchedTask = NaturalLanguageService.findMatchingTask(command);
            let systemPrompt = ACTION_SCHEMA;

            if (matchedTask) {
                console.log("Matched Task Library:", matchedTask.task_name);
                systemPrompt += `\n\nUSER INTENT MATCHED: "${matchedTask.task_name}" (${matchedTask.intent_category}).
                RECOMMENDED PROCEDURE:
                ${JSON.stringify(matchedTask.actions, null, 2)}
                
                INSTRUCTION: Follow the procedure above. Convert these high-level steps into the supported actions.
                If a step requires an unsupported action, attempt to approximate it using available tools (e.g. formulas in cells).`;
            } else {
                systemPrompt += `\n\nTask Library: I have access to a library of standard Excel tasks (Reporting, Analysis, Cleaning). If the user request implies one of these, execute the standard procedure.`;
            }

            const payload = {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
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
                    let targetRange;
                    try {
                        targetRange = sheet.getRange(targetAddress);
                    } catch (e) {
                        // Fallback if address is invalid or missing, use selection
                        targetRange = selection;
                    }
                    let anchorRange = targetRange.getCell(0, 0);

                    switch (actionType) {
                        case 'editCell':
                            const rawValue = action.values || action.value;
                            if (rawValue !== undefined && rawValue !== null) {
                                let val = rawValue;
                                // Normalize to 2D array if it's a string, number, or 1D array
                                if (!Array.isArray(val)) {
                                    val = [[val]];
                                } else if (val.length > 0 && !Array.isArray(val[0])) {
                                    val = [val];
                                }

                                const rows = val.length;
                                const cols = val[0].length;

                                // Resize range to match data dimensions
                                const target = anchorRange.getResizedRange(rows - 1, cols - 1);
                                target.values = val;
                            } else {
                                errorMessages.push(`Action 'editCell' missing 'values' or 'value'`);
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
                        case 'createPivotTable':
                            // Basic Pivot Table implementation
                            // Requires: sourceRange, destinationCell (default: new sheet)
                            // rows, columns, values (arrays of strings)
                            const pivotSource = action.sourceRange ? sheet.getRange(action.sourceRange) : targetRange;

                            let pivotDestSheet = sheet;
                            let pivotDestCell = "A1";

                            if (!action.destinationCell) {
                                // Default to new sheet
                                pivotDestSheet = context.workbook.worksheets.add(`Pivot_${Math.floor(Math.random() * 1000)}`);
                            } else {
                                pivotDestCell = action.destinationCell;
                            }

                            const pivotTable = pivotDestSheet.pivotTables.add("PivotTable1", pivotSource, pivotDestCell);

                            if (action.rows) {
                                action.rows.forEach(r => pivotTable.rowHierarchies.add(pivotTable.hierarchies.getItem(r)));
                            }
                            if (action.columns) {
                                action.columns.forEach(c => pivotTable.columnHierarchies.add(pivotTable.hierarchies.getItem(c)));
                            }
                            if (action.values) {
                                action.values.forEach(v => pivotTable.dataHierarchies.add(pivotTable.hierarchies.getItem(v)));
                            }
                            break;
                        case 'sortRange':
                            // Helper for sorting
                            const sortFields = [
                                {
                                    key: action.keyColumnIndex || 0,
                                    ascending: action.ascending !== false // default true
                                }
                            ];
                            targetRange.sort.apply(sortFields);
                            break;
                        case 'trim_whitespace':
                        case 'trimWhitespace':
                            // Implementation for trimming whitespace
                            targetRange.load("values");
                            await context.sync();
                            const trimmedValues = targetRange.values.map(row =>
                                row.map(cell => (typeof cell === 'string' ? cell.trim() : cell))
                            );
                            targetRange.values = trimmedValues;
                            break;

                        case 'removeDuplicates':
                        case 'remove_duplicates':
                            let columns = action.columns || [0];

                            // Check if columns are strings and mapping is needed
                            if (columns.length > 0 && typeof columns[0] === 'string') {
                                // We need to read specific columns.
                                // NOTE: Reading headers to map strings to indices is safer but adds complexity.
                                // Fallback Strategy: If strings are provided, use ALL columns to be safe, 
                                // or if specific mapping is strictly required, we'd need to fetch headers.

                                // Let's try to fetch headers if we have strings.
                                const headerRow = targetRange.getRow(0);
                                headerRow.load("values");
                                await context.sync();
                                const headers = headerRow.values[0]; // 1D array of headers

                                const mappedIndices = [];
                                columns.forEach(colName => {
                                    const index = headers.findIndex(h => h.toString().toLowerCase() === colName.toLowerCase());
                                    if (index !== -1) mappedIndices.push(index);
                                });

                                if (mappedIndices.length > 0) {
                                    columns = mappedIndices;
                                } else {
                                    // If no match found, default to first column or 0
                                    console.warn("Could not match custom column names, defaulting to column 0");
                                    columns = [0];
                                }
                            }

                            // Ensure columns is an array of numbers
                            targetRange.removeDuplicates(columns, true);
                            break;

                        case 'highlight_cells':
                        case 'highlightCells':
                            // Logic: Highlight empty cells or specific condition
                            // Simplification: Loop and check condition
                            targetRange.load(["values", "address", "rowCount", "columnCount"]);
                            await context.sync();

                            const highlightColor = getColor(action.color || "yellow"); // Use a different variable name to avoid conflict

                            // Note: Setting format cell-by-cell is slow. 
                            // Optimization: Collect ranges? Or just set condition if formatting rule?
                            // "conditional_formatting" action is better for this.
                            // IF explicitly asking to "highlight", we can use a conditional format rule for "Blanks".

                            if (action.condition === 'empty') {
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.containsBlanks);
                                cf.containsBlanks.format.fill.color = highlightColor;
                            } else if (action.condition === 'errors') {
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.containsErrors);
                                cf.containsErrors.format.fill.color = highlightColor;
                            } else if (action.condition === 'non-empty') {
                                // Fallback for non-empty: Use CellValue NotEqual to empty string?
                                // This is imperfect but safely executes without crashing using valid enums.
                                // Alternatively, simply ignore or log warning since 'noBlanks' enum doesn't exist.
                                // For now, let's omit the invalid branch to stop crashing.
                                console.warn("Condition 'non-empty' is not directly supported via simple highlighted cells yet.");
                            }
                            break;

                        case 'conditional_formatting':
                            const cfColor = getColor(action.color || "red");
                            if (action.rule === 'color_scale_red_yellow_green') {
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.colorScale);
                                cf.colorScale.criteria = {
                                    minimum: { formula: null, type: Excel.ConditionalFormatColorCriterionType.lowestValue, color: "#F8696B" },
                                    midpoint: { formula: null, type: Excel.ConditionalFormatColorCriterionType.percentile, color: "#FFEB84" },
                                    maximum: { formula: null, type: Excel.ConditionalFormatColorCriterionType.highestValue, color: "#63BE7B" }
                                };
                            } else if (action.rule === 'less_than') {
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.cellValue);
                                cf.cellValue.format.font.color = cfColor;
                                cf.cellValue.rule = { formula1: action.value.toString(), operator: Excel.ConditionalCellValueOperator.lessThan };
                            } else if (action.rule === 'greater_than') {
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.cellValue);
                                cf.cellValue.format.font.color = cfColor;
                                cf.cellValue.rule = { formula1: action.value.toString(), operator: Excel.ConditionalCellValueOperator.greaterThan };
                            } else if (action.value === 'REORDER') {
                                // Specific text rule
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.cellValue);
                                cf.cellValue.format.font.bold = true;
                                cf.cellValue.format.font.color = "red";
                                cf.cellValue.rule = { formula1: `="${action.value}"`, operator: Excel.ConditionalCellValueOperator.equalTo };
                            }
                            break;

                        default:
                            console.warn(`Unsupported action type: ${actionType}`);
                            errorMessages.push(`Unsupported action type: ${actionType}`);

                    }
                } catch (innerError) {
                    console.warn(`Failed to execute action ${actionType}:`, innerError);
                    errorMessages.push(`${actionType}: ${innerError.message}`);
                }
            } // end for loop
            await context.sync();
        });

        if (errorMessages.length > 0) {
            throw new Error(`Errors during execution: ${errorMessages.join(", ")}`);
        }
    }
};

export default NaturalLanguageService;
