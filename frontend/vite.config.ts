import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Chrome blocks <script type="module" src="..."> from file:// (null origin CORS).
// Classic <script src="..."> has no such restriction.
// This plugin: strips crossorigin + converts module scripts to classic scripts.
const fileProtocolCompat = (): Plugin => ({
  name: 'file-protocol-compat',
  transformIndexHtml: (html) =>
    html
      .replace(/ crossorigin(="[^"]*")?/g, '')
      .replace(/<script type="module"/g, '<script defer'),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), fileProtocolCompat()],
  base: './',
  resolve: {
    // Force a single copy of dompurify so Monaco's bundled 3.2.x is replaced
    // by the app's safe root version (^3.4.2) at build time.
    dedupe: ['dompurify'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Single IIFE bundle: no ES module syntax, no dynamic import() calls
        inlineDynamicImports: true,
        format: 'iife',
      },
    },
  },
})
