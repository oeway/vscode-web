import * as vscode from 'vscode';
import { HyphaAuthProvider } from '../providers/HyphaAuthProvider';

export function showWelcomePage(context: vscode.ExtensionContext, authProvider: HyphaAuthProvider) {
    const panel = vscode.window.createWebviewPanel(
        'svamp-studio-welcome',
        'Welcome to Svamp Studio',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        async message => {
            switch (message.command) {
                case 'login':
                    console.log('🔐 Webview login request received');
                    const success = await authProvider.login();
                    if (success) {
                        console.log('✅ Webview login successful');
                        panel.webview.postMessage({ command: 'loginSuccess', user: authProvider.getUser() });
                    } else {
                        console.log('❌ Webview login failed');
                        panel.webview.postMessage({ command: 'loginError', error: 'Login failed' });
                    }
                    break;
                case 'logout':
                    console.log('🔓 Webview logout request received');
                    await authProvider.logout();
                    console.log('✅ Webview logout completed');
                    panel.webview.postMessage({ command: 'logoutSuccess' });
                    break;
                case 'connectHypha':
                    console.log('📁 Webview connect to Hypha request received');
                    try {
                        // Use hypha:// scheme consistently  
                        const uri = vscode.Uri.parse('hypha://agent-lab-projects');
                        console.log('📁 Opening folder with URI:', uri.toString());
                    await vscode.commands.executeCommand('vscode.openFolder', uri);
                        console.log('✅ Folder opened successfully from webview');
                    } catch (error) {
                        console.error('❌ Failed to open folder from webview:', error);
                        panel.webview.postMessage({ command: 'error', error: `Failed to open projects: ${error}` });
                    }
                    break;
            }
        },
        undefined,
        context.subscriptions
    );

    // Set initial HTML content
    updateWebviewContent(panel, authProvider);
    
    // Update content when auth state changes
    const updateInterval = setInterval(() => {
        updateWebviewContent(panel, authProvider);
    }, 1000);

    panel.onDidDispose(() => {
        clearInterval(updateInterval);
    });

    return panel;
}

function updateWebviewContent(panel: vscode.WebviewPanel, authProvider: HyphaAuthProvider) {
    const isAuthenticated = authProvider.isAuthenticated();
    const user = authProvider.getUser();

    panel.webview.html = getWebviewContent(isAuthenticated, user);
}

function getWebviewContent(isAuthenticated: boolean, user: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Svamp Studio</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        .header p {
            font-size: 1.2em;
            opacity: 0.8;
        }
        .login-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }
        .user-info {
            background-color: var(--vscode-inputValidation-infoBackground);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid var(--vscode-inputValidation-infoBorder);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .feature {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 8px;
        }
        .feature h3 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px;
        }
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .status.success {
            background-color: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
        }
        .status.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Svamp Studio</h1>
            <p>Your tailored VS Code environment for Hypha server integration</p>
        </div>

        ${isAuthenticated ? `
            <div class="user-info">
                <h3>✅ Connected to Hypha Server</h3>
                <p><strong>Logged in as:</strong> ${user?.email || 'Unknown'}</p>
                <button class="btn btn-secondary" onclick="logout()">Logout</button>
                <button class="btn" onclick="connectHypha()">Browse Hypha Projects</button>
            </div>
        ` : `
            <div class="login-section">
                <h3>🔐 Connect to Hypha Server</h3>
                <p>Login to access your projects and collaborate with the Hypha ecosystem</p>
                <button class="btn" onclick="login()">Login to Hypha</button>
                <div id="status"></div>
            </div>
        `}

        <div class="features">
            <div class="feature">
                <h3>🗂️ Project Management</h3>
                <p>Access and manage your Hypha projects directly from VS Code. Browse, edit, and sync files seamlessly.</p>
            </div>
            <div class="feature">
                <h3>🔄 Real-time Sync</h3>
                <p>Changes are automatically synchronized with the Hypha server, enabling collaborative development.</p>
            </div>
            <div class="feature">
                <h3>🛠️ Artifact Manager</h3>
                <p>Leverage the Hypha Artifact Manager for managing datasets, models, and applications.</p>
            </div>
            <div class="feature">
                <h3>🔒 Secure Access</h3>
                <p>Your authentication token is securely stored in the workspace for seamless access.</p>
            </div>
        </div>

        <div style="text-align: center; opacity: 0.7; font-size: 0.9em;">
            <p>Svamp Studio v1.0.0 | Powered by Hypha</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function login() {
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.innerHTML = '<div class="status">Initiating login...</div>';
            }
            vscode.postMessage({ command: 'login' });
        }

        function logout() {
            vscode.postMessage({ command: 'logout' });
        }

        function connectHypha() {
            vscode.postMessage({ command: 'connectHypha' });
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            const statusEl = document.getElementById('status');
            
            switch (message.command) {
                case 'loginSuccess':
                    if (statusEl) {
                        statusEl.innerHTML = '<div class="status success">Login successful! Reloading...</div>';
                    }
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                    break;
                case 'loginError':
                    if (statusEl) {
                        statusEl.innerHTML = '<div class="status error">Login failed: ' + message.error + '</div>';
                    }
                    break;
                case 'logoutSuccess':
                    location.reload();
                    break;
            }
        });
    </script>
</body>
</html>`;
} 