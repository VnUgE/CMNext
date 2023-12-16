// Copyright (C) 2023 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { useSession } from "@vnuge/vnlib.browser";
import { set } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";

export { SortType, QueryType } from './sharedTypes'

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
