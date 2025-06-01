import * as vscode from 'vscode';

interface LoginConfig {
    server_url: string;
    login_callback: (context: { login_url: string }) => void;
}

interface HyphaUser {
    email: string;
    id: string;
}

export class HyphaAuthProvider {
    private context: vscode.ExtensionContext;
    private token: string | null = null;
    private user: HyphaUser | null = null;
    private client: any = null;
    private server: any = null;
    private readonly serverUrl = "https://hypha.aicell.io";

    constructor(context: vscode.ExtensionContext) {
        console.log('🔐 Initializing HyphaAuthProvider');
        this.context = context;
        this.loadSavedAuth();
    }

    private loadSavedAuth() {
        console.log('📥 Loading saved authentication data');
        // Load token from workspace state
        this.token = this.context.workspaceState.get('hyphaToken') || null;
        this.user = this.context.workspaceState.get('hyphaUser') || null;
        
        console.log('📥 Token loaded:', this.token ? 'Yes' : 'No');
        console.log('📥 User loaded:', this.user?.email || 'None');
        
        if (this.token && this.isTokenValid()) {
            console.log('🔄 Token is valid, attempting auto-connect');
            this.autoConnect();
        } else if (this.token) {
            console.log('⚠️ Token exists but is expired');
        } else {
            console.log('ℹ️ No saved token found');
        }
    }

    private isTokenValid(): boolean {
        const tokenExpiry = this.context.workspaceState.get('hyphaTokenExpiry');
        const isValid = tokenExpiry && new Date(tokenExpiry as string) > new Date();
        console.log('🕒 Token validity check - Expires:', tokenExpiry, 'Valid:', !!isValid);
        return !!isValid;
    }

    private async saveAuth(token: string, user?: HyphaUser) {
        console.log('💾 Saving authentication data for user:', user?.email || 'unknown');
        this.token = token;
        this.user = user || null;
        
        await this.context.workspaceState.update('hyphaToken', token);
        await this.context.workspaceState.update('hyphaUser', user);
        await this.context.workspaceState.update('hyphaTokenExpiry', 
            new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString());
        console.log('💾 Authentication data saved successfully');
    }

    private async clearAuth() {
        console.log('🗑️ Clearing authentication data');
        this.token = null;
        this.user = null;
        this.client = null;
        this.server = null;
        
        await this.context.workspaceState.update('hyphaToken', undefined);
        await this.context.workspaceState.update('hyphaUser', undefined);
        await this.context.workspaceState.update('hyphaTokenExpiry', undefined);
        console.log('🗑️ Authentication data cleared');
    }

    async login(): Promise<boolean> {
        console.log('🔐 Starting login process to:', this.serverUrl);
        try {
            // Import hypha-rpc dynamically
            console.log('📦 Importing hypha-rpc module');
            const { hyphaWebsocketClient } = await import('hypha-rpc');
            console.log('📦 hypha-rpc module imported successfully');
            
            const config: LoginConfig = {
                server_url: this.serverUrl,
                login_callback: (context: { login_url: string }) => {
                    console.log('🌐 Opening login URL:', context.login_url);
                    vscode.env.openExternal(vscode.Uri.parse(context.login_url));
                },
            };

            console.log('🔐 Requesting login token from server');
            const token = await hyphaWebsocketClient.login(config);
            
            if (token) {
                console.log('✅ Login token received, establishing connection');
                await this.connect(token);
                console.log('✅ Login successful');
                vscode.window.showInformationMessage('Successfully logged into Hypha server');
                return true;
            } else {
                console.log('❌ Failed to obtain authentication token');
                vscode.window.showErrorMessage('Failed to obtain authentication token');
                return false;
            }
        } catch (error) {
            console.error('❌ Login failed:', error);
            vscode.window.showErrorMessage(`Login failed: ${error}`);
            return false;
        }
    }

    private async connect(token: string) {
        console.log('🔗 Establishing connection to Hypha server');
        try {
            const { hyphaWebsocketClient } = await import('hypha-rpc');
            
            console.log('🔗 Connecting with token to:', this.serverUrl);
            this.server = await hyphaWebsocketClient.connectToServer({
                server_url: this.serverUrl,
                token: token,
                method_timeout: 180000,
            });

            const user = this.server.config.user;
            console.log('🔗 Connection established for user:', user?.email || 'unknown');
            await this.saveAuth(token, user);
            
            console.log("✅ Connected to Hypha server as:", user);
        } catch (error) {
            console.error('❌ Connection failed:', error);
            throw error;
        }
    }

    private async autoConnect() {
        console.log('🔄 Attempting auto-connect with saved token');
        if (this.token && this.isTokenValid()) {
            try {
                await this.connect(this.token);
                console.log('✅ Auto-connect successful');
            } catch (error) {
                console.error('❌ Auto-connect failed:', error);
                console.log('🗑️ Clearing invalid authentication data');
                await this.clearAuth();
            }
        }
    }

    async logout(): Promise<void> {
        console.log('🔓 Starting logout process');
        try {
            await this.clearAuth();
            console.log('✅ Logout successful');
            vscode.window.showInformationMessage('Logged out from Hypha server');
        } catch (error) {
            console.error('❌ Logout error:', error);
            vscode.window.showErrorMessage(`Logout failed: ${error}`);
        }
    }

    isAuthenticated(): boolean {
        const authenticated = this.token !== null && this.isTokenValid();
        console.log('🔍 Authentication check - Authenticated:', authenticated, 'Has token:', !!this.token, 'Token valid:', this.token ? this.isTokenValid() : false);
        return authenticated;
    }

    getUser(): HyphaUser | null {
        return this.user;
    }

    getToken(): string | null {
        return this.token;
    }

    getServer(): any {
        return this.server;
    }

    async getArtifactManager(): Promise<any> {
        console.log('🎯 Getting artifact manager service');
        if (!this.server) {
            console.log('❌ Not connected to Hypha server - cannot get artifact manager');
            throw new Error('Not connected to Hypha server');
        }
        
        try {
            console.log('🎯 Requesting artifact manager service from server');
            const artifactManager = await this.server.getService("public/artifact-manager");
            console.log('🎯 Artifact manager service obtained successfully');
            return artifactManager;
        } catch (error) {
            console.error('❌ Failed to get artifact manager:', error);
            throw error;
        }
    }
} 