import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base: Capacitor serves the built app from the filesystem
  // (capacitor://localhost), where absolute "/assets/..." URLs do not resolve.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Bind to all interfaces so the dev build can be opened on a real phone,
    // which is the only way to validate safe-area insets and touch behaviour.
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    // Keep every extracted asset as a real file so it stays traceable back to
    // its SWF library ID; inlining would dissolve the filename.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          // Phaser is ~1.2 MB minified and changes far less often than game
          // code; splitting it keeps incremental deploys small.
          phaser: ['phaser'],
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.mjs'],
    css: false,
    alias: {
      // Phaser's package `main` is its CommonJS *source* (src/phaser.js), which
      // is what Node-style resolution picks in Vitest. That source `require`s
      // the optional `phaser3spectorjs` debug dependency, which is not
      // installed, so importing it throws.
      //
      // Point tests at dist/phaser.js — the UMD bundle Vite already resolves
      // for the app via the `browser` field, with the debug branch stripped.
      // Not phaser.esm.js: that build has named exports only, so the
      // `import Phaser from 'phaser'` used throughout the codebase would
      // resolve to undefined.
      phaser: fileURLToPath(new URL('./node_modules/phaser/dist/phaser.js', import.meta.url)),
    },
  },
});
