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
        version: '1.0.3',
        description: 'Categorizes and adds search to watched threads.',
        author: 'IntoTheV',
        icon: 'https://simp4.jpg.church/simpcityIcon192.png',
        namespace: 'https://github.com/IntoTheV',
        match: ['https://*.simpcity.su/watched/threads*'],
        downloadURL:
          'https://github.com/IntoTheV/WatchedThreadsEnhancer/raw/main/dist/build.user.js',
        updateURL: 'https://github.com/IntoTheV/WatchedThreadsEnhancer/raw/main/dist/build.user.js',
        supportURL: 'https://simpcity.su/threads/simpcity-watched-threads-enhancer.192026',
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
