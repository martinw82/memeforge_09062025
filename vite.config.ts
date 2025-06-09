import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      // Add Sentry plugin last
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        telemetry: false, // Disable telemetry
      }),
    ],
  
  // Production optimizations
  build: {
    // Enable minification for production
    minify: 'terser',
    
    // Generate source maps for debugging
    sourcemap: true,
    
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        // Manual chunk splitting for vendor dependencies
        manualChunks: {
          // React and React DOM in separate chunk
          'react-vendor': ['react', 'react-dom'],
          
          // UI and icons
          'ui-vendor': ['lucide-react'],
          
          // Analytics and tracking
          'analytics-vendor': ['axios'],
          
          // Blockchain libraries
          'blockchain-vendor': [
            'algosdk', 
            '@perawallet/connect', 
            'ethers',
            '@walletconnect/client',
            '@walletconnect/qrcode-modal'
          ],
          
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js'],
        },
        
        // Consistent naming for chunks
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop() 
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name!.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    
    // Optimize assets
    assetsInlineLimit: 4096, // 4kb
    cssCodeSplit: true,
    
    // Build target for modern browsers
    target: 'esnext',
    
    // Performance optimizations
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
      },
    },
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    cors: true,
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    open: true,
  },
  
  // Dependency optimization
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'axios',
    ],
  },
  
  // Global defines for production
  define: {
    global: 'globalThis',
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
  
  // CSS configuration
  css: {
    devSourcemap: true,
    postcss: './postcss.config.js',
  },
  
  // Performance monitoring
  esbuild: {
    // Remove debugger and console in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
}});