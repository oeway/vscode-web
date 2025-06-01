import * as vscode from 'vscode';
interface HyphaUser {
    email: string;
    id: string;
}
export declare class HyphaAuthProvider {
    private context;
    private token;
    private user;
    private client;
    private server;
    private readonly serverUrl;
    private isConnecting;
    private connectionPromise;
    private _onAuthStateChanged;
    readonly onAuthStateChanged: vscode.Event<{
        isAuthenticated: boolean;
        user: HyphaUser | null;
    }>;
    constructor(context: vscode.ExtensionContext);
    private loadSavedAuth;
    private isTokenValid;
    private saveAuth;
    private clearAuth;
    login(): Promise<boolean>;
    private connect;
    private autoConnect;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getUser(): HyphaUser | null;
    getToken(): string | null;
    getServer(): Promise<any>;
    private connectWithExistingToken;
    ensureConnection(): Promise<any>;
    getArtifactManager(): Promise<any>;
    private fireAuthStateChanged;
    dispose(): void;
}
export {};
//# sourceMappingURL=HyphaAuthProvider.d.ts.map