import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
    lib: {
      entry: 'src/preload.ts',
      fileName: () => 'preload.js',
      formats: ['cjs']
    },
    outDir: 'dist/preload',
    emptyOutDir: true,
    target: 'node16',
    rollupOptions: {
      external: ['electron']
    }
  }
});
