const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/extension.ts',
    mode: argv.mode || 'development',
    target: 'webworker',
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    resolve: {
      extensions: ['.ts', '.js'],
      fallback: {
        "path": require.resolve("path-browserify"),
        "fs": false,
        "os": false,
        "crypto": false,
        "stream": false,
        "util": false,
        "buffer": require.resolve("buffer"),
        "url": require.resolve("url"),
        "querystring": require.resolve("querystring-es3")
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                sourceMap: true
              }
            }
          },
          exclude: /node_modules/
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      clean: true
    },
    externals: {
      vscode: 'commonjs vscode'
    },
    optimization: {
      minimize: isProduction
    },
    watchOptions: {
      ignored: /node_modules/,
      poll: 1000
    }
  };
}; 