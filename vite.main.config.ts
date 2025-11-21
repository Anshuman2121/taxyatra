import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3',
        'bindings',
        'file-uri-to-path',
        ...builtinModules,
        ...builtinModules.map((m: string) => `node:${m}`)
      ]
    }
  },
  define: {
    __IS_DEV__: process.env.NODE_ENV === 'development'
  }
});
