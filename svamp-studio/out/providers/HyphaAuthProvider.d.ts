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
    getServer(): any;
    getArtifactManager(): Promise<any>;
}
export {};
//# sourceMappingURL=HyphaAuthProvider.d.ts.map