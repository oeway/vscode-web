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
exports.HyphaFileSystemProvider = void 0;
const vscode = __importStar(require("vscode"));
class HyphaFileSystemProvider {
    constructor(authProvider) {
        this._emitter = new vscode.EventEmitter();
        this._cache = new Map();
        this.artifactManager = null;
        this.isInitializing = false;
        this.initializationPromise = null;
        this.lastInitAttempt = 0;
        this.initCooldown = 5000; // 5 seconds cooldown between init attempts
        this.artifactCache = new Map();
        this.cacheTimeout = 300000; // 5 minutes cache for artifacts
        // New caches for optimization
        this.pathResolutionCache = new Map();
        this.fileListingCache = new Map();
        this.childArtifactsCache = new Map();
        this.shortCacheTimeout = 30000; // 30 seconds for path/file listings
        // Request deduplication
        this.pendingRequests = new Map();
        this.onDidChangeFile = this._emitter.event;
        this.authProvider = authProvider;
        console.log('🗂️ HyphaFileSystemProvider initialized, starting artifact manager initialization');
        this.initializeArtifactManager();
    }
    generateCacheKey(...parts) {
        return parts.join('::');
    }
    isValidCacheEntry(timestamp, timeout = this.shortCacheTimeout) {
        return (Date.now() - timestamp) < timeout;
    }
    async deduplicateRequest(key, requestFn) {
        // If there's already a pending request for this key, return it
        if (this.pendingRequests.has(key)) {
            console.log('🔄 Deduplicating request for:', key);
            return this.pendingRequests.get(key);
        }
        // Create new request and cache the promise
        const promise = requestFn().finally(() => {
            // Clean up when request completes
            this.pendingRequests.delete(key);
        });
        this.pendingRequests.set(key, promise);
        return promise;
    }
    async resolveArtifactPathCached(path) {
        const cached = this.pathResolutionCache.get(path);
        if (cached && this.isValidCacheEntry(cached.timestamp)) {
            console.log('🎯 Using cached path resolution for:', path);
            return { artifactId: cached.artifactId, filePath: cached.filePath };
        }
        const requestKey = `resolveArtifactPath:${path}`;
        return this.deduplicateRequest(requestKey, async () => {
            console.log('🔍 Resolving artifact path:', path);
            const result = await this.resolveArtifactPath(path);
            // Cache the result
            this.pathResolutionCache.set(path, {
                artifactId: result.artifactId,
                filePath: result.filePath,
                timestamp: Date.now()
            });
            return result;
        });
    }
    async listChildArtifactsCached(parentId) {
        const cached = this.childArtifactsCache.get(parentId);
        if (cached && this.isValidCacheEntry(cached.timestamp)) {
            console.log('🎯 Using cached child artifacts for:', parentId);
            return cached.children;
        }
        const requestKey = `listChildArtifacts:${parentId}`;
        return this.deduplicateRequest(requestKey, async () => {
            console.log('📋 Listing child artifacts for parent:', parentId);
            try {
                const artifactManager = await this.ensureArtifactManager();
                console.log('📋 Listing artifacts with parent:', parentId);
                const projectsList = await artifactManager.list({
                    parent_id: parentId,
                    stage: 'all',
                    _rkwargs: true
                });
                const result = projectsList.map((project) => {
                    console.log('📋 Processing child artifact:', {
                        originalId: project.id,
                        parentId: parentId,
                        projectType: project.type,
                        projectManifest: project.manifest
                    });
                    // Use the ID as returned by the server - don't modify it
                    const artifactId = project.id;
                    console.log('📋 Child artifact processed:', project.id, '-> final ID:', artifactId);
                    return {
                        id: artifactId,
                        manifest: project.manifest || {
                            name: project.id,
                            description: '',
                            version: '1.0.0',
                            type: 'project',
                            created_at: new Date().toISOString()
                        }
                    };
                });
                // Cache the result
                this.childArtifactsCache.set(parentId, {
                    children: result,
                    timestamp: Date.now()
                });
                console.log('📋 Found', result.length, 'child artifacts');
                return result;
            }
            catch (error) {
                console.error('❌ Failed to list child artifacts:', error);
                return [];
            }
        });
    }
    async listFilesCached(artifactId, dirPath) {
        const cacheKey = this.generateCacheKey(artifactId, dirPath);
        const cached = this.fileListingCache.get(cacheKey);
        if (cached && this.isValidCacheEntry(cached.timestamp)) {
            console.log('🎯 Using cached file listing for:', artifactId, 'dir:', dirPath || '(root)');
            return cached.files;
        }
        const requestKey = `listFiles:${cacheKey}`;
        return this.deduplicateRequest(requestKey, async () => {
            console.log('📄 Listing files for artifact:', artifactId, 'in directory:', dirPath || '(root)');
            try {
                const artifactManager = await this.ensureArtifactManager();
                console.log('📄 Listing files with artifact_id:', artifactId, 'dir_path:', dirPath || '');
                const files = await artifactManager.list_files({
                    artifact_id: artifactId,
                    version: "stage",
                    dir_path: dirPath || '',
                    _rkwargs: true
                });
                const result = files.map((file) => ({
                    name: file.name,
                    path: file.path,
                    type: file.type,
                    size: file.size,
                    created_at: file.created_at,
                    modified_at: file.modified_at
                }));
                // Cache the result
                this.fileListingCache.set(cacheKey, {
                    files: result,
                    timestamp: Date.now()
                });
                console.log('📄 Found', result.length, 'files');
                return result;
            }
            catch (error) {
                console.error(`❌ Failed to list files for ${artifactId}:`, error);
                return [];
            }
        });
    }
    invalidateCache(artifactId) {
        if (artifactId) {
            console.log('🗑️ Invalidating caches for artifact:', artifactId);
            // Invalidate artifact cache
            this.artifactCache.delete(artifactId);
            // Invalidate child artifacts cache for this artifact as parent
            this.childArtifactsCache.delete(artifactId);
            // Invalidate file listing cache for this artifact
            for (const [key, _] of this.fileListingCache.entries()) {
                if (key.startsWith(`${artifactId}::`)) {
                    this.fileListingCache.delete(key);
                }
            }
            // Invalidate path resolution cache that might reference this artifact
            for (const [path, cached] of this.pathResolutionCache.entries()) {
                if (cached.artifactId === artifactId) {
                    this.pathResolutionCache.delete(path);
                }
            }
        }
        else {
            console.log('🗑️ Clearing all caches');
            this.artifactCache.clear();
            this.pathResolutionCache.clear();
            this.fileListingCache.clear();
            this.childArtifactsCache.clear();
        }
    }
    clearExpiredCaches() {
        const now = Date.now();
        // Clear expired artifact cache
        const expiredArtifacts = [];
        for (const [key, cached] of this.artifactCache.entries()) {
            if (now - cached.timestamp >= this.cacheTimeout) {
                expiredArtifacts.push(key);
            }
        }
        // Clear expired path resolution cache
        const expiredPaths = [];
        for (const [key, cached] of this.pathResolutionCache.entries()) {
            if (now - cached.timestamp >= this.shortCacheTimeout) {
                expiredPaths.push(key);
            }
        }
        // Clear expired file listing cache
        const expiredFileListings = [];
        for (const [key, cached] of this.fileListingCache.entries()) {
            if (now - cached.timestamp >= this.shortCacheTimeout) {
                expiredFileListings.push(key);
            }
        }
        // Clear expired child artifacts cache
        const expiredChildArtifacts = [];
        for (const [key, cached] of this.childArtifactsCache.entries()) {
            if (now - cached.timestamp >= this.shortCacheTimeout) {
                expiredChildArtifacts.push(key);
            }
        }
        const totalExpired = expiredArtifacts.length + expiredPaths.length + expiredFileListings.length + expiredChildArtifacts.length;
        if (totalExpired > 0) {
            console.log('🗑️ Clearing', totalExpired, 'expired cache entries');
            expiredArtifacts.forEach(key => this.artifactCache.delete(key));
            expiredPaths.forEach(key => this.pathResolutionCache.delete(key));
            expiredFileListings.forEach(key => this.fileListingCache.delete(key));
            expiredChildArtifacts.forEach(key => this.childArtifactsCache.delete(key));
        }
    }
    async getArtifactCached(artifactId) {
        const now = Date.now();
        const cached = this.artifactCache.get(artifactId);
        if (cached && (now - cached.timestamp) < this.cacheTimeout) {
            console.log('🎯 Using cached artifact for', artifactId, ':', cached.artifact?.manifest?.name || 'null');
            return cached.artifact;
        }
        const requestKey = `getArtifact:${artifactId}`;
        return this.deduplicateRequest(requestKey, async () => {
            try {
                console.log('🔄 Fetching fresh artifact data for', artifactId);
                const artifact = await this.getArtifact(artifactId);
                // Cache the result (including null results)
                this.artifactCache.set(artifactId, { artifact, timestamp: now });
                if (artifact) {
                    console.log('🎯 Cached artifact for', artifactId, ':', artifact.manifest?.name, 'type:', artifact.type);
                }
                else {
                    console.log('🎯 Cached not-found result for', artifactId);
                }
                return artifact;
            }
            catch (error) {
                console.error('❌ Failed to get artifact for', artifactId, ':', error);
                // Cache error results to avoid repeated attempts
                this.artifactCache.set(artifactId, { artifact: null, timestamp: now });
                return null;
            }
        });
    }
    async getArtifactTypeCached(artifactId) {
        const artifact = await this.getArtifactCached(artifactId);
        if (artifact) {
            const type = artifact.type || 'artifact';
            console.log('🎯 Extracted type from cached artifact', artifactId, ':', type);
            return type;
        }
        else {
            console.log('🎯 No artifact found for type extraction:', artifactId);
            return null;
        }
    }
    async resolveArtifactPath(path) {
        console.log('🔍 Resolving artifact path:', path);
        // Remove leading slash and split into segments
        const segments = path.substring(1).split('/').filter(s => s);
        if (segments.length === 0) {
            // Root path - this should be handled by the workspace root logic
            throw new Error('Cannot resolve empty path');
        }
        let currentArtifactId = '';
        // Traverse segments to find the deepest artifact
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (i === 0) {
                // First segment - test as root artifact
                console.log('🔍 Testing root artifact ID:', segment);
                const artifactType = await this.getArtifactTypeCached(segment);
                if (artifactType) {
                    currentArtifactId = segment;
                    console.log('✅ Found root artifact:', currentArtifactId, 'type:', artifactType);
                    if (artifactType !== 'collection') {
                        // Not a collection, remaining segments are file path
                        const remainingSegments = segments.slice(i + 1);
                        const filePath = remainingSegments.length > 0 ? remainingSegments.join('/') : undefined;
                        console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath:', filePath);
                        return { artifactId: currentArtifactId, filePath };
                    }
                    // Continue to check if next segment is a child artifact
                }
                else {
                    console.log('❌ Root artifact not found:', segment);
                    throw new Error(`Root artifact '${segment}' not found`);
                }
            }
            else {
                // For subsequent segments, if current artifact is a collection,
                // check if this segment is a direct child artifact
                if (currentArtifactId) {
                    console.log('🔍 Testing child artifact:', segment, 'of parent:', currentArtifactId);
                    // First check if the current artifact is a collection
                    const parentType = await this.getArtifactTypeCached(currentArtifactId);
                    if (parentType === 'collection') {
                        // Get child artifacts to see if this segment matches
                        const childArtifacts = await this.listChildArtifactsCached(currentArtifactId);
                        const matchingChild = childArtifacts.find(child => {
                            const childName = child.id.includes('/') ?
                                child.id.split('/').pop() :
                                child.id;
                            return childName === segment;
                        });
                        if (matchingChild) {
                            // Found matching child artifact
                            currentArtifactId = matchingChild.id;
                            console.log('✅ Found child artifact:', currentArtifactId);
                            // Check if this child is also a collection or has remaining segments
                            const childType = await this.getArtifactTypeCached(matchingChild.id);
                            if (childType !== 'collection') {
                                // Not a collection, remaining segments are file path
                                const remainingSegments = segments.slice(i + 1);
                                const filePath = remainingSegments.length > 0 ? remainingSegments.join('/') : undefined;
                                console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath:', filePath);
                                return { artifactId: currentArtifactId, filePath };
                            }
                            // Continue to check next segment
                        }
                        else {
                            // Segment is not a child artifact, so it's part of file path
                            const remainingSegments = segments.slice(i);
                            const filePath = remainingSegments.length > 0 ? remainingSegments.join('/') : undefined;
                            console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath:', filePath);
                            return { artifactId: currentArtifactId, filePath };
                        }
                    }
                    else {
                        // Parent is not a collection, remaining segments are file path
                        const remainingSegments = segments.slice(i);
                        const filePath = remainingSegments.length > 0 ? remainingSegments.join('/') : undefined;
                        console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath:', filePath);
                        return { artifactId: currentArtifactId, filePath };
                    }
                }
            }
        }
        // All segments were traversed, currentArtifactId is the final artifact
        console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath: none');
        return { artifactId: currentArtifactId };
    }
    async initializeArtifactManager() {
        const now = Date.now();
        // Add cooldown to prevent rapid successive calls
        if (now - this.lastInitAttempt < this.initCooldown) {
            console.log('🔄 Initialization cooldown active, skipping attempt');
            return this.initializationPromise || Promise.resolve();
        }
        if (this.isInitializing || this.artifactManager) {
            console.log('🔄 Initialization already in progress or completed');
            return this.initializationPromise || Promise.resolve();
        }
        this.lastInitAttempt = now;
        this.isInitializing = true;
        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }
    async performInitialization() {
        try {
            console.log('🔄 Initializing artifact manager...');
            // Just try to get the server connection directly
            // Authentication will be handled by getServer() if needed
            const server = await this.authProvider.getServer();
            if (server) {
                console.log('✅ Server connection established during initialization');
                this.artifactManager = await server.getService("public/artifact-manager");
                console.log('✅ Artifact manager initialized successfully');
            }
            else {
                console.log('❌ No server connection available');
            }
        }
        catch (error) {
            console.log('⚠️ Could not establish server connection:', error.message);
            console.log('⚠️ Authentication required - artifact manager will be unavailable');
        }
        finally {
            this.isInitializing = false;
        }
    }
    async ensureArtifactManager() {
        console.log('🔍 ensureArtifactManager called - current state:', {
            hasArtifactManager: !!this.artifactManager,
            isInitializing: this.isInitializing,
            lastInitAttempt: this.lastInitAttempt,
            timeSinceLastInit: Date.now() - this.lastInitAttempt
        });
        // Clean up expired cache entries periodically
        this.clearExpiredCaches();
        if (!this.artifactManager) {
            console.log('🔄 No artifact manager, attempting initialization...');
            await this.initializeArtifactManager();
        }
        // If still no artifact manager, try to get server connection reactively
        if (!this.artifactManager) {
            console.log('🔄 Still no artifact manager, trying reactive approach...');
            try {
                console.log('🔄 Attempting to get server connection reactively');
                const server = await this.authProvider.getServer();
                this.artifactManager = await server.getService("public/artifact-manager");
                console.log('✅ Artifact manager obtained reactively');
            }
            catch (error) {
                console.error('❌ Failed to get artifact manager reactively:', error.message);
                throw new Error('Artifact manager not available - authentication required. Please login first.');
            }
        }
        return this.artifactManager;
    }
    watch(uri, options) {
        console.log('👁️ Watching URI:', uri.toString());
        return new vscode.Disposable(() => {
            console.log('👁️ Stopped watching URI:', uri.toString());
        });
    }
    async stat(uri) {
        console.log('📊 Getting stat for URI:', uri.toString());
        const path = this.uriToPath(uri);
        console.log('📊 Converted to path:', path);
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            console.log('📊 Resolved - artifactId:', artifactId, 'filePath:', filePath);
            if (!filePath) {
                // This is an artifact directory
                const artifact = await this.getArtifactCached(artifactId);
                if (artifact) {
                    console.log('📊 Artifact found:', artifact.manifest?.name || artifactId, 'type:', artifact.type);
                    return {
                        type: vscode.FileType.Directory,
                        ctime: new Date(artifact.manifest?.created_at || Date.now()).getTime(),
                        mtime: new Date(artifact.manifest?.created_at || Date.now()).getTime(),
                        size: 0
                    };
                }
            }
            else {
                // This is a file within an artifact
                console.log('📊 Getting file stat for:', filePath, 'in artifact:', artifactId);
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
        }
        catch (error) {
            console.error('❌ Error in stat:', error);
        }
        console.log('❌ File not found for URI:', uri.toString());
        throw vscode.FileSystemError.FileNotFound(uri);
    }
    async readDirectory(uri) {
        const path = this.uriToPath(uri);
        console.log('📁 Reading directory - URI:', uri.toString(), 'Path:', path);
        // Prevent infinite loops by checking for excessively long paths
        if (path.length > 1000) {
            console.error('❌ Path too long, possible infinite loop detected:', path.substring(0, 100) + '...');
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            console.log('📁 Resolved - artifactId:', artifactId, 'filePath:', filePath);
            // Get the artifact to determine its type
            const artifact = await this.getArtifactCached(artifactId);
            if (!artifact) {
                console.log('❌ Artifact not found:', artifactId);
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            if (artifact.type === 'collection') {
                // List child artifacts using cached method
                console.log('📁 Artifact is collection, listing child artifacts');
                const childArtifacts = await this.listChildArtifactsCached(artifactId);
                // Better handling of child artifact names
                const result = childArtifacts.map(child => {
                    // Extract just the last segment of the child ID
                    const childName = child.id.includes('/') ?
                        child.id.split('/').pop() || child.id :
                        child.id;
                    console.log('📁 Child artifact:', child.id, '-> display name:', childName);
                    return [childName, vscode.FileType.Directory];
                });
                console.log('📁 Found', result.length, 'child artifacts');
                return result;
            }
            else {
                // List files in the artifact using cached method
                console.log('📁 Artifact has files, listing files in path:', filePath || '(root)');
                const files = await this.listFilesCached(artifactId, filePath || '');
                const result = files.map(file => [
                    file.name,
                    file.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
                ]);
                console.log('📁 Found', result.length, 'files');
                return result;
            }
        }
        catch (error) {
            console.error('❌ Error in readDirectory:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async createDirectory(uri) {
        const path = this.uriToPath(uri);
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            if (!filePath) {
                // Creating a new artifact (project folder)
                const pathSegments = path.split('/').filter(s => s);
                const folderName = pathSegments[pathSegments.length - 1];
                const parentPath = pathSegments.slice(0, -1).join('/');
                const parentArtifactId = parentPath || 'root';
                await this.createChildArtifact(parentArtifactId, folderName);
            }
            else {
                // For regular directories within an artifact, they are created implicitly when files are written
                // We don't need to explicitly create directories in the file system
            }
        }
        catch (error) {
            console.error('❌ Failed to create directory:', error);
            throw vscode.FileSystemError.NoPermissions(uri);
        }
    }
    async readFile(uri) {
        const path = this.uriToPath(uri);
        console.log('📖 Reading file - URI:', uri.toString(), 'Path:', path);
        const cached = this._cache.get(path);
        if (cached) {
            console.log('📖 File found in cache');
            return cached;
        }
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            console.log('📖 Resolved - artifactId:', artifactId, 'filePath:', filePath);
            if (!filePath) {
                console.log('❌ Cannot read file: no file path specified');
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            console.log('📖 Getting file content from Hypha server');
            const content = await this.getFileContent(artifactId, filePath);
            const data = new TextEncoder().encode(content);
            this._cache.set(path, data);
            console.log('📖 File content retrieved and cached, size:', data.length, 'bytes');
            return data;
        }
        catch (error) {
            // console.error('❌ Failed to read file:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async writeFile(uri, content, options) {
        const path = this.uriToPath(uri);
        console.log('✏️ Writing file - URI:', uri.toString(), 'Path:', path, 'Size:', content.length, 'bytes');
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            console.log('✏️ Resolved - artifactId:', artifactId, 'filePath:', filePath);
            if (!filePath) {
                console.log('❌ Cannot write file: no file path specified');
                throw vscode.FileSystemError.NoPermissions(uri);
            }
            console.log('✏️ Saving file to Hypha server');
            await this.saveFile(artifactId, filePath, content);
            this._cache.set(path, content);
            // Invalidate all caches for this artifact since the artifact content changed
            this.invalidateCache(artifactId);
            console.log('✏️ File saved successfully, firing change event');
            this._emitter.fire([{
                    type: vscode.FileChangeType.Changed,
                    uri: uri
                }]);
        }
        catch (error) {
            console.error('❌ Failed to write file:', error);
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }
    async delete(uri, options) {
        const path = this.uriToPath(uri);
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            if (!filePath) {
                // Deleting an artifact itself
                this.invalidateCache(artifactId);
                throw vscode.FileSystemError.NoPermissions(uri);
            }
            await this.deleteFile(artifactId, filePath);
            this._cache.delete(path);
            // Invalidate all caches for this artifact since the artifact content changed
            this.invalidateCache(artifactId);
            this._emitter.fire([{
                    type: vscode.FileChangeType.Deleted,
                    uri: uri
                }]);
        }
        catch (error) {
            console.error('Failed to delete file:', error);
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }
    async rename(oldUri, newUri, options) {
        const oldPath = this.uriToPath(oldUri);
        const newPath = this.uriToPath(newUri);
        try {
            const { artifactId: oldArtifactId, filePath: oldFilePath } = await this.resolveArtifactPathCached(oldPath);
            const { artifactId: newArtifactId, filePath: newFilePath } = await this.resolveArtifactPathCached(newPath);
            if (!oldFilePath || !newFilePath || oldArtifactId !== newArtifactId) {
                throw vscode.FileSystemError.NoPermissions(oldUri);
            }
            await this.renameFile(oldArtifactId, oldFilePath, newFilePath);
            const content = this._cache.get(oldPath);
            if (content) {
                this._cache.delete(oldPath);
                this._cache.set(newPath, content);
            }
            // Invalidate all caches for this artifact since the artifact content changed
            this.invalidateCache(oldArtifactId);
            this._emitter.fire([
                { type: vscode.FileChangeType.Deleted, uri: oldUri },
                { type: vscode.FileChangeType.Created, uri: newUri }
            ]);
        }
        catch (error) {
            console.error('Failed to rename file:', error);
            throw vscode.FileSystemError.Unavailable(oldUri);
        }
    }
    uriToPath(uri) {
        let path = uri.path;
        console.log('🔗 URI to Path conversion - Original URI:', uri.toString(), 'Scheme:', uri.scheme, 'Authority:', uri.authority, 'Path:', uri.path, 'Final path:', path);
        return path;
    }
    // Hypha API methods
    async getArtifact(artifactId) {
        console.log('🔍 Getting artifact:', artifactId);
        try {
            const artifactManager = await this.ensureArtifactManager();
            console.log('🔍 Artifact manager obtained, reading artifact');
            const artifact = await artifactManager.read({
                artifact_id: artifactId,
                _rkwargs: true
            });
            console.log('🔍 Artifact read successfully:', artifact?.manifest?.name || artifactId);
            return artifact;
        }
        catch (error) {
            console.error(`❌ Failed to get artifact ${artifactId}:`, error);
            return null;
        }
    }
    async listChildArtifacts(parentId) {
        // This method is now replaced by listChildArtifactsCached
        return this.listChildArtifactsCached(parentId);
    }
    async listFiles(artifactId, dirPath) {
        // This method is now replaced by listFilesCached
        return this.listFilesCached(artifactId, dirPath);
    }
    async getFileInfo(artifactId, filePath) {
        try {
            // Get the directory containing this file
            const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
            const fileName = filePath.includes('/') ? filePath.substring(filePath.lastIndexOf('/') + 1) : filePath;
            const files = await this.listFilesCached(artifactId, dirPath);
            return files.find(file => file.name === fileName) || null;
        }
        catch (error) {
            console.error(`Failed to get file info ${filePath} in artifact ${artifactId}:`, error);
            return null;
        }
    }
    async getFileContent(artifactId, filePath) {
        console.log('📥 Getting file content for:', filePath, 'in artifact:', artifactId);
        try {
            const artifactManager = await this.ensureArtifactManager();
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
        }
        catch (error) {
            // console.debug(`❌ Failed to get file content for ${filePath}:`, error);
            throw error;
        }
    }
    async saveFile(artifactId, filePath, content) {
        try {
            const artifactManager = await this.ensureArtifactManager();
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
        }
        catch (error) {
            console.error(`Failed to save file ${filePath}:`, error);
            throw error;
        }
    }
    async deleteFile(artifactId, filePath) {
        try {
            const artifactManager = await this.ensureArtifactManager();
            await artifactManager.remove_file({
                artifact_id: artifactId,
                file_path: filePath,
                _rkwargs: true
            });
            console.log(`File deleted: ${filePath}`);
        }
        catch (error) {
            console.error(`Failed to delete file ${filePath}:`, error);
            throw error;
        }
    }
    async renameFile(artifactId, oldPath, newPath) {
        try {
            const artifactManager = await this.ensureArtifactManager();
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
        }
        catch (error) {
            console.error(`Failed to rename file from ${oldPath} to ${newPath}:`, error);
            throw error;
        }
    }
    async createChildArtifact(parentId, folderName) {
        try {
            const artifactManager = await this.ensureArtifactManager();
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
            // Invalidate cache for parent artifact since it now has a new child
            this.invalidateCache(parentId);
            console.log(`Created child artifact: ${folderName}`);
        }
        catch (error) {
            console.error(`Failed to create child artifact ${folderName}:`, error);
            throw error;
        }
    }
}
exports.HyphaFileSystemProvider = HyphaFileSystemProvider;
//# sourceMappingURL=HyphaFileSystemProvider.js.map