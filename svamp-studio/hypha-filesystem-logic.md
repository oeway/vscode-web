# Hypha Artifact File System Provider Logic

## Overview

The Hypha File System Provider implements a virtual file system that maps Hypha artifacts and their files to a VS Code workspace. The file system treats every URI segment as a potential artifact ID and dynamically determines the structure based on the artifact type.

## URI Scheme

The file system uses the `hypha://` URI scheme:

```
hypha://agent-lab-projects                    <- Root collection artifact
hypha://agent-lab-projects/project1           <- Child artifact of agent-lab-projects
hypha://agent-lab-projects/project1/src       <- Directory or child artifact of project1
hypha://agent-lab-projects/project1/src/main.js <- File in project1 artifact
```

## Core Principle: Artifact-First Approach

For any URI path segment, the file system provider:

1. **Treats it as an artifact ID first**
2. **Reads the artifact** using `artifactManager.read()`
3. **Checks the artifact type**
4. **Determines content based on type**

## Artifact Types and Behavior

### Collection Artifacts (`artifact.type === 'collection'`)

Collections can contain both child artifacts and files:

```javascript
// 1. Read the artifact
const artifact = await artifactManager.read({
  artifact_id: 'agent-lab-projects',
  _rkwargs: true
});

if (artifact.type === 'collection') {
  // 2. List child artifacts
  const childArtifacts = await artifactManager.list({
    parent_id: 'agent-lab-projects',
    stage: 'all',
    _rkwargs: true
  });
  
  // 3. List files in the collection
  const files = await artifactManager.list_files({
    artifact_id: 'agent-lab-projects',
    dir_path: '', // Root of the collection
    _rkwargs: true
  });
}
```

**Directory Listing Result:**
- Child artifacts appear as folders
- Files/directories appear as files/folders

### Regular Artifacts (`artifact.type !== 'collection'`)

Regular artifacts only contain files:

```javascript
// 1. Read the artifact
const artifact = await artifactManager.read({
  artifact_id: 'project1',
  _rkwargs: true
});

if (artifact.type !== 'collection') {
  // 2. Only list files
  const files = await artifactManager.list_files({
    artifact_id: 'project1',
    dir_path: '', // Root of the artifact
    _rkwargs: true
  });
}
```

## Path Resolution Logic

### URI Parsing

```
hypha://agent-lab-projects/project1/src/main.js
```

**Parsing Strategy:**
1. `authority`: `agent-lab-projects` (root artifact)
2. `path`: `/project1/src/main.js`
3. **Segments**: `['project1', 'src', 'main.js']`

### Hierarchical Resolution

The file system resolves paths hierarchically:

```javascript
// For: hypha://agent-lab-projects/project1/src/main.js

// Level 1: agent-lab-projects (from authority)
const rootArtifact = await artifactManager.read({ artifact_id: 'agent-lab-projects' });

// Level 2: project1 (first path segment)
// Check if project1 is a child artifact of agent-lab-projects
const project1Artifact = await artifactManager.read({ artifact_id: 'project1' });

if (project1Artifact) {
  // project1 is an artifact
  // Level 3: src/main.js (remaining path in project1 artifact)
  const files = await artifactManager.list_files({
    artifact_id: 'project1',
    dir_path: 'src',
    _rkwargs: true
  });
  // Look for main.js in the src directory
} else {
  // project1 is not an artifact, it's a directory in agent-lab-projects
  const files = await artifactManager.list_files({
    artifact_id: 'agent-lab-projects',
    dir_path: 'project1/src',
    _rkwargs: true
  });
}
```

## File Operations

### Reading Files

```javascript
// Always use the artifact ID and file path
const url = await artifactManager.get_file({
  artifact_id: 'project1',
  file_path: 'src/main.js',
  version: 'stage',
  _rkwargs: true
});

const response = await fetch(url);
const content = await response.text();
```

### Writing Files

