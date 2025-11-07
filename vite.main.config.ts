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
        'sqlite3',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`)
      ]
    }
  },
  define: {
    __IS_DEV__: process.env.NODE_ENV === 'development'
  }
});
