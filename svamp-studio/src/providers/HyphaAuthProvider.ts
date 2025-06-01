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
    private isConnecting = false;
    private connectionPromise: Promise<any> | null = null;
    
    // Event emitters for reactive updates
    private _onAuthStateChanged = new vscode.EventEmitter<{ isAuthenticated: boolean; user: HyphaUser | null }>();
    readonly onAuthStateChanged = this._onAuthStateChanged.event;

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
        
        // Fire auth state changed event
        this.fireAuthStateChanged();
    }

    private async clearAuth() {
        console.log('🗑️ Clearing authentication data');
        this.token = null;
        this.user = null;
        this.client = null;
        this.server = null;
        this.isConnecting = false;
        this.connectionPromise = null;
        
        await this.context.workspaceState.update('hyphaToken', undefined);
        await this.context.workspaceState.update('hyphaUser', undefined);
        await this.context.workspaceState.update('hyphaTokenExpiry', undefined);
        console.log('🗑️ Authentication data cleared');
        
        // Fire auth state changed event
        this.fireAuthStateChanged();
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

    async getServer(): Promise<any> {
        // If we already have a server connection, return it
        if (this.server) {
            console.log('🔗 Server connection already available');
            return this.server;
        }

        // If we're already in the process of connecting, wait for that to complete
        if (this.isConnecting && this.connectionPromise) {
            console.log('🔄 Connection already in progress, waiting...');
            try {
                await this.connectionPromise;
                return this.server;
            } catch (error) {
                console.error('❌ Connection in progress failed:', error);
                throw error;
            }
        }

        // If we have a valid token but no server connection, attempt to connect
        if (this.token && this.isTokenValid()) {
            console.log('🔄 No server connection but valid token available, attempting to connect');
            this.isConnecting = true;
            this.connectionPromise = this.connectWithExistingToken();
            
            try {
                await this.connectionPromise;
                return this.server;
            } catch (error) {
                console.error('❌ Failed to connect with existing token:', error);
                await this.clearAuth();
                throw new Error('Failed to establish server connection with existing token');
            } finally {
                this.isConnecting = false;
                this.connectionPromise = null;
            }
        }

        // No valid token available, need to authenticate
        console.log('❌ No server connection and no valid token - authentication required');
        throw new Error('No server connection available - authentication required. Please login first.');
    }

    private async connectWithExistingToken(): Promise<void> {
        if (!this.token) {
            throw new Error('No token available for connection');
        }
        
        try {
            await this.connect(this.token);
            console.log('✅ Successfully connected with existing token');
        } catch (error) {
            console.error('❌ Failed to connect with existing token:', error);
            throw error;
        }
    }

    async ensureConnection(): Promise<any> {
        try {
            return await this.getServer();
        } catch (error) {
            console.log('🔐 Connection failed, prompting for login');
            vscode.window.showWarningMessage(
                'Hypha server connection required. Please login to continue.',
                'Login'
            ).then(selection => {
                if (selection === 'Login') {
                    vscode.commands.executeCommand('hypha.login');
                }
            });
            throw error;
        }
    }

    async getArtifactManager(): Promise<any> {
        console.log('🎯 Getting artifact manager service');
        const server = await this.getServer();
        
        try {
            console.log('🎯 Requesting artifact manager service from server');
            const artifactManager = await server.getService("public/artifact-manager");
            console.log('🎯 Artifact manager service obtained successfully');
            return artifactManager;
        } catch (error) {
            console.error('❌ Failed to get artifact manager:', error);
            throw error;
        }
    }

    private fireAuthStateChanged() {
        const isAuthenticated = this.isAuthenticated();
        console.log('🔄 Firing auth state changed event - authenticated:', isAuthenticated, 'user:', this.user?.email || 'none');
        this._onAuthStateChanged.fire({ isAuthenticated, user: this.user });
    }

    dispose() {
        console.log('🗑️ Disposing HyphaAuthProvider');
        this._onAuthStateChanged.dispose();
    }
} 