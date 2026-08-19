import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Local-only: forwards to scripts/dev-api-server.js (run via `npm run dev:api`)
      // so /admin can be tested without deploying. Vercel/Netlify handle
      // /api routes natively in production — this proxy has no effect there.
      '/api': 'http://localhost:3001',
    },
  },
});
