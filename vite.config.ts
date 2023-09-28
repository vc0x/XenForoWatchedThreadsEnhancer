import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        author: 'azzlover',
        icon: 'https://simp4.jpg.church/simpcityIcon192.png',
        namespace: 'https://github.com/azzlover',
        match: ['https://*.simpcity.su/watched/threads*'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
