// Copyright (C) 2023 Vaughn Nugent
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

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import postcss from './postcss.config.js'
import { resolve } from 'path'
import { server } from './vite.config.local.ts'

//Pages setup
import Pages from 'vite-plugin-pages'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      plugins: [],
      output: {
        manualChunks: {
          vnlib: ['@vnuge/vnlib.browser'],
          cmnex: ['@vnuge/cmnext-admin'],
        }
      }
    },
  },
  css: {
    postcss: postcss
  },
  plugins: [
    vue(), 
    //Setup the vite pages plugin
    Pages({
      extensions: ['vue'],
      dirs: 'src/views',
      exclude: ['**/components/**'],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    }
  },
  server: {
    ...server
  }
})
