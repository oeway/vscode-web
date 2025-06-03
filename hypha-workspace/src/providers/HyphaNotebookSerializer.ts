import * as vscode from 'vscode';

interface RawNotebookCell {
    cell_type: 'code' | 'markdown';
    source: string | string[];
    outputs?: any[];
    execution_count?: number;
    metadata?: any;
}

interface RawNotebook {
    cells: RawNotebookCell[];
    metadata: any;
    nbformat: number;
    nbformat_minor: number;
}

export class HyphaNotebookSerializer implements vscode.NotebookSerializer {
    
    async deserializeNotebook(
        content: Uint8Array,
        _token: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        const contents = new TextDecoder().decode(content);

        let raw: RawNotebook;
        try {
            raw = JSON.parse(contents);
        } catch {
            // If parsing fails, return empty notebook
            raw = {
                cells: [],
                metadata: {},
                nbformat: 4,
                nbformat_minor: 2
            };
        }

        const cells = raw.cells.map(item => {
            // Handle source properly - Jupyter stores as array of lines, each line usually ends with \n except the last
            let source: string;
            if (Array.isArray(item.source)) {
                // Join the array without adding extra newlines - the lines already contain newlines
                source = item.source.join('');
            } else {
                source = item.source;
            }

            const kind = item.cell_type === 'code' 
                ? vscode.NotebookCellKind.Code 
                : vscode.NotebookCellKind.Markup;
            
            const languageId = item.cell_type === 'code' 
                ? this.determineLanguage(source)
                : 'markdown';

            const cellData = new vscode.NotebookCellData(kind, source, languageId);
            
            // Preserve execution count for code cells
            if (item.cell_type === 'code' && item.execution_count) {
                cellData.executionSummary = {
                    executionOrder: item.execution_count
                };
            }

            // Preserve cell metadata
            if (item.metadata) {
                cellData.metadata = item.metadata;
            }

            // Convert outputs if they exist
            if (item.outputs && item.outputs.length > 0) {
                cellData.outputs = this.convertOutputs(item.outputs);
            }

            return cellData;
        });

        const notebookData = new vscode.NotebookData(cells);
        
        // Preserve notebook metadata
        if (raw.metadata) {
            notebookData.metadata = raw.metadata;
        }

        return notebookData;
    }

    async serializeNotebook(
        data: vscode.NotebookData,
        _token: vscode.CancellationToken
    ): Promise<Uint8Array> {
        const cells: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            // Split cell content into lines and add newlines properly for Jupyter format
            const lines = cell.value.split(/\r?\n/g);
            const source = lines.map((line, index) => {
                // Add newline to each line except the last one (unless the last line is empty)
                if (index === lines.length - 1) {
                    // Don't add newline to the last line if it's not empty, 
                    // but if the original content ended with a newline, preserve it
                    return line + (cell.value.endsWith('\n') || cell.value.endsWith('\r\n') ? '\n' : '');
                } else {
                    return line + '\n';
                }
            });
            
            const rawCell: RawNotebookCell = {
                cell_type: cell.kind === vscode.NotebookCellKind.Code ? 'code' : 'markdown',
                source: source,
                metadata: cell.metadata || {}
            };

            // Add outputs for code cells
            if (cell.kind === vscode.NotebookCellKind.Code) {
                rawCell.outputs = cell.outputs ? this.convertVSCodeOutputs(cell.outputs) : [];
                rawCell.execution_count = cell.executionSummary?.executionOrder || undefined;
            }

            cells.push(rawCell);
        }

        const notebook: RawNotebook = {
            cells: cells,
            metadata: data.metadata || {
                kernelspec: {
                    display_name: "Hypha Deno",
                    language: "python",
                    name: "hypha-deno"
                },
                language_info: {
                    name: "python"
                }
            },
            nbformat: 4,
            nbformat_minor: 2
        };

