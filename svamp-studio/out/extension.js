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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const HyphaFileSystemProvider_1 = require("./providers/HyphaFileSystemProvider");
const HyphaAuthProvider_1 = require("./providers/HyphaAuthProvider");
const WelcomePage_1 = require("./components/WelcomePage");
function activate(context) {
    console.log('🚀 Svamp Studio extension is now active!');
    // Initialize authentication provider
    const authProvider = new HyphaAuthProvider_1.HyphaAuthProvider(context);
    console.log('✅ Auth provider initialized');
    // Initialize filesystem provider
    const fileSystemProvider = new HyphaFileSystemProvider_1.HyphaFileSystemProvider(authProvider);
    console.log('✅ File system provider initialized');
    // Register filesystem provider
    const disposable = vscode.workspace.registerFileSystemProvider('hypha', fileSystemProvider, {
        isCaseSensitive: true,
        isReadonly: false
    });
    context.subscriptions.push(disposable);
    console.log('✅ File system provider registered for hypha:// scheme');
    // Register commands
    const welcomeCommand = vscode.commands.registerCommand('svamp-studio.welcome', () => {
        console.log('💡 Welcome command executed');
        (0, WelcomePage_1.showWelcomePage)(context, authProvider);
    });
    const loginCommand = vscode.commands.registerCommand('svamp-studio.login', async () => {
        console.log('🔐 Login command executed');
        const success = await authProvider.login();
        if (success) {
            console.log('✅ Login successful');
        }
        else {
            console.log('❌ Login failed');
        }
    });
    const logoutCommand = vscode.commands.registerCommand('svamp-studio.logout', async () => {
        console.log('🔓 Logout command executed');
        await authProvider.logout();
        console.log('✅ Logout completed');
    });
    const browseProjectsCommand = vscode.commands.registerCommand('svamp-studio.browseProjects', async () => {
        console.log('📁 Browse projects command executed');
        try {
            // Use hypha:// scheme consistently
            const uri = vscode.Uri.parse('hypha://agent-lab-projects');
            console.log('📁 Opening folder with URI:', uri.toString());
            await vscode.commands.executeCommand('vscode.openFolder', uri);
            console.log('✅ Folder opened successfully');
        }
        catch (error) {
            console.error('❌ Failed to open folder:', error);
            vscode.window.showErrorMessage(`Failed to open Hypha projects: ${error}`);
        }
    });
    // Add commands to subscriptions
    context.subscriptions.push(welcomeCommand, loginCommand, logoutCommand, browseProjectsCommand);
    console.log('✅ Commands registered');
    // Add providers to subscriptions for proper cleanup
    context.subscriptions.push(authProvider);
    // Show welcome page on first activation
    console.log('📄 Showing welcome page');
    (0, WelcomePage_1.showWelcomePage)(context, authProvider);
    console.log('🎉 Svamp Studio extension activation complete!');
}
exports.activate = activate;
function deactivate() {
    console.log('👋 Svamp Studio extension is deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map