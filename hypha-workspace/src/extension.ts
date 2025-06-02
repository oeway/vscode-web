import * as vscode from 'vscode';
import { HyphaFileSystemProvider } from './providers/HyphaFileSystemProvider';
import { HyphaAuthProvider } from './providers/HyphaAuthProvider';
import { HyphaNotebookController } from './providers/HyphaNotebookController';
import { HyphaNotebookSerializer } from './providers/HyphaNotebookSerializer';
import { showWelcomePage } from './components/WelcomePage';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Hypha Workspace extension is now active!');

    // Initialize authentication provider
    const authProvider = new HyphaAuthProvider(context);
    console.log('✅ Auth provider initialized');
    
    // Initialize filesystem provider
    const fileSystemProvider = new HyphaFileSystemProvider(authProvider);
    console.log('✅ File system provider initialized');
    
    // Initialize notebook controller
    const notebookController = new HyphaNotebookController(authProvider);
    console.log('✅ Notebook controller initialized');
    
    // Initialize notebook serializer
    const notebookSerializer = new HyphaNotebookSerializer();
    console.log('✅ Notebook serializer initialized');
    
    // Register filesystem provider
    const fsDisposable = vscode.workspace.registerFileSystemProvider('hypha', fileSystemProvider, {
        isCaseSensitive: true,
        isReadonly: false
    });
    
    // Register notebook serializer
    const serializerDisposable = vscode.workspace.registerNotebookSerializer('jupyter-notebook', notebookSerializer);
    
    context.subscriptions.push(fsDisposable, serializerDisposable);
    console.log('✅ File system provider registered for hypha:// scheme');
    console.log('✅ Notebook serializer registered for jupyter-notebook');

    // Register commands
    const welcomeCommand = vscode.commands.registerCommand('hypha-workspace.welcome', () => {
        console.log('💡 Welcome command executed');
        showWelcomePage(context, authProvider);
    });

    const loginCommand = vscode.commands.registerCommand('hypha-workspace.login', async () => {
        console.log('🔐 Login command executed');
        const success = await authProvider.login();
        if (success) {
            console.log('✅ Login successful');
        } else {
            console.log('❌ Login failed');
        }
    });

    const logoutCommand = vscode.commands.registerCommand('hypha-workspace.logout', async () => {
        console.log('🔓 Logout command executed');
        await authProvider.logout();
        console.log('✅ Logout completed');
    });

    const browseProjectsCommand = vscode.commands.registerCommand('hypha-workspace.browseProjects', async () => {
        console.log('📁 Browse projects command executed');
        try {
            // Use hypha:// scheme consistently
            const uri = vscode.Uri.parse('hypha://agent-lab-projects');
            console.log('📁 Opening folder with URI:', uri.toString());
        await vscode.commands.executeCommand('vscode.openFolder', uri);
            console.log('✅ Folder opened successfully');
        } catch (error) {
            console.error('❌ Failed to open folder:', error);
            vscode.window.showErrorMessage(`Failed to open Hypha projects: ${error}`);
        }
    });

    const restartKernelCommand = vscode.commands.registerCommand('hypha-workspace.restartKernel', async () => {
        console.log('🔄 Restart kernel command executed');
        try {
            await notebookController.restart();
            vscode.window.showInformationMessage('Kernel restarted successfully');
        } catch (error) {
            console.error('❌ Failed to restart kernel:', error);
            vscode.window.showErrorMessage(`Failed to restart kernel: ${error}`);
        }
    });

    const interruptKernelCommand = vscode.commands.registerCommand('hypha-workspace.interruptKernel', async () => {
        console.log('⚡ Interrupt kernel command executed');
        try {
            await notebookController.interrupt();
            vscode.window.showInformationMessage('Kernel interrupted successfully');
        } catch (error) {
            console.error('❌ Failed to interrupt kernel:', error);
            vscode.window.showErrorMessage(`Failed to interrupt kernel: ${error}`);
        }
    });

    // Add commands to subscriptions
    context.subscriptions.push(
        welcomeCommand, 
        loginCommand, 
        logoutCommand, 
        browseProjectsCommand,
        restartKernelCommand,
        interruptKernelCommand
    );
    console.log('✅ Commands registered');

    // Add providers to subscriptions for proper cleanup
    context.subscriptions.push(authProvider, notebookController);

    // Show welcome page on first activation
    console.log('📄 Showing welcome page');
    showWelcomePage(context, authProvider);
    
    console.log('🎉 Hypha Workspace extension activation complete!');
}

export function deactivate() {
    console.log('👋 Hypha Workspace extension is deactivated');
} 