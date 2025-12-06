const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
    entryPoints: ['index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/bundle.js',
    external: [
        // Native modules must be external
        'node-machine-id',
        'electron', // Should not be present but just in case
        // Puppeteer can be tricky, but core is usually JS. 
        // However, keeping it external allows pkg to handle it if needed, 
        // BUT we want to bundle as much as possible to fix the merge-deep issue.
        // Let's bundle puppeteer-core as well, unless it has native deps.
        // puppeteer-core is pure JS.

        // We might need to mark some things external if they have .node bindings
    ],
    plugins: [],
    loader: {
        '.ts': 'ts'
    },
    resolveExtensions: ['.ts', '.js'],
    define: {
        'process.env.NODE_ENV': '"production"'
    },
    sourcemap: false,
    minify: false, // Keep it readable for debugging if something breaks
}).catch(() => process.exit(1));
