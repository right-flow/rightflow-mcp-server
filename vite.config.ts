import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split PDF rendering library (react-pdf + pdfjs-dist)
          'pdf-viewer': ['react-pdf', 'pdfjs-dist'],
          // Split PDF generation library (pdf-lib + fontkit)
          'pdf-generator': ['pdf-lib', '@pdf-lib/fontkit'],
          // Split zip functionality
          'zip': ['jszip'],
          // Split React core
          'react-vendor': ['react', 'react-dom'],
          // Split UI components
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-separator',
            '@radix-ui/react-switch',
            '@radix-ui/react-toolbar',
            'lucide-react',
          ],
        },
      },
    },
  },
})
