<template>
  <head>
    <title>{{ metaTile }}</title>
  </head>
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

    <site-header ref="header" :site-title="siteTitle" :routes="routes" >
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

<script setup lang="ts">

import { computed } from 'vue'
import { RouteLocation, useRouter } from 'vue-router'
import { filter, map, without, find, includes } from 'lodash-es'
import { useEnvSize, useScrollOnRouteChange, useSession, useTitle } from '@vnuge/vnlib.browser'
import CookieWarning from './components/CookieWarning.vue'
import PasswordPrompt from './components/PasswordPrompt.vue'
import siteHeader from './components/Header.vue'
import siteFooter from './components/Footer.vue'
import ConfirmPrompt from './components/ConfirmPrompt.vue'
import { headerRoutes, authRoutes, siteTitle, showCookieWarning } from './index'

const { loggedIn } = useSession();
const { getRoutes } = useRouter();
const { title } = useTitle(siteTitle.value);

//Use the env size to calculate the header and footer heights for us
const { header, footer, content, headerHeight, footerHeight } = useEnvSize(true)

//setup autoscroll
useScrollOnRouteChange();

//Compute meta title from the default site title and the page title
const metaTile = computed(() => title.value ? `${title.value} | ${siteTitle.value}` : siteTitle.value)

const routes = computed<RouteLocation[]>(() => {
  // Get routes that are defined above but only if they are defined in the router
  // This is a computed property because loggedin is a reactive property
  const routeNames = loggedIn.value ? authRoutes.value : headerRoutes.value

  const routes = filter(getRoutes(), (pageName) => includes(routeNames, pageName.name))

  const activeRoutes = map(routeNames, route => find(routes, { name: route }))

  return without<RouteLocation>(activeRoutes, undefined)
})


//Forces the page content to be exactly the height of the viewport - header and footer sizes
const bodyStyle = computed(() => {
  return { 'min-height': `calc(100vh - ${headerHeight.value + footerHeight.value}px)` }
})

const generalToastStyle = computed(() => {
  return { top: `${headerHeight.value + 5}px` }
})

const formToastStyle = computed(() => {
  return { top: `${headerHeight.value}px` }
})
</script>

<style>

</style>
