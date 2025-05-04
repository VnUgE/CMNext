import 'pinia'
import { whenever } from '@vueuse/core';
import { storeToRefs, type PiniaPlugin, type PiniaPluginContext } from 'pinia'
import { includes, map, toLower } from 'lodash-es';
import { storeExport } from './index';
import type { Router } from 'vue-router';

export const pageGuardPlugin = (router: Router, protectedRoutes: string[]) :PiniaPlugin => {

    const { beforeEach, afterEach } = router

    //Convert routes to lowercase
    protectedRoutes = map(protectedRoutes, toLower);

    //scroll window back to top
    afterEach(() => window.scrollTo(0, 0))
  
    return ({ store }: PiniaPluginContext) => {

        const { loggedIn } = storeToRefs(store)

        //Setup nav guards
        beforeEach(async (to, from) => {
            if (!to.name) {
                return true;
            }
        
            // For the initial page load, wait for the login status to be determined
            // before checking the value of loggedIn
            await store.account.wait();

            if (!loggedIn.value) {
                if (includes(protectedRoutes, toLower(to.name as string))) {

                    return { name: 'Login', query: { redirect: to.fullPath }}
                }
            }

            //Allow
            return true;
        });

        //Redirect to login page if the user logged out
        whenever(
            () => loggedIn.value === false,
            () => router.push({ name: 'Login' }),
            { }
        );

        return storeExport({}) 
    }
}