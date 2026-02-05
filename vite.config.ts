import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/**/*.ttf', 'fonts/**/*.woff2', 'icons/**/*.png'],
      manifest: false, // Use the manifest.json from public folder
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB limit
        globPatterns: ['**/*.{js,css,html,ttf,woff2,png,svg}'],
        runtimeCaching: [
          {
            // Cache form data API calls
            urlPattern: /\/api\/forms/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'forms-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache font files
            urlPattern: /\/fonts\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable PWA in development
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './packages/app/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // WhatsApp API routes go to new backend on 3003
      // CRITICAL: Must come FIRST to match before the generic /api rules
      '/api/v1': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        ws: true,
      },
      // Specific old API routes go to dev-server.mjs on 3002
      '/api/forms': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/responses': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/billing': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/extract-fields': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/health': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/generate-html': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/plans': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/webhooks': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/public-form': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/form-versions': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/forms-publish': {
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
