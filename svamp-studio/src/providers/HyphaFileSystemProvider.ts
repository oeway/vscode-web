import * as vscode from 'vscode';
import { HyphaAuthProvider } from './HyphaAuthProvider';

interface ProjectFile {
    name: string;
    path: string;
    type: 'file' | 'directory';
    content?: string;
    created_at?: string;
    modified_at?: string;
    size?: number;
}

interface Project {
    id: string;
    manifest: {
        name: string;
        description: string;
        version: string;
        type: string;
        created_at: string;
    };
    files?: ProjectFile[];
}

export class HyphaFileSystemProvider implements vscode.FileSystemProvider {
    private authProvider: HyphaAuthProvider;
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _cache = new Map<string, Uint8Array>();

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor(authProvider: HyphaAuthProvider) {
        this.authProvider = authProvider;
        console.log('🗂️ HyphaFileSystemProvider initialized');
    }

    watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        console.log('👁️ Watching URI:', uri.toString());
        return new vscode.Disposable(() => {
            console.log('👁️ Stopped watching URI:', uri.toString());
        });
    }

    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        console.log('📊 Getting stat for URI:', uri.toString());
        const path = this.uriToPath(uri);
        console.log('📊 Converted to path:', path);
        
        if (path === '/' || path === '') {
            // Root path - represents the agent-lab-projects workspace
            console.log('📊 Workspace root stat (agent-lab-projects)');
            const artifact = await this.getArtifact('agent-lab-projects');
            if (artifact) {
                return {
                    type: vscode.FileType.Directory,
                    ctime: new Date(artifact.manifest.created_at).getTime(),
                    mtime: new Date(artifact.manifest.created_at).getTime(),
                    size: 0
                };
            } else {
                console.error('❌ Workspace root artifact not found');
                throw vscode.FileSystemError.FileNotFound(uri);
            }
        }

        // Parse the path to get artifact and file path
        const { artifactId, filePath } = this.parsePath(path);
        console.log('📊 Parsed path - artifactId:', artifactId, 'filePath:', filePath);
        
        if (!filePath) {
            // This is a child artifact directory (first level under root)
            console.log('📊 Getting child artifact stat for:', artifactId);
            const artifact = await this.getArtifact(artifactId);
            if (artifact) {
                console.log('📊 Child artifact found:', artifact.manifest?.name || artifactId);
                return {
                    type: vscode.FileType.Directory,
                    ctime: new Date(artifact.manifest.created_at).getTime(),
                    mtime: new Date(artifact.manifest.created_at).getTime(),
                    size: 0
                };
            }
        } else {
            // This is a file within a child artifact
            console.log('📊 Getting file stat for:', filePath, 'in child artifact:', artifactId);
            const file = await this.getFileInfo(artifactId, filePath);
            if (file) {
                console.log('📊 File found:', file.name, 'type:', file.type);
                return {
                    type: file.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File,
                    ctime: file.created_at ? new Date(file.created_at).getTime() : Date.now(),
                    mtime: file.modified_at ? new Date(file.modified_at).getTime() : Date.now(),
                    size: file.size || 0
                };
            }
        }

        console.log('❌ File not found for URI:', uri.toString());
        throw vscode.FileSystemError.FileNotFound(uri);
    }

    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const path = this.uriToPath(uri);
        console.log('📁 Reading directory - URI:', uri.toString(), 'Path:', path);
        
        if (path === '/' || path === '') {
            // Root path - list child artifacts of agent-lab-projects directly
            console.log('📁 Reading workspace root - listing child artifacts of agent-lab-projects');
            const artifact = await this.getArtifact('agent-lab-projects');
            if (!artifact) {
                console.log('❌ Root artifact not found');
                throw vscode.FileSystemError.FileNotFound(uri);
            }

            if (artifact.type === 'collection') {
                // List child artifacts directly at root level
                console.log('📁 Root is collection, listing child artifacts at root level');
                const projects = await this.listChildArtifacts('agent-lab-projects');
                const result = projects.map(project => [
                    project.id.split('/').pop() || project.id, 
                    vscode.FileType.Directory
                ] as [string, vscode.FileType]);
                console.log('📁 Found', result.length, 'child artifacts at root');
                return result;
            } else {
                // List files in the artifact directly at root level
                console.log('📁 Root is artifact, listing files at root level');
                const files = await this.listFiles('agent-lab-projects', '');
                const result = files.map(file => [
                    file.name,
                    file.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
                ] as [string, vscode.FileType]);
                console.log('📁 Found', result.length, 'files at root');
                return result;
            }
        }

        // Parse the path to get artifact and directory path
        const { artifactId, filePath } = this.parsePath(path);
        console.log('📁 Parsed path - artifactId:', artifactId, 'filePath:', filePath);
        
        if (!filePath) {
            // This is a child artifact directory (first level under root)
            console.log('📁 Reading child artifact directory:', artifactId);
            const artifact = await this.getArtifact(artifactId);
            if (!artifact) {
                console.log('❌ Artifact not found:', artifactId);
                throw vscode.FileSystemError.FileNotFound(uri);
            }

            if (artifact.type === 'collection') {
                // List child artifacts
                console.log('📁 Child artifact is collection, listing its children');
                const childArtifacts = await this.listChildArtifacts(artifactId);
                const result = childArtifacts.map(child => [
                    child.id.split('/').pop() || child.id,
                    vscode.FileType.Directory
                ] as [string, vscode.FileType]);
                console.log('📁 Found', result.length, 'child artifacts');
                return result;
            } else {
                // List files in the artifact
                console.log('📁 Child artifact has files, listing them');
                const files = await this.listFiles(artifactId, '');
                const result = files.map(file => [
                    file.name,
                    file.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
                ] as [string, vscode.FileType]);
                console.log('📁 Found', result.length, 'files in child artifact');
                return result;
            }
        } else {
            // List files in a subdirectory within a child artifact
            console.log('📁 Reading subdirectory:', filePath, 'in artifact:', artifactId);
            const files = await this.listFiles(artifactId, filePath);
            const result = files.map(file => [
                file.name,
                file.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
            ] as [string, vscode.FileType]);
            console.log('📁 Found', result.length, 'files in subdirectory');
            return result;
        }
    }

    async createDirectory(uri: vscode.Uri): Promise<void> {
        const path = this.uriToPath(uri);
        const { artifactId, filePath } = this.parsePath(path);
        
        if (!filePath) {
            // Creating a new artifact (project folder)
            const parentPath = path.substring(0, path.lastIndexOf('/'));
            const folderName = path.substring(path.lastIndexOf('/') + 1);
            const parentArtifactId = parentPath === '/agent-lab-projects' ? 'agent-lab-projects' : parentPath.substring(1);
            
            await this.createChildArtifact(parentArtifactId, folderName);
        } else {
            // For regular directories within an artifact, they are created implicitly when files are written
            // We don't need to explicitly create directories in the file system
        }
    }

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const path = this.uriToPath(uri);
        console.log('📖 Reading file - URI:', uri.toString(), 'Path:', path);
        
        const cached = this._cache.get(path);
        if (cached) {
            console.log('📖 File found in cache');
            return cached;
        }

        const { artifactId, filePath } = this.parsePath(path);
        console.log('📖 Parsed path - artifactId:', artifactId, 'filePath:', filePath);
        
        if (!filePath) {
            console.log('❌ Cannot read file: no file path specified');
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        try {
            console.log('📖 Getting file content from Hypha server');
            const content = await this.getFileContent(artifactId, filePath);
            const data = new TextEncoder().encode(content);
            this._cache.set(path, data);
            console.log('📖 File content retrieved and cached, size:', data.length, 'bytes');
            return data;
        } catch (error) {
            console.error('❌ Failed to read file:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }

    async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
        const path = this.uriToPath(uri);
        console.log('✏️ Writing file - URI:', uri.toString(), 'Path:', path, 'Size:', content.length, 'bytes');
        
        const { artifactId, filePath } = this.parsePath(path);
        console.log('✏️ Parsed path - artifactId:', artifactId, 'filePath:', filePath);
        
        if (!filePath) {
            console.log('❌ Cannot write file: no file path specified');
            throw vscode.FileSystemError.NoPermissions(uri);
        }

        try {
            console.log('✏️ Saving file to Hypha server');
            await this.saveFile(artifactId, filePath, content);
            this._cache.set(path, content);
            
            console.log('✏️ File saved successfully, firing change event');
            this._emitter.fire([{
                type: vscode.FileChangeType.Changed,
                uri: uri
            }]);
        } catch (error) {
            console.error('❌ Failed to write file:', error);
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }

    async delete(uri: vscode.Uri, options: { recursive: boolean; }): Promise<void> {
        const path = this.uriToPath(uri);
        const { artifactId, filePath } = this.parsePath(path);
        
        if (!filePath) {
            throw vscode.FileSystemError.NoPermissions(uri);
        }

        try {
            await this.deleteFile(artifactId, filePath);
            this._cache.delete(path);
            
            this._emitter.fire([{
                type: vscode.FileChangeType.Deleted,
                uri: uri
            }]);
        } catch (error) {
            console.error('Failed to delete file:', error);
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }

    async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
        const oldPath = this.uriToPath(oldUri);
        const newPath = this.uriToPath(newUri);
        const { artifactId: oldArtifactId, filePath: oldFilePath } = this.parsePath(oldPath);
        const { artifactId: newArtifactId, filePath: newFilePath } = this.parsePath(newPath);
        
        if (!oldFilePath || !newFilePath || oldArtifactId !== newArtifactId) {
            throw vscode.FileSystemError.NoPermissions(oldUri);
        }

        try {
            await this.renameFile(oldArtifactId, oldFilePath, newFilePath);
            
            const content = this._cache.get(oldPath);
            if (content) {
                this._cache.delete(oldPath);
                this._cache.set(newPath, content);
            }
            
            this._emitter.fire([
                { type: vscode.FileChangeType.Deleted, uri: oldUri },
                { type: vscode.FileChangeType.Created, uri: newUri }
            ]);
        } catch (error) {
            console.error('Failed to rename file:', error);
            throw vscode.FileSystemError.Unavailable(oldUri);
        }
    }

    private uriToPath(uri: vscode.Uri): string {
        // For the workspace root, we want to treat it as the agent-lab-projects artifact directly
        let path = uri.path;
        console.log(`==========> uriToPath: ${path}`);
        
        // Don't include the authority in the path since we want the workspace root
        // to map directly to the agent-lab-projects artifact
        
        console.log('🔗 URI to Path conversion - Original URI:', uri.toString(), 'Scheme:', uri.scheme, 'Authority:', uri.authority, 'Path:', uri.path, 'Final path:', path);
        return path;
    }

    private parsePath(path: string): { artifactId: string; filePath?: string } {
        // Remove leading slash and split
        const segments = path.substring(1).split('/').filter(s => s);
        
        if (segments.length === 0) {
            // Root path - this should be treated as the agent-lab-projects artifact root
            return { artifactId: 'agent-lab-projects' };
        }
        
        // At root level, segments[0] represents a child artifact of agent-lab-projects
        // segments[1] and beyond represent files/folders within that child artifact
        const artifactId = segments[0];
        const filePath = segments.slice(1).join('/');
        return { artifactId, filePath: filePath || undefined };
    }

    // Hypha API methods
    private async getArtifact(artifactId: string): Promise<any> {
        console.log('🔍 Getting artifact:', artifactId);
        
        if (!this.authProvider.isAuthenticated()) {
            console.log('❌ Not authenticated, cannot get artifact');
            return null;
        }

        try {
            console.log('🔍 Getting artifact manager');
            const artifactManager = await this.authProvider.getArtifactManager();
            console.log('🔍 Artifact manager obtained, reading artifact');
            const artifact = await artifactManager.read({
                artifact_id: artifactId,
                _rkwargs: true
            });
            console.log('🔍 Artifact read successfully:', artifact?.manifest?.name || artifactId);
            return artifact;
        } catch (error) {
            console.error(`❌ Failed to get artifact ${artifactId}:`, error);
            return null;
        }
    }

    private async listChildArtifacts(parentId: string): Promise<Project[]> {
        console.log('📋 Listing child artifacts for parent:', parentId);
        
        if (!this.authProvider.isAuthenticated()) {
            console.log('❌ Not authenticated, cannot list child artifacts');
            return [];
        }

        try {
            console.log('📋 Getting artifact manager');
            const artifactManager = await this.authProvider.getArtifactManager();
            console.log('📋 Listing artifacts with parent:', parentId);
            const projectsList = await artifactManager.list({
                parent_id: parentId,
                stage: 'all',
                _rkwargs: true
            });
            
            const result = projectsList.map((project: any) => ({
                id: project.id,
                manifest: project.manifest || {
                    name: project.id,
                    description: '',
                    version: '1.0.0',
                    type: 'project',
                    created_at: new Date().toISOString()
                }
            }));
            
            console.log('📋 Found', result.length, 'child artifacts');
            return result;
        } catch (error) {
            console.error('❌ Failed to list child artifacts:', error);
            return [];
        }
    }

    private async listFiles(artifactId: string, dirPath: string): Promise<ProjectFile[]> {
        console.log('📄 Listing files for artifact:', artifactId, 'in directory:', dirPath || '(root)');
        
        if (!this.authProvider.isAuthenticated()) {
            console.log('❌ Not authenticated, cannot list files');
            return [];
        }

        try {
            console.log('📄 Getting artifact manager');
            const artifactManager = await this.authProvider.getArtifactManager();
            console.log('📄 Listing files with artifact_id:', artifactId, 'dir_path:', dirPath || '');
            const files = await artifactManager.list_files({
                artifact_id: artifactId,
                version: "stage",
                dir_path: dirPath || '',
                _rkwargs: true
            });
            
            const result = files.map((file: any) => ({
                name: file.name,
                path: file.path,
                type: file.type,
                size: file.size,
                created_at: file.created_at,
                modified_at: file.modified_at
            }));
            
            console.log('📄 Found', result.length, 'files');
            return result;
        } catch (error) {
            console.error(`❌ Failed to list files for ${artifactId}:`, error);
            return [];
        }
    }

    private async getFileInfo(artifactId: string, filePath: string): Promise<ProjectFile | null> {
        if (!this.authProvider.isAuthenticated()) {
            return null;
        }

        try {
            // Get the directory containing this file
            const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
            const fileName = filePath.includes('/') ? filePath.substring(filePath.lastIndexOf('/') + 1) : filePath;
            
            const files = await this.listFiles(artifactId, dirPath);
            return files.find(file => file.name === fileName) || null;
        } catch (error) {
            console.error(`Failed to get file info ${filePath} in artifact ${artifactId}:`, error);
            return null;
        }
    }

    private async getFileContent(artifactId: string, filePath: string): Promise<string> {
        console.log('📥 Getting file content for:', filePath, 'in artifact:', artifactId);
        
        if (!this.authProvider.isAuthenticated()) {
            console.log('❌ Not authenticated, cannot get file content');
            throw new Error('Not authenticated');
        }
        
        try {
            console.log('📥 Getting artifact manager');
            const artifactManager = await this.authProvider.getArtifactManager();
            console.log('📥 Getting file URL from artifact manager');
            const url = await artifactManager.get_file({
                artifact_id: artifactId,
                file_path: filePath,
                version: 'stage',
                _rkwargs: true
            });
            
            console.log('📥 Fetching file content from URL');
            const response = await fetch(url);
            if (!response.ok) {
                console.log('❌ HTTP error:', response.status, response.statusText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            console.log('📥 File content retrieved, size:', content.length, 'characters');
            return content;
        } catch (error) {
            console.error(`❌ Failed to get file content for ${filePath}:`, error);
            throw error;
        }
    }

    private async saveFile(artifactId: string, filePath: string, content: Uint8Array): Promise<void> {
        try {
            const artifactManager = await this.authProvider.getArtifactManager();
            // await artifactManager.edit({
            //     artifact_id: artifactId,
            //     version: "latest",
            //     stage: true,
            //     _rkwargs: true
            // })
            const presignedUrl = await artifactManager.put_file({
                artifact_id: artifactId,
                file_path: filePath,
                _rkwargs: true
            });
            
            const response = await fetch(presignedUrl, {
                method: 'PUT',
                body: content,
                headers: {
                    'Content-Type': '' // important for s3
                }
            });

            // await artifactManager.commit({
            //     artifact_id: artifactId,
            //     _rkwargs: true
            // })
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
            
            console.log(`File saved: ${filePath}`);
        } catch (error) {
            console.error(`Failed to save file ${filePath}:`, error);
            throw error;
        }
    }

    private async deleteFile(artifactId: string, filePath: string): Promise<void> {
        try {
            const artifactManager = await this.authProvider.getArtifactManager();
            await artifactManager.remove_file({
                artifact_id: artifactId,
                file_path: filePath,
                _rkwargs: true
            });
            console.log(`File deleted: ${filePath}`);
        } catch (error) {
            console.error(`Failed to delete file ${filePath}:`, error);
            throw error;
        }
    }

    private async renameFile(artifactId: string, oldPath: string, newPath: string): Promise<void> {
        try {
            const artifactManager = await this.authProvider.getArtifactManager();
            
            // 1. Get file content from old path
            const url = await artifactManager.get_file({
                artifact_id: artifactId,
                file_path: oldPath,
                version: 'stage',
                _rkwargs: true
            });
            
            // 2. Fetch the content
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch file content for rename: ${response.statusText}`);
            }
            
            // 3. Get the content blob
            const contentBlob = await response.blob();
            
            // 4. Get presigned URL for new path
            const presignedUrl = await artifactManager.put_file({
                artifact_id: artifactId,
                file_path: newPath,
                _rkwargs: true
            });
            
            // 5. Upload content to new path
            const uploadResponse = await fetch(presignedUrl, {
                method: 'PUT',
                body: contentBlob,
                headers: {
                    'Content-Type': '' // important for s3
                }
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`Upload of renamed file failed with status: ${uploadResponse.status}`);
            }
            
            // 6. Delete the old file
            await artifactManager.remove_file({
                artifact_id: artifactId,
                file_path: oldPath,
                _rkwargs: true
            });
            
            // 7. Add a small delay before returning to ensure server-side propagation
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log(`File renamed from ${oldPath} to ${newPath}`);
        } catch (error) {
            console.error(`Failed to rename file from ${oldPath} to ${newPath}:`, error);
            throw error;
        }
    }

    private async createChildArtifact(parentId: string, folderName: string): Promise<void> {
        try {
            const artifactManager = await this.authProvider.getArtifactManager();
            await artifactManager.create({
                parent_id: parentId,
                alias: folderName,
                type: "project",
                manifest: {
                    name: folderName,
                    description: `Project folder: ${folderName}`,
                    version: "0.1.0",
                    type: "project"
                },
                _rkwargs: true
            });
            console.log(`Created child artifact: ${folderName}`);
        } catch (error) {
            console.error(`Failed to create child artifact ${folderName}:`, error);
            throw error;
        }
    }
} 