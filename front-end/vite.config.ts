// Copyright (C) 2026 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import mkcert from 'vite-plugin-mkcert';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

//Pages setup
import VueRouter from 'unplugin-vue-router/vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    // Fix for Windows path resolution issues with symlinks/subst drives
    // Only apply in build mode to avoid dev server issues
    // See: https://github.com/vitejs/vite/issues/20420
    root: realpathSync(resolve('./')),

    // Fix for CommonJS dependencies that need ESM interop
    // tiny-case (used by yup) uses CommonJS exports, needs conversion to ESM
    // needsInterop is experimental in Vite 7 for forcing ESM interop
    optimizeDeps: {
      include: ['tiny-case', 'yup'],
      needsInterop: ['tiny-case'],
    },

    // Only apply build config in production mode
    build: {
      // Optimized for self-hosted, single-user/small-team deployment
      // Fewer chunks = fewer HTTP requests, better for local/private networks
      cssCodeSplit: false,

      // Suppress chunk size warnings - not critical for self-hosted apps
      chunkSizeWarningLimit: 2000,

      rollupOptions: {
        output: {
          // Consolidate chunks for better caching in self-hosted scenario
          manualChunks: {
            // Group vendor libraries together
            vendor: ['vue', 'vue-router', 'pinia', '@vueuse/core', '@vueuse/router', 'axios'],
            // Keep large editors separate for optional lazy loading
            editors: ['json-editor-vue', 'suneditor'],
          },
        },
      },
    },
    plugins: [
      //Setup the vite pages plugin
      VueRouter({
        extensions: ['.vue'],
        routesFolder: 'src/views',
        exclude: ['**/components/**'],
        logs: true,
        importMode: 'async',
      }),
      vue(),
      tailwindcss(),
      mkcert(),
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8089',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
          headers: {
            'sec-fetch-mode': 'cors',
            referer: null,
            origin: 'https://127.0.0.1:8089',
            Connection: 'keep-alive',
          },
        },
      },
    },
  };
});
