<script setup lang="ts">
import { find, isEqual, toLower, truncate } from 'lodash-es'
import { useElementSize, onClickOutside, get, useToggle } from '@vueuse/core'
import { computed, shallowRef, toRefs } from 'vue'
import { useEnvSize } from '@vnuge/vnlib.browser'
import { type RouteRecord, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useStore } from '../store';

const emit = defineEmits(['logout'])
const props = defineProps<{
  routes: (RouteRecord & { hide: boolean })[]
}>()

const { routes } = toRefs(props)

const store = useStore();
const { loggedIn, siteTitle } = storeToRefs(store);
const { headerHeight } = useEnvSize()

//Get the router for navigation
const router = useRouter()

const accountMenu = shallowRef<HTMLDivElement>()
const sideMenu = shallowRef<HTMLDetailsElement>()
const sideMenuSize = useElementSize(sideMenu)
const [sideMenuActive, toggleSideMenu] = useToggle(false)

const uname = computed(() => truncate(store.userName, { length: 18 }))

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

//Redirect to the route when clicking on it
const gotoRoute = (route: string) => {

  //Get all routes from the router
  const allRoutes = router.getRoutes();

  //Try to find the route by its path
  const goto = find(allRoutes, r => isEqual(toLower(r.path), toLower(route)));

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
const closeAccMenu = () => {
  const menu = get(accountMenu)
  if (menu) menu.removeAttribute('open')
}

onClickOutside(sideMenu, () => toggleSideMenu(false))
onClickOutside(accountMenu, closeAccMenu)

router.afterEach(() => {
  toggleSideMenu(false)
  closeAccMenu()
})
</script>
<template>

  <header class="">
    <div ref="sideMenu"
      class="absolute pt-2 ease-in-out duration-150 bg-base-100 shadow border-r border-base-content/10"
      :style="sideMenuStyle">
      <div class="pt-4 px-8">
        <nav id="header-mobile-nav" class="relative flex flex-col pr-3">
          <div v-for="route in routes" :key="route.path" class="m-auto ml-0">
            <div class="my-1 text-xl" @click="toggleSideMenu(false)">
              <router-link :to="route">
                {{ route.name }}
              </router-link>
            </div>
          </div>
        </nav>
      </div>
    </div>

    <!-- desktop navigation menu  -->
    <div class="navbar bg-base-100">

      <div class="md:hidden block flex-none">
        <button class="btn btn-square btn-ghost" @click="toggleSideMenu()">
          <span class="text-xl w-7">
            <fa-icon v-if="!sideMenuActive" icon="bars" />
            <fa-icon v-else icon="times" />
          </span>
        </button>
      </div>

      <div class="flex-1">
        <router-link to="/" class="btn btn-ghost text-xl">{{ siteTitle }}</router-link>
      </div>
      <div class="flex-none">
        <ul class="menu menu-horizontal px-1">
          <li v-for="route in routes" :key="route.path" class="mx-2 md:block hidden">
            <router-link v-if="!route.hide" :to="route" class="px-2">
              {{ route.name }}
            </router-link>
          </li>
          <li v-if="loggedIn">
            <details class="dropdown dropdown-bottom dropdown-end" ref="accountMenu">
              <summary class="bg-base-200 rounded-full">
                <div class="max-md:hidden font-semibold">
                  {{ uname }}
                </div>
                <div class="block md:hidden avatar">
                  <div class="w-10 rounded-full md:hidden block">
                    <img alt="Tailwind CSS Navbar component"
                      src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" />
                  </div>
                </div>
              </summary>
              <ul
                class="menu menu-sm dropdown-content border border-base-content/10 bg-base-200 rounded-box z-[1] w-40 p-2 shadow" style="margin-top: .25rem;">
                <li>
                  <a href="#" data-header-dropdown="account" @click.prevent="gotoRoute('/account')">
                    Account
                  </a>
                </li>
                <li class="mt-1">
                  <a href="#" data-header-dropdown="logout" class="hover:bg-red-500/50" @click.prevent="OnLogout">
                    Logout
                  </a>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </div>
  </header>

</template>
