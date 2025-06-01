"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyphaAuthProvider = void 0;
const vscode = __importStar(require("vscode"));
class HyphaAuthProvider {
    constructor(context) {
        this.token = null;
        this.user = null;
        this.client = null;
        this.server = null;
        this.serverUrl = "https://hypha.aicell.io";
        this.isConnecting = false;
        this.connectionPromise = null;
        // Event emitters for reactive updates
        this._onAuthStateChanged = new vscode.EventEmitter();
        this.onAuthStateChanged = this._onAuthStateChanged.event;
        console.log('🔐 Initializing HyphaAuthProvider');
        this.context = context;
        this.loadSavedAuth();
    }
    loadSavedAuth() {
        console.log('📥 Loading saved authentication data');
        // Load token from workspace state
        this.token = this.context.workspaceState.get('hyphaToken') || null;
        this.user = this.context.workspaceState.get('hyphaUser') || null;
        console.log('📥 Token loaded:', this.token ? 'Yes' : 'No');
        console.log('📥 User loaded:', this.user?.email || 'None');
        if (this.token && this.isTokenValid()) {
            console.log('🔄 Token is valid, attempting auto-connect');
            this.autoConnect();
        }
        else if (this.token) {
            console.log('⚠️ Token exists but is expired');
        }
        else {
            console.log('ℹ️ No saved token found');
        }
    }
    isTokenValid() {
        const tokenExpiry = this.context.workspaceState.get('hyphaTokenExpiry');
        const isValid = tokenExpiry && new Date(tokenExpiry) > new Date();
        console.log('🕒 Token validity check - Expires:', tokenExpiry, 'Valid:', !!isValid);
        return !!isValid;
    }
    async saveAuth(token, user) {
        console.log('💾 Saving authentication data for user:', user?.email || 'unknown');
        this.token = token;
        this.user = user || null;
        await this.context.workspaceState.update('hyphaToken', token);
        await this.context.workspaceState.update('hyphaUser', user);
        await this.context.workspaceState.update('hyphaTokenExpiry', new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString());
        console.log('💾 Authentication data saved successfully');
        // Fire auth state changed event
        this.fireAuthStateChanged();
    }
    async clearAuth() {
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
    async login() {
        console.log('🔐 Starting login process to:', this.serverUrl);
        try {
            // Import hypha-rpc dynamically
            console.log('📦 Importing hypha-rpc module');
            const { hyphaWebsocketClient } = await Promise.resolve().then(() => __importStar(require('hypha-rpc')));
            console.log('📦 hypha-rpc module imported successfully');
            const config = {
                server_url: this.serverUrl,
                login_callback: (context) => {
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
            }
            else {
                console.log('❌ Failed to obtain authentication token');
                vscode.window.showErrorMessage('Failed to obtain authentication token');
                return false;
            }
        }
        catch (error) {
            console.error('❌ Login failed:', error);
            vscode.window.showErrorMessage(`Login failed: ${error}`);
            return false;
        }
    }
    async connect(token) {
        console.log('🔗 Establishing connection to Hypha server');
        try {
            const { hyphaWebsocketClient } = await Promise.resolve().then(() => __importStar(require('hypha-rpc')));
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
        }
        catch (error) {
            console.error('❌ Connection failed:', error);
            throw error;
        }
    }
    async autoConnect() {
        console.log('🔄 Attempting auto-connect with saved token');
        if (this.token && this.isTokenValid()) {
            try {
                await this.connect(this.token);
                console.log('✅ Auto-connect successful');
            }
            catch (error) {
                console.error('❌ Auto-connect failed:', error);
                console.log('🗑️ Clearing invalid authentication data');
                await this.clearAuth();
            }
        }
    }
    async logout() {
        console.log('🔓 Starting logout process');
        try {
            await this.clearAuth();
            console.log('✅ Logout successful');
            vscode.window.showInformationMessage('Logged out from Hypha server');
        }
        catch (error) {
            console.error('❌ Logout error:', error);
            vscode.window.showErrorMessage(`Logout failed: ${error}`);
        }
    }
    isAuthenticated() {
        const authenticated = this.token !== null && this.isTokenValid();
        console.log('🔍 Authentication check - Authenticated:', authenticated, 'Has token:', !!this.token, 'Token valid:', this.token ? this.isTokenValid() : false);
        return authenticated;
    }
    getUser() {
        return this.user;
    }
    getToken() {
        return this.token;
    }
    async getServer() {
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
            }
            catch (error) {
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
            }
            catch (error) {
                console.error('❌ Failed to connect with existing token:', error);
                await this.clearAuth();
                throw new Error('Failed to establish server connection with existing token');
            }
            finally {
                this.isConnecting = false;
                this.connectionPromise = null;
            }
        }
        // No valid token available, need to authenticate
        console.log('❌ No server connection and no valid token - authentication required');
        throw new Error('No server connection available - authentication required. Please login first.');
    }
    async connectWithExistingToken() {
        if (!this.token) {
            throw new Error('No token available for connection');
        }
        try {
            await this.connect(this.token);
            console.log('✅ Successfully connected with existing token');
        }
        catch (error) {
            console.error('❌ Failed to connect with existing token:', error);
            throw error;
        }
    }
    async ensureConnection() {
        try {
            return await this.getServer();
        }
        catch (error) {
            console.log('🔐 Connection failed, prompting for login');
            vscode.window.showWarningMessage('Hypha server connection required. Please login to continue.', 'Login').then(selection => {
                if (selection === 'Login') {
                    vscode.commands.executeCommand('hypha.login');
                }
            });
            throw error;
        }
    }
    async getArtifactManager() {
        console.log('🎯 Getting artifact manager service');
        const server = await this.getServer();
        try {
            console.log('🎯 Requesting artifact manager service from server');
            const artifactManager = await server.getService("public/artifact-manager");
            console.log('🎯 Artifact manager service obtained successfully');
            return artifactManager;
        }
        catch (error) {
            console.error('❌ Failed to get artifact manager:', error);
            throw error;
        }
    }
    fireAuthStateChanged() {
        const isAuthenticated = this.isAuthenticated();
        console.log('🔄 Firing auth state changed event - authenticated:', isAuthenticated, 'user:', this.user?.email || 'none');
        this._onAuthStateChanged.fire({ isAuthenticated, user: this.user });
    }
    dispose() {
        console.log('🗑️ Disposing HyphaAuthProvider');
        this._onAuthStateChanged.dispose();
    }
}
exports.HyphaAuthProvider = HyphaAuthProvider;
//# sourceMappingURL=HyphaAuthProvider.js.map