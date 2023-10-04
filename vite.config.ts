import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Watched Threads Enhancer',
        version: '1.0.1',
        description: 'Categorizes and adds search to watched threads.',
        author: 'azzlover',
        icon: 'https://simp4.jpg.church/simpcityIcon192.png',
        namespace: 'https://github.com/azzlover',
        match: ['https://*.simpcity.su/watched/threads*'],
      },
      build: {
        fileName: 'build.user.js',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
