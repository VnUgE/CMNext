<script setup lang="ts">
import { apiCall, useAccount, useOauthLogin } from '@vnuge/vnlib.browser';
import { computed, defineAsyncComponent } from 'vue'
import { type RouteRecord, useRouter } from 'vue-router'
import { filter, map, find, includes } from 'lodash-es'
import { useEnvSize } from '@vnuge/vnlib.browser'
import { useStore } from './store'
import { storeToRefs } from 'pinia';
import siteHeader from './components/Header.vue'
import siteFooter from './components/Footer.vue'
const ConfirmPrompt = defineAsyncComponent(() => import('./components/ConfirmPrompt.vue'));
const PasswordPrompt = defineAsyncComponent(() => import('./components/PasswordPrompt.vue'));

const store = useStore()
const { siteTitle, pageTitle } = storeToRefs(store)
const oauthLogout = useOauthLogin();
const account = useAccount();

store.setSiteTitle('CMnext Admin')
store.setPageTitle('Home')

//Set header routes
store.setHeaderRouteNames(
  ['Login'],
  ['Blog', 'Account', 'Login']
)

//Compute meta title from the default site title and the page title
const metaTile = computed(() => `${pageTitle.value} | ${siteTitle.value}`)

const { showCookieWarning, currentRoutes } = storeToRefs(store)
const { getRoutes } = useRouter();

//Use the env size to calculate the header and footer heights for us
const { header, footer, content, headerHeight, footerHeight } = useEnvSize(true)

const routes = computed<RouteRecord[]>(() => {
  // Get routes that are defined above but only if they are defined in the router
  // This is a computed property because loggedin is a reactive property

  const routes = filter(getRoutes(), (pageName) => includes(currentRoutes.value, pageName.name))

  const activeRoutes = map(currentRoutes.value, route => find(routes, { name: route }))
  return filter(activeRoutes, s => s !== undefined)
})

//Forces the page content to be exactly the height of the viewport - header and footer sizes
const bodyStyle = computed(() => ({ 'min-height': `calc(100vh - ${headerHeight.value + footerHeight.value}px)` }))
const generalToastStyle = computed(() => ({ top: `${headerHeight.value + 5}px` }))
const formToastStyle = computed(() => ({ top: `${headerHeight.value}px` }))

const logout = async () => {
  if (oauthLogout.isEnabled(store.account.data)) {
    await apiCall(() => oauthLogout.logout({ autoRedirect: true }));
  }
  else {
    await apiCall(account.logout);
  }

  store.account.refresh();
}

</script>

<template>

  <head>
    <title>{{ metaTile }}</title>
  </head>

  <div id="env-entry" ref="content" class="absolute top-0 left-0 w-full min-h-screen">

    <div class="absolute flex w-full">
      <notifications class="general-toast" group="general" position="top" :style="generalToastStyle" />
      <notifications class="form-toast" group="form" position="top" :style="formToastStyle" />
    </div>

    <div ref="header" class="sticky top-0 left-0 z-40 w-full">
      <site-header :routes="routes" @logout="logout">
        <template #site_logo>
          <!-- Use the global site-logo if enabled -->
         
        </template>
      </site-header>
    </div>

    <div id="env-body" class="flex w-full" :style="bodyStyle">
      <cookie-warning :hidden="showCookieWarning" />

      <router-view />

    </div>

    <!-- Setup footer with nav elements from global config -->
    <div ref="footer">
      <site-footer>
        <template #footer-nav-1>
          <footer-nav-1 />
        </template>
        <template #footer-nav-2>
          <footer-nav-2 />
        </template>
      </site-footer>
    </div>

    <PasswordPrompt />
    <ConfirmPrompt />
  </div>
</template>
