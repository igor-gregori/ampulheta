import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// A pasta build/ é a extensão pronta: é ela que vai para o Chrome e para o zip.
// O background.js mantém o nome fixo porque o manifest aponta para ele.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': import.meta.dirname } },
  build: {
    outDir: 'build',
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        background: 'background.js',
        popup: 'popup/popup.html',
        dashboard: 'dashboard/dashboard.html',
        blocked: 'blocked/blocked.html',
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
});
