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

// Custom middleware to inject live reload script in development
app.get('/', (req, res) => {
    const indexPath = path.join(staticBasePath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        let indexContent = fs.readFileSync(indexPath, 'utf8');
        
        // Inject live reload script in development mode
        if (process.env.NODE_ENV === 'development') {
            const liveReloadScript = `
	<!-- Live reload for development -->
	<script>
		// Live reload script for development
		if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
			let lastModified = 0;
			
			function checkForUpdates() {
				fetch('/api/extension-status')
					.then(response => response.json())
					.then(status => {
						if (status.needsReload && status.lastModified > lastModified) {
							console.log('📦 Extension updated, reloading...');
							
							// Notify server that we're reloading
							fetch('/api/extension-reloaded', { method: 'POST' }).catch(() => {});
							
							// Reload the page
							window.location.reload();
						}
					})
					.catch(error => {
						console.warn('Live reload check failed:', error);
					});
			}
			
			// Check for updates every 2 seconds
			setInterval(checkForUpdates, 2000);
			console.log('🔥 Live reload enabled');
		}
	</script>
</html>`;
            
            // Replace closing </html> tag with live reload script + closing tag
            indexContent = indexContent.replace('</html>', liveReloadScript);
        }
        
        res.setHeader('Content-Type', 'text/html');
        res.send(indexContent);
    } else {
        res.status(404).send('index.html not found');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT)
console.log(`Listening on port ${PORT}`); 