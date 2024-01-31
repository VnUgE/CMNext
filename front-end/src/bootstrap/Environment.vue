<script setup lang="ts">

import { computed, defineAsyncComponent } from 'vue'
import { RouteLocation, useRouter } from 'vue-router'
import { filter, map, without, find, includes } from 'lodash-es'
import { storeToRefs } from 'pinia'
import { useEnvSize } from '@vnuge/vnlib.browser'
import { useStore } from '../store'
import siteHeader from './components/Header.vue'
import siteFooter from './components/Footer.vue'
const ConfirmPrompt = defineAsyncComponent(() => import('./components/ConfirmPrompt.vue'));
const CookieWarning = defineAsyncComponent(() => import('./components/CookieWarning.vue'));
const PasswordPrompt = defineAsyncComponent(() => import('./components/PasswordPrompt.vue'));

const emit = defineEmits(['logout'])
const store = useStore()
const { showCookieWarning, currentRoutes } = storeToRefs(store)
const { getRoutes } = useRouter();

//Use the env size to calculate the header and footer heights for us
const { header, footer, content, headerHeight, footerHeight } = useEnvSize(true)

const routes = computed<RouteLocation[]>(() => {
  // Get routes that are defined above but only if they are defined in the router
  // This is a computed property because loggedin is a reactive property

  const routes = filter(getRoutes(), (pageName) => includes(currentRoutes.value, pageName.name))

  const activeRoutes = map(currentRoutes.value, route => find(routes, { name: route }))

  return without<RouteLocation>(activeRoutes, undefined)
})

//Forces the page content to be exactly the height of the viewport - header and footer sizes
const bodyStyle = computed(() => ({ 'min-height': `calc(100vh - ${headerHeight.value + footerHeight.value}px)` }))
const generalToastStyle = computed(() => ({ top: `${headerHeight.value + 5}px` }))
const formToastStyle = computed(() => ({ top: `${headerHeight.value}px` }))

</script>
<template>
  <div id="env-entry" ref="content" class="absolute top-0 left-0 w-full min-h-screen env-bg">
    <div class="absolute flex w-full">
      <notifications 
        class="general-toast"
        group="general"
        position="top"
        :style="generalToastStyle"
      />
    </div>
    <div class="absolute flex w-full">
      <notifications
        class="form-toast"
        group="form"
        position="top"
        :style="formToastStyle"
      />
    </div>

    <site-header ref="header" :routes="routes" @logout="emit('logout')" >
      <template #site_logo>
         <!-- Use the global site-logo if enabled -->
        <site-logo />
      </template>
    </site-header>

    <div id="env-body" class="flex w-full" :style="bodyStyle">
      <cookie-warning :hidden="showCookieWarning" />

      <slot name="main" />
    </div>

    <!-- Setup footer with nav elements from global config -->
    <site-footer ref="footer">
      <template #footer-nav-1>
        <footer-nav-1/>
      </template>
      <template #footer-nav-2>
        <footer-nav-2/>
      </template>
    </site-footer>

    <PasswordPrompt />
    <ConfirmPrompt />
  </div>
</template>
