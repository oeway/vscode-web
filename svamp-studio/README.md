# Svamp Studio

Svamp Studio is a tailored VS Code environment designed for seamless integration with the Hypha server ecosystem. It provides a complete development environment with authentication, file system integration, and real-time collaboration features.

## Features

- **Hypha Server Integration**: Native connection to Hypha server with authentication
- **Real-time File System**: Browse and edit Hypha projects directly in VS Code
- **Authentication Management**: Secure token-based authentication with automatic renewal
- **Extension System**: Custom VS Code extension with welcome page and command palette integration
- **Live Debugging**: Hot reload support for rapid development

## Quick Start

### Development Mode (with Live Reload)

For the best development experience with automatic reloading:

```bash
npm run start:dev
```

This starts both:
- Webpack in watch mode (rebuilds extension on changes)
- Development server with live reload (restarts server on changes)

### Production Build

```bash
npm run build
npm start
```

### Available Scripts

- `npm run build` - Build extension for production
- `npm run dev` - Start webpack in watch mode
- `npm run start` - Start production server
- `npm run start:dev` - Start development mode with live reload
- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch TypeScript files

## Live Debugging

Svamp Studio includes comprehensive live reload support:

### Automatic Extension Reloading
- Extension rebuilds automatically when source files change
- Browser automatically refreshes when extension is updated
- No manual refresh needed during development

### Development Features
- Source maps for debugging TypeScript
- Fast incremental builds with webpack
- Server restarts on configuration changes
- Real-time feedback in console

### Development Workflow

1. **Start Development Mode**:
   ```bash
   npm run start:dev
   ```

2. **Open Browser**:
   Navigate to `http://localhost:3000`

3. **Edit Code**:
   - Modify files in `src/`
   - Watch automatic rebuilds in terminal
   - See changes reflected immediately in browser

4. **Monitor Console**:
   - Extension logs appear in browser console
   - Webpack build status in terminal
   - Live reload notifications

## Project Structure

```
svamp-studio/
├── src/
│   ├── components/          # UI components
│   │   └── WelcomePage.ts   # Welcome page webview
│   ├── providers/           # Core providers
│   │   ├── HyphaAuthProvider.ts       # Authentication
│   │   └── HyphaFileSystemProvider.ts # File system
│   ├── types/               # TypeScript types
│   └── extension.ts         # Extension entry point
├── dist/                    # Built extension files
├── package.json            # Extension manifest & dependencies
├── tsconfig.json           # TypeScript configuration
├── webpack.config.js       # Build configuration
├── nodemon.json           # Development server config
├── http.js                # Development server
└── index.html             # VS Code web interface
```

## Authentication

1. **Login to Hypha**:
   - Click "Login to Hypha" in welcome page
   - Authenticate via popup window
   - Token stored securely in workspace

2. **Access Projects**:
   - Use `hypha://` scheme in file explorer
   - Browse projects and artifacts
   - Edit files with real-time sync

## File System Integration

- **Scheme**: `hypha://`
- **Operations**: Read, write, create, delete, rename
- **Caching**: Intelligent caching for performance
- **Real-time**: Changes sync immediately with server

## Extension Commands

Available in Command Palette (`Ctrl+Shift+P`):

- `Svamp Studio: Welcome` - Open welcome page
- `Svamp Studio: Login` - Authenticate with Hypha
- `Svamp Studio: Logout` - Sign out from Hypha
- `Svamp Studio: Browse Projects` - Open project browser

## Development Tips

### Debugging Extension
- Open browser dev tools (`F12`)
- Check console for extension logs
- Use VS Code's built-in debugging tools

### Modifying UI
- Edit `src/components/WelcomePage.ts` for welcome page
- Changes rebuild automatically in dev mode
- Styles follow VS Code's theme system

### Adding Features
- Extend providers in `src/providers/`
- Register new commands in `src/extension.ts`
- Update manifest in `dist/package.json`

### Performance Optimization
- Enable caching in `HyphaFileSystemProvider`
- Optimize webpack bundle size
- Use development vs production builds

## Configuration

### Server Settings
- Default port: 3000
- Development mode: Auto-detected on localhost
- CORS enabled for cross-origin requests

### Extension Settings
- Authentication server: `https://hypha.aicell.io`
- Token expiration: 3 hours
- Auto-reconnect on startup

## Troubleshooting

### Extension Not Loading
1. Check browser console for errors
2. Verify extension files in `/extension/`
3. Restart development server

### Authentication Issues
1. Clear workspace storage
2. Re-authenticate via welcome page
3. Check server connectivity

### File System Problems
1. Verify Hypha server connection
2. Check authentication status
3. Review artifact manager permissions

### Live Reload Not Working
1. Ensure development mode is active
2. Check console for reload notifications
3. Verify webpack watch is running

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with live reload active
4. Test thoroughly in development mode
5. Submit pull request

## License

MIT License - see LICENSE file for details. 