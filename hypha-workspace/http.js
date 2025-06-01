var express = require('express')
var serveStatic = require('serve-static')
var path = require('path')
var fs = require('fs')

var staticBasePath = './';
 
var app = express()
const isDevelopment = process.env.NODE_ENV !== 'production';

// Add request logging for development
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Add CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

// Live reload support for development
if (isDevelopment) {
    let extensionLastModified = getExtensionLastModified();
    
    app.get('/api/extension-status', (req, res) => {
        const currentModified = getExtensionLastModified();
        res.json({
            lastModified: currentModified,
            needsReload: currentModified !== extensionLastModified
        });
    });
    
    app.post('/api/extension-reloaded', (req, res) => {
        extensionLastModified = getExtensionLastModified();
        res.json({ success: true });
    });
}

function getExtensionLastModified() {
    try {
        const extensionPath = path.join(__dirname, 'extension', 'extension.js');
        if (fs.existsSync(extensionPath)) {
            return fs.statSync(extensionPath).mtime.getTime();
        }
    } catch (error) {
        console.warn('Could not get extension modification time:', error.message);
    }
    return 0;
}

// Handle missing manifest.json
app.get('/vscode-web/manifest.json', (req, res) => {
    res.json({
        "name": "Hypha Workspace",
        "short_name": "Hypha Workspace",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#1e1e1e",
        "theme_color": "#007ACC"
    });
});

// Serve vscode-web files at /static/ path to match production deployment
app.use('/static', serveStatic('./node_modules/vscode-web/dist'))

// Serve static files (matches sample exactly)
app.use(serveStatic(staticBasePath))

const PORT = process.env.PORT || 3000;
app.listen(PORT)
console.log(`Listening on port ${PORT}`); 