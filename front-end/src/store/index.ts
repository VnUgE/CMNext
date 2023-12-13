import { useSession } from "@vnuge/vnlib.browser";
import { set } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";

/**
 * Loads the main store for the application
 */
export const useStore = defineStore('main', () => {

    const { loggedIn, isLocalAccount } = useSession();

    //MANAGED STATE
    const headerRoutes = shallowRef(Array<string>());
    const authRoutes = shallowRef(Array<string>());
    const siteTitle = shallowRef("");
    const pageTitle = shallowRef("");
    const showCookieWarning = shallowRef(!navigator.cookieEnabled); //Default to current cookie status

    /**
     * The current routes to display in the header depending on the 
     * user's login status
     */
    const currentRoutes = computed(() => loggedIn.value ? authRoutes.value : headerRoutes.value);

    const setHeaderRouteNames = (routeNames: string[], authRouteNames: string[]) => {
        set(headerRoutes, [...routeNames]);
        set(authRoutes, [...authRouteNames]);
    }

    const setSiteTitle = (title: string) => set(siteTitle, title);
    const setPageTitle = (title: string) => set(pageTitle, title);
    const setCookieWarning = (show: boolean) => set(showCookieWarning, show);

    return{
        loggedIn,
        isLocalAccount,
        headerRoutes,
        authRoutes,
        siteTitle,
        pageTitle,
        showCookieWarning,
        setCookieWarning,
        setPageTitle,
        currentRoutes,
        setHeaderRouteNames,
        setSiteTitle
    }
})
