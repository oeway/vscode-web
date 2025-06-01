import * as vscode from 'vscode';
import { HyphaAuthProvider } from './HyphaAuthProvider';
export declare class HyphaFileSystemProvider implements vscode.FileSystemProvider {
    private authProvider;
    private _emitter;
    private _cache;
    private _projects;
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]>;
    constructor(authProvider: HyphaAuthProvider);
    watch(uri: vscode.Uri, options: {
        recursive: boolean;
        excludes: string[];
    }): vscode.Disposable;
    stat(uri: vscode.Uri): Promise<vscode.FileStat>;
    readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]>;
    createDirectory(uri: vscode.Uri): void | Thenable<void>;
    readFile(uri: vscode.Uri): Promise<Uint8Array>;
    writeFile(uri: vscode.Uri, content: Uint8Array, options: {
        create: boolean;
        overwrite: boolean;
    }): Promise<void>;
    delete(uri: vscode.Uri, options: {
        recursive: boolean;
    }): void | Thenable<void>;
    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: {
        overwrite: boolean;
    }): void | Thenable<void>;
    private uriToPath;
    private listProjects;
    private getProject;
    private getProjectFiles;
    private getProjectFile;
    private getFileContent;
    private saveFile;
    private deleteFile;
    private renameFile;
}
//# sourceMappingURL=HyphaFileSystemProvider.d.ts.map