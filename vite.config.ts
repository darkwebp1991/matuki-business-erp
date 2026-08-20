import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: true, // Exposes on 0.0.0.0 (all network interfaces / Wi-Fi)
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/data/**', '**/backups/**', '**/logs/**', '**/wa_session/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4321',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
