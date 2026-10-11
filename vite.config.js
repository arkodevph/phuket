import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy-policy/index.html', import.meta.url)),
        terms: fileURLToPath(new URL('./terms-and-conditions/index.html', import.meta.url)),
        cookies: fileURLToPath(new URL('./cookies/index.html', import.meta.url)),
        property: fileURLToPath(new URL('./property-disclaimer/index.html', import.meta.url)),
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: `http://127.0.0.1:${process.env.PORT || 3001}` },
    },
  },
});
