import { watch } from 'vue';
import { useSession } from '@vnuge/vnlib.browser';
import { useSessionStorage, get, set } from '@vueuse/core';
import { includes, map, toLower } from 'lodash-es';
import { type Router } from 'vue-router';

import { createRouter, createWebHistory } from 'vue-router/auto'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL)
})

/**
 * Enables page guards for protected routes and configures a 
 * last page store.
 */
export const guardRoutes = (router: Router, protectedRoutes: string[]) => {
  const { loggedIn } = useSession()

  const lastPageStore = useSessionStorage('lastPageStore', undefined)

  const { beforeEach, currentRoute, afterEach, push } = router

  //Convert routes to lowercase
  protectedRoutes = map(protectedRoutes, toLower);

  //Setup nav guards
  beforeEach((to, from) => {
    if (!to.name) {
      return true;
    }

    if (!get(loggedIn)) {
      if (includes(protectedRoutes, toLower(to.name as string))) {

        //Set last page as from page
        set(lastPageStore, from.fullPath)

        return { name: 'Login' }
      }
    }
    else {
      /**
       * If the user is going back to the login page, are logged in,
       * and have a previous page to go back to, redirect to the last page
       * instead of the login page
       */
      const lastPath = get(lastPageStore);

      if (to.name === 'Login' && lastPath) {
        set(lastPageStore, undefined)   //Clear the last page
        return lastPath ? { path: lastPath } : true;
      }
    }

    //Allow
    return true;
  })

  //scroll window back to top
  afterEach(() => window.scrollTo(0, 0))

  watch(loggedIn, (li) => {
    //If the user gets logged out, redirect to login
    if (li === false && currentRoute.value.name !== 'Login') {
      push({ name: 'Login' })
    }
  })
}