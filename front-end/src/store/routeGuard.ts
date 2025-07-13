import 'pinia'
import { whenever } from '@vueuse/core';
import { storeToRefs, type PiniaPlugin, type PiniaPluginContext } from 'pinia'
import { toLower } from 'lodash-es';
import { storeExport } from './index';
import type { Router } from 'vue-router';

export const pageGuardPlugin = (router: Router) :PiniaPlugin => {

    const { beforeEach, afterEach } = router

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
                if (toLower(to.name as string) !== 'login') {

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
        
        //Whenever the logged in state changes from false to true, redirect to the last query param
        whenever(
            () => {
                const redirect = router.currentRoute.value.query['redirect'] as string | undefined;
                const isLoginPage = toLower(router.currentRoute.value.name as string) === 'login';
                //If the user is logged in and the redirect query param is set, and the current route is not the login page
                return loggedIn.value && redirect && !isLoginPage;
            },
            () => {
                const redirect = router.currentRoute.value.query['redirect'] as string | undefined;
                if (redirect) {
                    router.push({ path: redirect });
                } else {
                    //If no redirect, go to the dashboard
                    router.push({ name: 'Dashboard' });
                }
            },
            { immediate: true }
        );


        return storeExport({}) 
    }
}