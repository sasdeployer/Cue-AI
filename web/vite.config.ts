import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      // The deck preview runs in its own same-origin iframe document so the
      // engine's global keyboard/CSS/viewport handling stays isolated from Cue.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        deckRuntime: resolve(import.meta.dirname, 'deck-runtime.html'),
      },
    },
  },
})
