// vite.config.js - FIXED VERSION (tanpa terser)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // === OPTIMASI BUILD ===
  build: {
    // Code splitting untuk vendor libraries
    rollupOptions: {
      output: {
        manualChunks: {
          // Pisahkan vendor libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['react-hot-toast'],
        }
      }
    },
    // Pakai minify default (esbuild) - lebih cepat dari terser
    minify: 'esbuild',
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    // Enable gzip compression
    reportCompressedSize: true
  },

  // === OPTIMASI DEVELOPMENT ===
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@supabase/supabase-js',
      'react-hot-toast'
    ]
  },

  // === OPTIMASI ASSETS ===
  assetsInclude: ['**/*.svg'],
  
  // === SERVER CONFIGURATION ===
  server: {
    // Enable compression
    compress: true,
    // Faster HMR
    hmr: {
      overlay: false // Disable error overlay untuk performa
    }
  },

  // === PREVIEW CONFIGURATION ===
  preview: {
    port: 3000,
    strictPort: true
  },

  // === RESOLVE OPTIMIZATION ===
  resolve: {
    // Alias untuk path yang sering digunakan
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages'
    }
  },

  // === CSS OPTIMIZATION ===
  css: {
    // Enable CSS code splitting
    devSourcemap: false
  }
})