// vite.config.js - OPTIMIZED untuk mengatasi 404 errors
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // === IMPORTANT: History API fallback untuk SPA ===
  server: {
    historyApiFallback: true, // Ini penting untuk development
    compress: true,
    hmr: {
      overlay: false
    }
  },

  // === PREVIEW CONFIGURATION ===
  preview: {
    port: 3000,
    strictPort: true,
    // Tambahkan history fallback untuk preview juga
    historyApiFallback: true
  },

  // === OPTIMASI BUILD ===
  build: {
    // Code splitting yang lebih aggressive untuk lazy loading
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          
          // Router terpisah karena penting untuk SPA
          'vendor-router': ['react-router-dom'],
          
          // Supabase terpisah karena besar
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // UI libraries
          'vendor-ui': ['react-hot-toast'],
          
          // Utility libraries
          'vendor-utils': ['axios']
        },
        
        // Naming untuk better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop().replace('.jsx', '').replace('.js', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // Gunakan esbuild untuk minify (lebih cepat)
    minify: 'esbuild',
    
    // Chunk size yang lebih optimal
    chunkSizeWarningLimit: 1000,
    
    // Enable reportCompressedSize
    reportCompressedSize: true,
    
    // Tambahkan sourcemap untuk debugging produksi jika diperlukan
    sourcemap: false, // Set ke true jika perlu debug produksi
    
    // Target yang lebih spesifik
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']
  },

  // === OPTIMASI DEPENDENCIES ===
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@supabase/supabase-js',
      'react-hot-toast',
      'axios'
    ],
    // Force include untuk lazy loaded components
    force: true
  },

  // === RESOLVE OPTIMIZATION ===
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@utils': '/src/utils'
    }
  },

  // === CSS OPTIMIZATION ===
  css: {
    devSourcemap: false,
    postcss: {
      plugins: []
    }
  },

  // === BASE PATH (penting untuk deployment) ===
  base: '/',

  // === DEFINE ENV VARIABLES ===
  define: {
    // Hilangkan console.log di production
    'console.log': process.env.NODE_ENV === 'production' ? '() => {}' : 'console.log',
  },

  // === EXPERIMENTAL FEATURES ===
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      } else {
        return { relative: true }
      }
    }
  }
})