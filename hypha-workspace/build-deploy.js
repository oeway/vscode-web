const fs = require('fs');
const path = require('path');

// Helper function to copy files/directories
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Warning: Source ${src} does not exist, skipping...`);
    return;
  }
  
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${src} -> ${dest}`);
  }
}

// Helper function to copy file if it exists
function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${src} -> ${dest}`);
  } else {
    console.log(`Warning: ${src} does not exist, skipping...`);
  }
}

console.log('🚀 Starting deployment build...');

// Create deployment directory
const deployDir = './deploy';
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true });
}
fs.mkdirSync(deployDir, { recursive: true });

console.log('📁 Created deployment directory');

// Copy main build outputs
if (fs.existsSync('./dist')) {
  copyRecursive('./dist', deployDir);
  console.log('✅ Copied dist files');
}

if (fs.existsSync('./out')) {
  copyRecursive('./out', deployDir);
  console.log('✅ Copied out files');
}

// Copy main files
copyIfExists('./index.html', path.join(deployDir, 'index.html'));
copyIfExists('./product.json', path.join(deployDir, 'product.json'));

// Copy extension directory (critical for VSCode to load the hypha extension)
const extensionDir = './extension';
const deployExtensionDir = path.join(deployDir, 'extension');
if (fs.existsSync(extensionDir)) {
  copyRecursive(extensionDir, deployExtensionDir);
  console.log('✅ Copied extension directory');
  
  // Ensure package.json exists in extension directory
  const extensionPackageJson = path.join(deployExtensionDir, 'package.json');
  if (!fs.existsSync(extensionPackageJson)) {
    // Create a minimal package.json for the extension if it doesn't exist
    const minimalPackage = {
      "name": "hypha-workspace-extension",
      "version": "1.0.0",
      "description": "Hypha Workspace Extension",
      "main": "./extension.js",
      "engines": {
        "vscode": "^1.75.0"
      },
      "contributes": {},
      "activationEvents": ["*"],
      "extensionKind": ["web"]
    };
    fs.writeFileSync(extensionPackageJson, JSON.stringify(minimalPackage, null, 2));
    console.log('✅ Created extension package.json');
  }
} else {
  console.log('⚠️  Warning: extension directory not found');
}

// Copy vscode-web files to static directory (proper approach)
const staticDir = path.join(deployDir, 'static');
fs.mkdirSync(staticDir, { recursive: true });

const vscodeWebDist = './node_modules/vscode-web/dist';
if (fs.existsSync(vscodeWebDist)) {
  copyRecursive(vscodeWebDist, staticDir);
  console.log('✅ Copied vscode-web files to static directory');
} else {
  console.log('⚠️  Warning: vscode-web/dist not found');
}

// Copy vscode-web assets to vscode-web directory
const vscodeWebDir = path.join(deployDir, 'vscode-web');
fs.mkdirSync(vscodeWebDir, { recursive: true });

copyIfExists(path.join(vscodeWebDist, 'favicon.ico'), path.join(vscodeWebDir, 'favicon.ico'));
copyIfExists(path.join(vscodeWebDist, 'manifest.json'), path.join(vscodeWebDir, 'manifest.json'));
copyIfExists(path.join(vscodeWebDist, 'code-192.png'), path.join(vscodeWebDir, 'code-192.png'));
copyIfExists(path.join(vscodeWebDist, 'code-512.png'), path.join(vscodeWebDir, 'code-512.png'));

console.log('✅ Copied vscode-web assets');

// Add .nojekyll file
fs.writeFileSync(path.join(deployDir, '.nojekyll'), '');
console.log('✅ Added .nojekyll file');

// Add CNAME file
fs.writeFileSync(path.join(deployDir, 'CNAME'), 'ws.aicell.io');
console.log('✅ Added CNAME file');

// Create a simple server script for testing the deployment
const testServerScript = `#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 8080;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Default to index.html for root
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Handle API endpoints (mock for production)
  if (pathname.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'API endpoint disabled in production' }));
    return;
  }
  
  const filePath = path.join(__dirname, pathname);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      console.log(\`404: \${pathname}\`);
      return;
    }
    
    const ext = path.extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
    console.log(\`200: \${pathname}\`);
  });
});

server.listen(port, () => {
  console.log(\`🌐 Test server running at http://localhost:\${port}\`);
  console.log('📁 Serving files from deployment directory');
});
`;

fs.writeFileSync(path.join(deployDir, 'test-server.js'), testServerScript);
fs.chmodSync(path.join(deployDir, 'test-server.js'), '755');
console.log('✅ Created test server script');

console.log('🎉 Deployment build completed successfully!');
console.log(`📦 Deployment files are in: ${path.resolve(deployDir)}`);
console.log('🧪 To test locally, run: cd deploy && node test-server.js'); 