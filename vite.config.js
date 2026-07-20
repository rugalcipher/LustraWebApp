import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Build marker — a timestamp baked into the bundle at build time so the deployed bundle can be identified
  // (logged once to the console on boot). Lets us confirm the live app is serving the newest JS, not a stale cache.
  define: {
    __BUILD_ID__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5181,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    rollupOptions: {
      output: {
        // Split the vendor libraries a first-time visitor must download.
        //
        // These are chunked by CHANGE RATE, not by size: React, the router, the query
        // client and the animation library are stable across releases, so isolating them
        // lets a returning visitor reuse the cached copies while only the (frequently
        // changing) application chunk is re-fetched. Application code is left to Vite's
        // own route-level splitting, which the route registry already drives.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('react-router')) return 'vendor-router'
          // Must come after react-router: that package also matches /react/.
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('lucide-react')) return 'vendor-icons'

          // Everything else is left to Vite's automatic splitting — deliberately.
          //
          // An earlier version returned a catch-all 'vendor' chunk here, which HOISTED
          // route-specific libraries out of their lazy chunks: recharts (~390 kB, used
          // only by AgencyAnalytics) and @microsoft/signalr became part of a bundle every
          // guest downloaded. Naming a chunk overrides the dynamic-import boundary, so
          // only genuinely shared libraries may be listed above.
          return undefined
        },
      },
    },
  },
})