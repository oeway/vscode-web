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

// In development, serve extension files locally to avoid HTTPS issues
if (isDevelopment) {
    // Serve modified product.json with HTTP scheme for development
    app.get('/product.json', (req, res) => {
        console.log('📦 Serving development product.json');
        try {
            const productJsonPath = path.join(__dirname, 'product.json');
            let productConfig = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));
            
            // Modify additionalBuiltinExtensions to use HTTP scheme for development
            if (productConfig.additionalBuiltinExtensions) {
                productConfig.additionalBuiltinExtensions = productConfig.additionalBuiltinExtensions.map(ext => {
                    if (ext.scheme === 'https') {
                        return {
                            ...ext,
                            scheme: 'http',
                            authority: `localhost:${PORT}`
                        };
                    }
                    return ext;
                });
            }
            
            res.setHeader('Content-Type', 'application/json');
            res.json(productConfig);
        } catch (error) {
            console.error('Error serving product.json:', error);
            res.status(500).json({ error: 'Failed to load product.json' });
        }
    });

    app.use('/extension', (req, res, next) => {
        console.log(`📦 Serving extension file: ${req.url}`);
        const extensionPath = path.join(__dirname, 'extension');
        
        // Serve files from the extension directory
        const filePath = path.join(extensionPath, req.url);
        
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                // Set appropriate content type
                if (req.url.endsWith('.json')) {
                    res.setHeader('Content-Type', 'application/json');
                } else if (req.url.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript');
                }
                
                res.sendFile(filePath);
                return;
            }
        }
        
        // If file not found, continue to next middleware
        next();
    });
}

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