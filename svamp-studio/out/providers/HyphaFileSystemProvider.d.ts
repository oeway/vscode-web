import * as vscode from 'vscode';
import { HyphaAuthProvider } from './HyphaAuthProvider';
export declare class HyphaFileSystemProvider implements vscode.FileSystemProvider {
    private authProvider;
    private _emitter;
    private _cache;
    private artifactManager;
    private isInitializing;
    private initializationPromise;
    private lastInitAttempt;
    private initCooldown;
    private artifactCache;
    private cacheTimeout;
    private pathResolutionCache;
    private fileListingCache;
    private childArtifactsCache;
    private shortCacheTimeout;
    private pendingRequests;
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]>;
    constructor(authProvider: HyphaAuthProvider);
    private generateCacheKey;
    private isValidCacheEntry;
    private deduplicateRequest;
    private resolveArtifactPathCached;
    private listChildArtifactsCached;
    private listFilesCached;
    private invalidateCache;
    private clearExpiredCaches;
    private getArtifactCached;
    private getArtifactTypeCached;
    private resolveArtifactPath;
    private initializeArtifactManager;
    private performInitialization;
    private ensureArtifactManager;
    watch(uri: vscode.Uri, options: {
        recursive: boolean;
        excludes: string[];
    }): vscode.Disposable;
    stat(uri: vscode.Uri): Promise<vscode.FileStat>;
    readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]>;
    createDirectory(uri: vscode.Uri): Promise<void>;
    readFile(uri: vscode.Uri): Promise<Uint8Array>;
    writeFile(uri: vscode.Uri, content: Uint8Array, options: {
        create: boolean;
        overwrite: boolean;
    }): Promise<void>;
    delete(uri: vscode.Uri, options: {
        recursive: boolean;
    }): Promise<void>;
    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: {
        overwrite: boolean;
    }): Promise<void>;
    private uriToPath;
    private getArtifact;
    private listChildArtifacts;
    private listFiles;
    private getFileInfo;
    private getFileContent;
    private saveFile;
    private deleteFile;
    private renameFile;
    private createChildArtifact;
}
//# sourceMappingURL=HyphaFileSystemProvider.d.ts.map