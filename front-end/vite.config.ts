// Copyright (C) 2025 Vaughn Nugent
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
import tailwindcss from '@tailwindcss/vite'
import { capitalize } from 'lodash-es'

//Pages setup
import VueRouter from 'unplugin-vue-router/vite'

// https://vitejs.dev/config/
export default defineConfig(() => { 

  return {
    build: {
      cssCodeSplit: true,
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
          return capitalize(name)
        },
        importMode: 'async',
      }),
      vue(),
      tailwindcss()
    ],
   
  }
})
