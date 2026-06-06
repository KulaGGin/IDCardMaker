import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    // Fail loudly if 5173 is already in use instead of silently starting a 2nd
    // server on 5174. A leftover/stale dev server keeps answering 5173 and serves
    // a broken page (manifest + assets 404 to the SPA fallback) otherwise.
    strictPort: true,
  },
});
