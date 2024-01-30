import 'pinia'
import { watch } from 'vue';
import {  } from '@vnuge/vnlib.browser';
import { useSessionStorage, get, set } from '@vueuse/core';
import { PiniaPluginContext, PiniaPlugin, storeToRefs } from 'pinia'
import { includes, startsWith } from 'lodash-es';
import { useRouter } from 'vue-router';

declare module 'pinia' {
    export interface PiniaCustomProperties {
       
    }
}

export const pageProtectionPlugin = (router: ReturnType<typeof useRouter>): PiniaPlugin => {

    return ({ store }: PiniaPluginContext) => {

        const { loggedIn, headerRoutes } = storeToRefs(store)

        const lastPageStore = useSessionStorage('lastPageStore', undefined)

        //Setup nav guards
        router.beforeEach((to, from) => {
            if(!to.name){
                return true;
            }

            //see if to route is login route
            if(startsWith(to.name as string, 'Login')){

                //If the user is logged-in, redirect to the last page
                if(get(loggedIn) === true){
                    const lastPath = get(lastPageStore);
                    set(lastPageStore, undefined)   //Clear the last page

                    return lastPath ? { path: lastPath } : true;
                }
                else{
                    //Set last page as from page
                    set(lastPageStore, from.fullPath)
                }
                return true;
            }

            //See if the to route is not in allowed routes
            if (!includes(get(headerRoutes), to.name as string)){
                //Check if the user is logged in
                if(get(loggedIn) === false){

                    //Save the last page
                    set(lastPageStore, to.fullPath)

                    //Redirect to login
                    return { name: 'Login' }
                }
            }

            //Allow
            return true;
        })

        //scroll window back to top
        router.afterEach(() => window.scrollTo(0, 0))

        watch(loggedIn, (li) => {
            //If the user gets logged out, redirect to login
            if(li === false && router.currentRoute.value.name !== 'Login'){
                router.push({ name: 'Login' })
            }
        })

        return {
          
        }
    }
}