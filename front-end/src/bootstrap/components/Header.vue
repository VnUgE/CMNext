<!-- eslint-disable vue/max-attributes-per-line -->
<script setup lang="ts">

import { debounce, find } from 'lodash-es'
import { useElementSize, onClickOutside, useElementHover, get } from '@vueuse/core'
import { computed, ref, toRefs } from 'vue'
import { useEnvSize } from '@vnuge/vnlib.browser'
import { RouteLocation, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useStore } from '../../store';

const emit = defineEmits(['logout'])
const props = defineProps<{
  routes: RouteLocation[]
}>()

const { routes } = toRefs(props)

const store = useStore();
const { loggedIn, siteTitle } = storeToRefs(store);
const { headerHeight } = useEnvSize()

//Get the router for navigation
const router = useRouter()

const sideMenuActive = ref(false)

const userDrop = ref(null)
const sideMenu = ref(null)
const userMenu = ref(null)

const dropMenuSize = useElementSize(userDrop)
const sideMenuSize = useElementSize(sideMenu)
const userMenuHovered = useElementHover(userMenu)

const uname = computed(() => (store as any).userName || 'Visitor')
const sideMenuStyle = computed(() => {

  const { width } = sideMenuSize;
  if(get(width) === 0) return { left: '-100vw' }

  // Side menu should be the exact height of the page and under the header,
  // So menu height is the height of the page minus the height of the header
  return {
    height: `calc(100vh - ${headerHeight.value}px)`,
    left: sideMenuActive.value ? '0' : `-${sideMenuSize.width.value}px`,
    top: `${headerHeight.value}px`
  }
})

const dropStyle = computed(() => {
  return {
    'margin-top': userMenuHovered.value ? `${headerHeight.value}px` : `-${(dropMenuSize.height.value - headerHeight.value)}px`
  }
})

const closeSideMenu = debounce(() => sideMenuActive.value = false, 50)
const openSideMenu = debounce(() => sideMenuActive.value = true, 50)

//Close side menu when clicking outside of it
onClickOutside(sideMenu, closeSideMenu)

//Redirect to the route when clicking on it
const gotoRoute = (route: string) => {

  //Get all routes from the router
  const allRoutes = router.getRoutes();

  //Try to find the route by its path
  const goto = find(allRoutes, { path: route });

  if (goto) {
    //navigate to the route manually
    router.push(goto);
  }
  else {
    //Fallback to full navigation
    window.location.assign(route);
  }
}

//Emit logout event
const OnLogout = () => emit('logout')

</script>
<template>
  <header class="sticky top-0 left-0 z-40">
    <div class="flex header-container">
      <div id="header-mobile-menu" ref="sideMenu" class="side-menu" :style="sideMenuStyle">
        <div class="pt-4 pl-4 pr-6">
          <nav id="header-mobile-nav" class="relative flex flex-col pr-3">
            <div v-for="route in routes" :key="route.path" class="m-auto ml-0">
              <div class="my-1" @click="closeSideMenu">
                <router-link :to="route">
                  {{ route.name }}
                </router-link>
              </div>
            </div>
          </nav>
        </div>
      </div>
      <div class="flex flex-row w-full md:mx-3">
        <div class="hidden w-4 lg:block" />
        <div class="flex px-4 my-auto text-xl md:hidden">
          <div v-if="!sideMenuActive" class="w-7" @click.prevent="openSideMenu">
            <fa-icon icon="bars" />
          </div>
          <div v-else class="text-2xl w-7">
            <fa-icon icon="times" />
          </div>
        </div>
        <div id="site-title-container" class="flex m-0 mr-3">
          <div class="inline-block px-1">
            <slot name="site_logo" />
          </div>
          <div id="site-title" class="inline-block m-auto mx-1">
            <router-link to="/">
              <h3>{{ siteTitle }}</h3>
            </router-link>
          </div>
        </div>
        <div class="hidden w-4 lg:block" />
        <nav id="header-desktop-nav" class="flex-row hidden mr-2 md:flex">
          <span v-for="route in routes" :key="route.fullPath" class="flex px-1 lg:px-3">
            <div v-if="!route.hide" class="m-auto">
              <router-link :to="route" class="flex-auto">
                {{ route.name }}
              </router-link>
            </div>
          </span>
        </nav>
        <div id="user-menu" ref="userMenu" class="drop-controller" :class="{ 'hovered': userMenuHovered }">
          <div class="user-menu">
            Hello <span class="font-semibold">{{ uname }}</span>
          </div>
          <div ref="userDrop" class="absolute top-0 right-0 duration-100 ease-in-out" style="z-index:-1" :style="dropStyle">
            <div class="drop-menu" @click.prevent="userMenuHovered = false">
              <span class="space-x-2" />
              <a v-if="!loggedIn" href="#" data-header-dropdown="register" @click="gotoRoute('/register')">
                Register
              </a>
              <a v-else href="#" data-header-dropdown="account" @click="gotoRoute('/account')">
                Account
              </a>
              <a v-if="!loggedIn" href="#" data-header-dropdown="login" @click="gotoRoute('/login')">
                Login
              </a>
              <a v-else href="#" data-header-dropdown="logout" @click.prevent="OnLogout">
                Logout
              </a>
            </div>
          </div>
        </div>
        <div class="hidden space-x-4 lg:block" />
      </div>
    </div>
  </header>
</template>
