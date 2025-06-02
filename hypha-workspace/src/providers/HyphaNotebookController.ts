import * as vscode from 'vscode';
import { HyphaAuthProvider } from './HyphaAuthProvider';

interface KernelInfo {
    kernelId?: string;
    id?: string;
    mode?: string;
    language?: string;
}

// Global kernel cache to persist across controller instances
const globalKernelCache = new Map<string, { denoService: any, kernelInfo: KernelInfo }>();

export class HyphaNotebookController {
    readonly controllerId = 'hypha-deno-controller';
    readonly notebookType = 'jupyter-notebook';
    readonly label = 'Hypha Deno Kernel';
    readonly supportedLanguages = ['python', 'typescript', 'javascript'];

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    private denoService: any = null;
    private kernelInfo: KernelInfo = {};
    private authProvider: HyphaAuthProvider;
    private instanceId: string;

    constructor(authProvider: HyphaAuthProvider) {
        this.authProvider = authProvider;
        this.instanceId = `controller-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`[Hypha Deno] Creating controller instance: ${this.instanceId}`);
        
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
        this._controller.description = 'Execute code using remote Deno kernel via Hypha server';
        this._controller.detail = 'Connects to Hypha server to execute code in a remote Deno runtime';
    }

    private async initializeKernel(): Promise<void> {
        const cacheKey = 'global-deno-kernel'; // Use a single global kernel for all instances
        
        console.log(`[Hypha Deno] [${this.instanceId}] Checking kernel initialization...`);
        
        // First check local instance
        if (this.denoService && (this.kernelInfo.kernelId || this.kernelInfo.id)) {
            console.log(`[Hypha Deno] [${this.instanceId}] Local kernel exists:`, this.kernelInfo.kernelId || this.kernelInfo.id);
            return;
        }
        
        // Check global cache
        const cachedKernel = globalKernelCache.get(cacheKey);
        if (cachedKernel && cachedKernel.denoService && (cachedKernel.kernelInfo.kernelId || cachedKernel.kernelInfo.id)) {
            console.log(`[Hypha Deno] [${this.instanceId}] Reusing cached kernel:`, cachedKernel.kernelInfo.kernelId || cachedKernel.kernelInfo.id);
            this.denoService = cachedKernel.denoService;
            this.kernelInfo = cachedKernel.kernelInfo;
            return;
        }

        try {
            console.log(`[Hypha Deno] [${this.instanceId}] Initializing connection to Hypha server...`);
            
            if (!this.authProvider.isAuthenticated()) {
                throw new Error('Please login to Hypha server first');
            }

            const server = await this.authProvider.getServer();
            if (!server) {
                throw new Error('No Hypha server connection available');
            }

            console.log(`[Hypha Deno] [${this.instanceId}] Getting Deno service...`);
            this.denoService = await server.getService('hypha-agents/deno-app-engine', { mode: 'random' });
            
            console.log(`[Hypha Deno] [${this.instanceId}] Creating new kernel...`);
            this.kernelInfo = await this.denoService.createKernel({});
            
            console.log(`[Hypha Deno] [${this.instanceId}] Kernel created successfully:`, {
                id: this.kernelInfo.id,
                kernelId: this.kernelInfo.kernelId,
                mode: this.kernelInfo.mode,
                language: this.kernelInfo.language
            });
            
            // Cache the kernel globally
            globalKernelCache.set(cacheKey, {
                denoService: this.denoService,
                kernelInfo: this.kernelInfo
            });
            console.log(`[Hypha Deno] [${this.instanceId}] Kernel cached globally`);
            
        } catch (error) {
            console.error(`[Hypha Deno] [${this.instanceId}] Failed to initialize kernel:`, error);
            // Reset kernel info on failure so we can retry
            this.kernelInfo = {};
            this.denoService = null;
            globalKernelCache.delete(cacheKey);
            throw error;
        }
    }

    private _execute(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): void {
        for (let cell of cells) {
            this._doExecution(cell);
        }
    }

    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now());

        try {
            console.log(`[Hypha Deno] [${this.instanceId}] Starting execution for cell`);
            
            // Initialize kernel if needed
            await this.initializeKernel();

            const code = cell.document.getText();

            // Handle empty code
            if (!code || code.trim() === '') {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text('(empty cell)')
                    ])
                ]);
                execution.end(true, Date.now());
                return;
            }

            console.log(`[Hypha Deno] [${this.instanceId}] Executing code with kernel:`, this.kernelInfo.kernelId || this.kernelInfo.id);
            console.log(`[Hypha Deno] [${this.instanceId}] Code: ${code}`);

            // Execute code using the Deno service
            const streamGenerator = await this.denoService.streamExecution({
                kernelId: this.kernelInfo.kernelId || this.kernelInfo.id,
                code: code
            });

            const outputs: vscode.NotebookCellOutput[] = [];
            let hasError = false;

            // Process the stream
            for await (const output of streamGenerator) {
                console.log(`[Hypha Deno] [${this.instanceId}] Output:`, output);

                if (output.type === 'complete') {
                    console.log(`[Hypha Deno] [${this.instanceId}] Execution completed`);
                    break;
                }

                if (output.type === 'error') {
                    hasError = true;
                    const errorData = output.data || {};
                    const errorText = errorData.traceback ? 
                        errorData.traceback.join('\n') :
                        `${errorData.ename || 'Error'}: ${errorData.evalue || 'Unknown error'}`;
                    
                    outputs.push(new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.stderr(errorText)
                    ]));
                    continue;
                }

                // Process different output types
                const cellOutput = this.processCellOutput(output);
                if (cellOutput) {
                    outputs.push(cellOutput);
                }
            }

            // Set the outputs
            execution.replaceOutput(outputs);
            execution.end(!hasError, Date.now());

        } catch (error) {
            console.error(`[Hypha Deno] [${this.instanceId}] Execution error:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.stderr(`Execution failed: ${errorMessage}`)
                ])
            ]);
            execution.end(false, Date.now());
        }
    }

    private processCellOutput(output: any): vscode.NotebookCellOutput | null {
        switch (output.type) {
            case 'stream':
                const streamData = output.data;
                const content = streamData.text;
                if (!content) return null;

                if (streamData.name === 'stderr') {
                    return new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.stderr(content)
                    ]);
                } else {
                    return new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.stdout(content)
                    ]);
                }

            case 'display_data':
            case 'execute_result':
                const data = output.data?.data || {};
                const outputItems: vscode.NotebookCellOutputItem[] = [];

                // Process different mime types
                if (data['text/html']) {
                    outputItems.push(vscode.NotebookCellOutputItem.text(data['text/html'], 'text/html'));
                }
                if (data['text/markdown']) {
                    outputItems.push(vscode.NotebookCellOutputItem.text(data['text/markdown'], 'text/markdown'));
                }
                if (data['application/json']) {
                    outputItems.push(vscode.NotebookCellOutputItem.json(data['application/json']));
                }
                if (data['image/png']) {
                    // Use web-compatible base64 decoding
                    const imageData = this.base64ToUint8Array(data['image/png']);
                    outputItems.push(new vscode.NotebookCellOutputItem(imageData, 'image/png'));
                }
                if (data['image/jpeg']) {
                    const imageData = this.base64ToUint8Array(data['image/jpeg']);
                    outputItems.push(new vscode.NotebookCellOutputItem(imageData, 'image/jpeg'));
                }
                if (data['text/plain']) {
                    outputItems.push(vscode.NotebookCellOutputItem.text(data['text/plain']));
                }

                if (outputItems.length > 0) {
                    return new vscode.NotebookCellOutput(outputItems);
                }
                break;

            default:
                // For unknown types, try to display as text
                if (output.data && typeof output.data === 'string') {
                    return new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text(output.data)
                    ]);
                }
                break;
        }

        return null;
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
            console.error('[Hypha Deno] Failed to decode base64 image:', error);
            // Return empty array as fallback
            return new Uint8Array(0);
        }
    }

    public async restart(): Promise<void> {
        const cacheKey = 'global-deno-kernel';
        
        try {
            console.log(`[Hypha Deno] [${this.instanceId}] Restarting kernel...`);
            
            // Get the current kernel from cache or instance
            const cachedKernel = globalKernelCache.get(cacheKey);
            const denoService = this.denoService || cachedKernel?.denoService;
            const kernelInfo = this.kernelInfo || cachedKernel?.kernelInfo;
            
            if (denoService && (kernelInfo?.kernelId || kernelInfo?.id)) {
                const success = await denoService.restartKernel({
                    kernelId: kernelInfo.kernelId || kernelInfo.id
                });
                
                if (success) {
                    console.log(`[Hypha Deno] [${this.instanceId}] Kernel restarted successfully`);
                } else {
                    throw new Error('Failed to restart kernel');
                }
            } else {
                console.log(`[Hypha Deno] [${this.instanceId}] No kernel to restart, will create new one on next execution`);
            }
        } catch (error) {
            console.error(`[Hypha Deno] [${this.instanceId}] Failed to restart kernel:`, error);
            // Clear cache on restart failure
            this.kernelInfo = {};
            this.denoService = null;
            globalKernelCache.delete(cacheKey);
            throw error;
        }
    }

    public async interrupt(): Promise<void> {
        const cacheKey = 'global-deno-kernel';
        
        try {
            console.log(`[Hypha Deno] [${this.instanceId}] Interrupting kernel...`);
            
            // Get the current kernel from cache or instance
            const cachedKernel = globalKernelCache.get(cacheKey);
            const denoService = this.denoService || cachedKernel?.denoService;
            const kernelInfo = this.kernelInfo || cachedKernel?.kernelInfo;
            
            if (denoService && (kernelInfo?.kernelId || kernelInfo?.id)) {
                const result = await denoService.interruptKernel({
                    kernelId: kernelInfo.kernelId || kernelInfo.id
                });
                
                if (!result.success) {
                    throw new Error('Failed to interrupt kernel');
                }
                
                console.log(`[Hypha Deno] [${this.instanceId}] Kernel interrupted successfully`);
            } else {
                console.log(`[Hypha Deno] [${this.instanceId}] No kernel to interrupt`);
            }
        } catch (error) {
            console.error(`[Hypha Deno] [${this.instanceId}] Failed to interrupt kernel:`, error);
            throw error;
        }
    }

    public dispose(): void {
        console.log(`[Hypha Deno] [${this.instanceId}] Disposing controller`);
        
        this._controller.dispose();
        
        // Note: We don't clean up the global kernel cache here since other controller 
        // instances might still be using it. The kernel will be cleaned up when 
        // the extension is deactivated or when restart is called.
        console.log(`[Hypha Deno] [${this.instanceId}] Controller disposed`);
    }
} 