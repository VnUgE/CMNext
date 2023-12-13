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
import VueRouter from 'unplugin-vue-router/vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      plugins: [],
      output: {
       
      }
    },
  },
  css: {
    postcss: postcss
  },
  plugins: [
    //Setup the vite pages plugin
    VueRouter({
      extensions: ['vue'],
      routesFolder: 'src/views',
      exclude: ['**/components/**'],
      logs: true,
      getRouteName:(node) => {
        const trimSlashes = /^\/|\/$/g
        const name = node.fullPath.replace(trimSlashes, '')
        return name
      },
      importMode: 'async',
    }),
    vue(), 
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
