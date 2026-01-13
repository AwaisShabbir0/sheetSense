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
                    let targetRange;
                    try {
                        targetRange = sheet.getRange(targetAddress);
                    } catch (e) {
                        targetRange = selection;
                    }
                    let anchorRange = targetRange.getCell(0, 0);

                    switch (actionType) {
                        case 'editCell':
                            const rawValue = action.values || action.value;
                            if (rawValue !== undefined && rawValue !== null) {
                                let val = rawValue;
                                if (!Array.isArray(val)) val = [[val]];
                                else if (val.length > 0 && !Array.isArray(val[0])) val = [val];

                                const dataRows = val.length;
                                const dataCols = val[0].length;

                                targetRange.load(["rowCount", "columnCount"]);
                                await context.sync();

                                if (dataRows === 1 && dataCols === 1 && (targetRange.rowCount > 1 || targetRange.columnCount > 1)) {
                                    const fillVal = val[0][0];
                                    const expandedData = Array(targetRange.rowCount).fill().map(() => Array(targetRange.columnCount).fill(fillVal));
                                    targetRange.values = expandedData;
                                } else {
                                    const target = anchorRange.getResizedRange(dataRows - 1, dataCols - 1);
                                    target.values = val;
                                }
                            } else {
                                errorMessages.push(`Action 'editCell' missing 'values' or 'value'`);
                            }
                            break;

                        case 'formatRange':
                            const f = action.format;
                            if (!f) {
                                console.warn("Action 'formatRange' missing 'format' property");
                                break;
                            }
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
                            const pivotSource = action.sourceRange ? sheet.getRange(action.sourceRange) : targetRange;
                            let pivotDestSheet = sheet;
                            let pivotDestCell = "A1";

                            if (!action.destinationCell) {
                                pivotDestSheet = context.workbook.worksheets.add(`Pivot_${Math.floor(Math.random() * 1000)}`);
                            } else {
                                pivotDestCell = action.destinationCell;
                            }

                            const pivotTable = pivotDestSheet.pivotTables.add("PivotTable1", pivotSource, pivotDestCell);

                            if (action.rows) action.rows.forEach(r => pivotTable.rowHierarchies.add(pivotTable.hierarchies.getItem(r)));
                            if (action.columns) action.columns.forEach(c => pivotTable.columnHierarchies.add(pivotTable.hierarchies.getItem(c)));
                            if (action.values) action.values.forEach(v => pivotTable.dataHierarchies.add(pivotTable.hierarchies.getItem(v)));
                            break;

                        case 'sortRange':
                            const sortFields = [{ key: action.keyColumnIndex || 0, ascending: action.ascending !== false }];
                            targetRange.sort.apply(sortFields);
                            break;

                        case 'trim_whitespace':
                        case 'trimWhitespace':
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
                            if (columns.length > 0 && typeof columns[0] === 'string') {
                                const headerRow = targetRange.getRow(0);
                                headerRow.load("values");
                                await context.sync();
                                const headers = headerRow.values[0];
                                const mappedIndices = [];
                                columns.forEach(colName => {
                                    const index = headers.findIndex(h => h.toString().toLowerCase() === colName.toLowerCase());
                                    if (index !== -1) mappedIndices.push(index);
                                });
                                columns = mappedIndices.length > 0 ? mappedIndices : [0];
                            }
                            targetRange.removeDuplicates(columns, true);
                            break;

                        case 'highlight_cells':
                        case 'highlightCells':
                            targetRange.load(["values", "address", "rowCount", "columnCount"]);
                            await context.sync();
                            const highlightColor = getColor(action.color || "yellow");

                            if (action.condition === 'empty') {
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.containsBlanks);
                                cf.containsBlanks.format.fill.color = highlightColor;
                            } else if (action.condition === 'errors') {
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.containsErrors);
                                cf.containsErrors.format.fill.color = highlightColor;
                            } else if (action.condition === 'non-empty') {
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
                                const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.cellValue);
                                cf.cellValue.format.font.bold = true;
                                cf.cellValue.format.font.color = "red";
                                cf.cellValue.rule = { formula1: `="${action.value}"`, operator: Excel.ConditionalCellValueOperator.equalTo };
                            }
                            break;

                        case 'generate_restaurant_report':
                            // Load start position
                            targetRange.load(["rowIndex", "columnIndex"]);
                            await context.sync();
                            const sr = targetRange.rowIndex;
                            const sc = targetRange.columnIndex;

                            // 1. TOP HEADER
                            // Using relative coordinates (sr + offset, sc + offset)
                            const titleRange = sheet.getRangeByIndexes(sr + 0, sc + 0, 1, 16);
                            titleRange.merge(); // Merge FIRST
                            // Fix: Assign to top-left cell of the merged range to avoid dimension mismatch
                            titleRange.getCell(0, 0).values = [["RESTAURANT MONTHLY SALES REPORT TEMPLATE"]];
                            titleRange.format.font.bold = true;
                            titleRange.format.font.size = 20;

                            // Inputs relative to start
                            sheet.getRangeByIndexes(sr + 2, sc + 0, 1, 1).values = [["RESTAURANT NAME"]]; // A3
                            sheet.getRangeByIndexes(sr + 2, sc + 4, 1, 1).values = [["DATES OF REPORT"]]; // E3
                            sheet.getRangeByIndexes(sr + 4, sc + 0, 1, 1).values = [["ASSIGNED MANAGER"]]; // A5
                            sheet.getRangeByIndexes(sr + 4, sc + 4, 1, 1).values = [["SIGNATURE"]];       // E5

                            // Input boxes styling
                            sheet.getRangeByIndexes(sr + 3, sc + 0, 1, 4).format.fill.color = "#F2F2F2"; // A4:D4
                            sheet.getRangeByIndexes(sr + 3, sc + 4, 1, 4).format.fill.color = "#F2F2F2"; // E4:H4
                            sheet.getRangeByIndexes(sr + 5, sc + 0, 1, 4).format.fill.color = "#F2F2F2"; // A6:D6
                            sheet.getRangeByIndexes(sr + 5, sc + 4, 1, 4).format.fill.color = "#F2F2F2"; // E6:H6

                            // 2. MONTHLY GRIDS
                            const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
                            const items = ["Food", "Beverage (Non-Alcoholic)", "Spirits", "Beer (Bottled/Canned)", "Beer (Draft)", "Wine", "Other"];
                            const discountItems = ["Customer Discounts", "Complimentary Items", "Employee Discounts", "Other"];

                            const tableWidth = 4;
                            const tableHeight = items.length + discountItems.length + 5;
                            const gridStartRowRel = 8; // Row 9 (index 8) relative to start

                            const monthlyTotalRefs = []; // Store R1C1 offsets for Annual Total
                            // Annual Total cell will be at: Row = footerRow + 1, Col = sc + 6
                            // We need to calculate footerRow first to know the relative offsets?
                            // No, we can calculate footerRow safely now (const)
                            const footerRow = sr + gridStartRowRel + (3 * (tableHeight + 2)) + 2;
                            const annualTotalRow = footerRow + 1;
                            const annualTotalCol = sc + 6;

                            for (let i = 0; i < 12; i++) {
                                const rowPos = Math.floor(i / 4);
                                const colPos = i % 4;
                                const originR = sr + gridStartRowRel + (rowPos * (tableHeight + 2));
                                const originC = sc + (colPos * tableWidth);

                                // Header
                                const headerRange = sheet.getRangeByIndexes(originR, originC, 1, tableWidth);
                                headerRange.values = [[months[i], "", "", ""]];
                                headerRange.merge();
                                headerRange.format.fill.color = "#FFC000";
                                headerRange.format.font.bold = true;
                                headerRange.format.horizontalAlignment = "Center";

                                // Items
                                const itemsStart = originR + 1;
                                for (let j = 0; j < items.length; j++) {
                                    sheet.getRangeByIndexes(itemsStart + j, originC, 1, 1).values = [[items[j]]];
                                    sheet.getRangeByIndexes(itemsStart + j, originC + 2, 1, 1).values = [["$"]];
                                }

                                // Discounts Header
                                const discountHeaderR = itemsStart + items.length;
                                const discHeaderRange = sheet.getRangeByIndexes(discountHeaderR, originC, 1, tableWidth);
                                discHeaderRange.values = [["DISCOUNTS AND COMPS", "", "", ""]];
                                discHeaderRange.format.font.size = 8;
                                discHeaderRange.format.fill.color = "#F2F2F2";

                                // Discount Items
                                const discountsStart = discountHeaderR + 1;
                                for (let k = 0; k < discountItems.length; k++) {
                                    sheet.getRangeByIndexes(discountsStart + k, originC, 1, 1).values = [[discountItems[k]]];
                                    sheet.getRangeByIndexes(discountsStart + k, originC + 2, 1, 1).values = [["$"]];
                                }

                                // Total Row
                                const totalR = discountsStart + discountItems.length;
                                sheet.getRangeByIndexes(totalR, originC, 1, 1).values = [["TOTAL"]];
                                const totalRange = sheet.getRangeByIndexes(totalR, originC, 1, 4);
                                totalRange.format.fill.color = "#333333";
                                totalRange.format.font.color = "white";
                                totalRange.format.font.bold = true;

                                // Insert Formula: SUM of rows above (Items + Discounts)
                                // Range starts at itemsStart (relative) and ends one row above totalR
                                const rowsToSum = totalR - itemsStart;
                                sheet.getRangeByIndexes(totalR, originC + 2, 1, 1).formulasR1C1 = [[`=SUM(R[-${rowsToSum}]C:R[-1]C)`]];

                                // Calculate R1C1 offset relative to Annual Total Cell
                                const rOffset = totalR - annualTotalRow;
                                const cOffset = (originC + 2) - annualTotalCol;
                                monthlyTotalRefs.push(`R[${rOffset}]C[${cOffset}]`);
                            }

                            // 3. FINAL FOOTER
                            const paymentsRange = sheet.getRangeByIndexes(footerRow, sc + 0, 1, 5);
                            paymentsRange.values = [["PAYMENTS", "", "", "", ""]]; // Fixed dimension
                            paymentsRange.format.font.size = 14;

                            const methodList = ["MASTERCARD", "VISA", "DISCOVER", "AMEX", "CASH DEPOSIT", "REDEEMED GIFT CERTIFICATE", "TOTAL"];
                            for (let m = 0; m < methodList.length; m++) {
                                const r = footerRow + 1 + m;
                                const methodRange = sheet.getRangeByIndexes(r, sc + 0, 1, 2);
                                methodRange.values = [[methodList[m], ""]];
                                methodRange.merge();
                                methodRange.format.fill.color = (methodList[m] === "TOTAL") ? "#333333" : "#7F9DB9";
                                methodRange.format.font.color = "white";
                                methodRange.format.horizontalAlignment = "Right";

                                sheet.getRangeByIndexes(r, sc + 2, 1, 1).values = [["$"]];

                                if (methodList[m] === "TOTAL") {
                                    // Sum the payment methods above
                                    const rowsToSum = methodList.length - 1;
                                    sheet.getRangeByIndexes(r, sc + 3, 1, 1).formulasR1C1 = [[`=SUM(R[-${rowsToSum}]C:R[-1]C)`]];
                                } else {
                                    sheet.getRangeByIndexes(r, sc + 3, 1, 1).values = [["-"]];
                                }
                            }

                            // Annual Total
                            const annualTotalRange = sheet.getRangeByIndexes(footerRow, sc + 6, 1, 4);
                            annualTotalRange.values = [["ANNUAL TOTAL", "", "", ""]];

                            const annualValRange = sheet.getRangeByIndexes(footerRow + 1, sc + 6, 1, 4);
                            // Robust Formula: SUM(ref1, ref2, ref3...) containing all 12 monthly totals
                            const annualSumFormula = `=SUM(${monthlyTotalRefs.join(",")})`;
                            annualValRange.formulasR1C1 = [[annualSumFormula, "", "", ""]];
                            annualValRange.format.fill.color = "#D9D9D9";
                            annualValRange.format.font.size = 14;
                            break;

                        default:
                            console.warn(`Unsupported action type: ${actionType}`);
                            errorMessages.push(`Unsupported action type: ${actionType}`);

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
