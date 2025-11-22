import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
    lib: {
      entry: 'src/backend/index.ts',
      fileName: () => 'index.js',
      formats: ['cjs']
    },
    outDir: 'dist/main',
    emptyOutDir: true,
    target: 'node20',
    minify: false,
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3',
        'bindings',
        'file-uri-to-path',
        'puppeteer',
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth',
        'node-machine-id',
        ...builtinModules,
        ...builtinModules.map((m: string) => `node:${m}`)
      ]
    }
  },
  resolve: {
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
    conditions: ['node']
  },
  define: {
    __IS_DEV__: process.env.NODE_ENV === 'development'
  }
});
