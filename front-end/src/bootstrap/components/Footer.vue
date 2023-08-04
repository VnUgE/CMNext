<template>
  <footer class="bottom-0 left-0 z-10 w-full">
    <div id="footer-content" class="footer-content" >
      <div class="footer-main-container">
        <div class="col-span-4 sm:col-span-6 lg:col-span-3">
          <p class="my-4 text-sm leading-normal">
              CMNext ia a AGPL3 licensed free and open source content management system
          </p>
        </div>
        <nav>
          <slot name="footer-nav-1" />
        </nav>
        <nav>
          <slot name="footer-nav-2" />
        </nav>
        <nav>
          <p class="nav-title">
            Built with
          </p>
          <a class="footer-link" href="https://www.vaughnnugent.com/resources/software/modules">VNLib HTTP v1.0.1</a>
          <a class="footer-link" href="https://tailwindcss.com/">Tailwindcss</a>
          <a class="footer-link" href="https://vuejs.org/">Vuejs v3</a>
          <a class="footer-link" href="https://fontawesome.com/">Font Awesome</a>
        </nav>
        <div class="color-selector-container">
          <p class="nav-title">
            Color Scheme
          </p>
          <div class="flex flex-row gap-6 md:my-auto">
            <div class="">
              <button class="bg-sel-btn" @click.prevent="Dark" >
                Dark
              </button>
            </div>
            <div class="">
              <fa-icon icon="lightbulb" />
            </div>
            <div class="">
              <button class="bg-sel-btn" @click.prevent="Light">
                Light
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="text-sm footer-lower">
        <div class="mb-6 md:mb-0">
          <p class="text-left">
            Highly angular trousers ~ Pete Jordanson
          </p>
        </div>
        <div class="mb-6 text-left md:mb-0">
          Copyright &copy; 2023 Vaughn Nugent. All Rights Reserved.
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { debounce } from 'lodash'

const isDark = useDark()

const Dark = debounce(() => isDark.value = true, 50)
const Light = debounce(() => isDark.value = false, 50)
</script>
