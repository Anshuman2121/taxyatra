import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(async () => {
  const react = await import('@vitejs/plugin-react');
  return {
    plugins: [react.default()],
    base: './',
    root: 'src/frontend',
    publicDir: 'assets',
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: true,
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge']
          }
        }
      }
    },
    server: {
      port: 5173,
      strictPort: true
    },
    define: {
      __IS_DEV__: process.env.NODE_ENV === 'development'
    }
  };
});