```javascript
// Get presigned URL for upload
const presignedUrl = await artifactManager.put_file({
  artifact_id: 'project1',
  file_path: 'src/main.js',
  _rkwargs: true
});

// Upload content
const uploadResponse = await fetch(presignedUrl, {
  method: 'PUT',
  body: content,
  headers: {
    'Content-Type': '' // Important for S3
  }
});
```

### Deleting Files

```javascript
await artifactManager.remove_file({
  artifact_id: 'project1',
  file_path: 'src/main.js',
  _rkwargs: true
});
```

### Renaming Files

```javascript
// 1. Get original content
const url = await artifactManager.get_file({
  artifact_id: 'project1',
  file_path: 'old/path.js',
  version: 'stage',
  _rkwargs: true
});

const response = await fetch(url);
const contentBlob = await response.blob();

// 2. Upload to new location
const presignedUrl = await artifactManager.put_file({
  artifact_id: 'project1',
  file_path: 'new/path.js',
  _rkwargs: true
});

await fetch(presignedUrl, {
  method: 'PUT',
  body: contentBlob,
  headers: { 'Content-Type': '' }
});

// 3. Delete old file
await artifactManager.remove_file({
  artifact_id: 'project1',
  file_path: 'old/path.js',
  _rkwargs: true
});
```

## Directory Operations

### Creating Directories

**In Collections (Child Artifacts):**
```javascript
// Creates a new child artifact
const collection = await artifactManager.create({
  parent_id: 'agent-lab-projects',
  alias: 'new-project',
  type: "project",
  manifest: {
    name: "New Project",
    description: "A new project folder",
    version: "0.1.0",
    type: "project"
  },
  _rkwargs: true
});
```

**In Regular Artifacts (File Directories):**
```javascript
// Directories are created implicitly when files are written
// No explicit API call needed
```

## Error Handling

### Authentication
```javascript
if (!this.authProvider.isAuthenticated()) {
  throw vscode.FileSystemError.Unavailable('Not connected to Hypha server');
}
```

### File Not Found
```javascript
if (!artifact) {
  throw vscode.FileSystemError.FileNotFound(uri);
}
```

### Permission Errors
```javascript
if (!filePath) {
  throw vscode.FileSystemError.NoPermissions(uri);
}
```

## Implementation Flow

### `stat(uri)` - File/Directory Information
1. Parse URI to get artifact ID and file path
2. Read artifact to determine type
3. If no file path: return directory stat for artifact
4. If file path: get file info and return file/directory stat

### `readDirectory(uri)` - Directory Listing
1. Parse URI to get artifact ID and directory path
2. Read artifact to determine type
3. If collection: list child artifacts + list files
4. If regular artifact: list files only
5. Combine and return results

### `readFile(uri)` - File Content
1. Parse URI to get artifact ID and file path
2. Get presigned URL from artifact manager
3. Fetch content from URL
4. Return as Uint8Array

### `writeFile(uri, content)` - Save File
1. Parse URI to get artifact ID and file path
2. Get presigned upload URL
3. Upload content to URL
4. Fire change event

## Nested Artifacts

For nested structures like `parent/child1/child2`:

- `child2` has a unique artifact ID
- No need for hierarchical artifact resolution
- Directly use `child2` as the artifact ID
- The file system provider automatically resolves the correct artifact

## Configuration

### Product Configuration
```json
{
  "folderUri": {
    "scheme": "hypha",
    "path": "/agent-lab-projects"
  }
}
```

### File System Registration
```javascript
vscode.workspace.registerFileSystemProvider('hypha', fileSystemProvider, {
  isCaseSensitive: true,
  isReadonly: false
});
```

## Key Benefits

1. **Flexible Structure**: Supports both hierarchical artifacts and flat file structures
2. **Lazy Loading**: Only loads artifact information when needed
3. **Caching**: Caches file content and artifact information
4. **Error Resilience**: Graceful handling of authentication and network errors
5. **VS Code Integration**: Full integration with VS Code's file explorer and editor 