        return new TextEncoder().encode(JSON.stringify(notebook, null, 2));
    }

    private determineLanguage(source: string): string {
        // Simple heuristics to determine language
        if (source.includes('console.log') || source.includes('const ') || source.includes('let ') || source.includes('function ')) {
            return 'typescript';
        }
        if (source.includes('import ') && (source.includes('from ') || source.includes('as '))) {
            return 'python';
        }
        if (source.includes('print(') || source.includes('def ') || source.includes('class ') || source.includes('import ')) {
            return 'python';
        }
        return 'python'; // Default to Python for Deno
    }

    private convertOutputs(jupyterOutputs: any[]): vscode.NotebookCellOutput[] {
        const outputs: vscode.NotebookCellOutput[] = [];

        for (const output of jupyterOutputs) {
            const outputItems: vscode.NotebookCellOutputItem[] = [];

            switch (output.output_type) {
                case 'stream':
                    const text = Array.isArray(output.text) ? output.text.join('\n') : output.text;
                    if (output.name === 'stderr') {
                        outputItems.push(vscode.NotebookCellOutputItem.stderr(text));
                    } else {
                        outputItems.push(vscode.NotebookCellOutputItem.stdout(text));
                    }
                    break;

                case 'display_data':
                case 'execute_result':
                    const data = output.data || {};
                    
                    if (data['text/html']) {
                        const htmlText = Array.isArray(data['text/html']) 
                            ? data['text/html'].join('\n') 
                            : data['text/html'];
                        outputItems.push(vscode.NotebookCellOutputItem.text(htmlText, 'text/html'));
                    }
                    
                    if (data['text/markdown']) {
                        const mdText = Array.isArray(data['text/markdown']) 
                            ? data['text/markdown'].join('\n') 
                            : data['text/markdown'];
                        outputItems.push(vscode.NotebookCellOutputItem.text(mdText, 'text/markdown'));
                    }
                    
                    if (data['application/json']) {
                        outputItems.push(vscode.NotebookCellOutputItem.json(data['application/json']));
                    }
                    
                    if (data['image/png']) {
                        const imageData = this.base64ToUint8Array(data['image/png']);
                        outputItems.push(new vscode.NotebookCellOutputItem(imageData, 'image/png'));
                    }
                    
                    if (data['image/jpeg']) {
                        const imageData = this.base64ToUint8Array(data['image/jpeg']);
                        outputItems.push(new vscode.NotebookCellOutputItem(imageData, 'image/jpeg'));
                    }
                    
                    if (data['text/plain']) {
                        const plainText = Array.isArray(data['text/plain']) 
                            ? data['text/plain'].join('\n') 
                            : data['text/plain'];
                        outputItems.push(vscode.NotebookCellOutputItem.text(plainText));
                    }
                    break;

                case 'error':
                    const errorText = output.traceback ? 
                        output.traceback.join('\n') : 
                        `${output.ename}: ${output.evalue}`;
                    outputItems.push(vscode.NotebookCellOutputItem.stderr(errorText));
                    break;
            }

            if (outputItems.length > 0) {
                outputs.push(new vscode.NotebookCellOutput(outputItems));
            }
        }

        return outputs;
    }

    private convertVSCodeOutputs(vscodeOutputs: readonly vscode.NotebookCellOutput[]): any[] {
        const outputs: any[] = [];

        for (const output of vscodeOutputs) {
            for (const item of output.items) {
                const data: any = {};
                const text = new TextDecoder().decode(item.data);

                switch (item.mime) {
                    case 'text/plain':
                        outputs.push({
                            output_type: 'stream',
                            name: 'stdout',
                            text: text.split('\n')
                        });
                        break;
                    case 'application/vnd.code.notebook.stderr':
                        outputs.push({
                            output_type: 'stream',
                            name: 'stderr',
                            text: text.split('\n')
                        });
                        break;
                    case 'text/html':
                        data['text/html'] = text.split('\n');
                        outputs.push({
                            output_type: 'display_data',
                            data: data
                        });
                        break;
                    case 'application/json':
                        data['application/json'] = JSON.parse(text);
                        outputs.push({
                            output_type: 'display_data',
                            data: data
                        });
                        break;
                    case 'image/png':
                    case 'image/jpeg':
                        const base64Data = this.uint8ArrayToBase64(new Uint8Array(item.data));
                        data[item.mime] = base64Data;
                        outputs.push({
                            output_type: 'display_data',
                            data: data
                        });
                        break;
                    default:
                        // For unknown mime types, try to save as text
                        data['text/plain'] = text.split('\n');
                        outputs.push({
                            output_type: 'display_data',
                            data: data
                        });
                        break;
                }
            }
        }

        return outputs;
    }

    // Helper method to decode base64 to Uint8Array in web environment
    private base64ToUint8Array(base64: string): Uint8Array {
        try {
            // Remove data URL prefix if present
            const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
            
            // Use browser's atob to decode base64
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            return bytes;
        } catch (error) {
            console.error('[Hypha Notebook] Failed to decode base64 image:', error);
            // Return empty array as fallback
            return new Uint8Array(0);
        }
    }

    // Helper method to encode Uint8Array to base64 in web environment
    private uint8ArrayToBase64(uint8Array: Uint8Array): string {
        try {
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binaryString += String.fromCharCode(uint8Array[i]);
            }
            return btoa(binaryString);
        } catch (error) {
            console.error('[Hypha Notebook] Failed to encode base64 image:', error);
            return '';
        }
    }
} 