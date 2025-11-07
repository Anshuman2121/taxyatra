import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      external: ['electron']
    }
  }
});
