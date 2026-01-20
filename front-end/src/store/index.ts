// Copyright (C) 2025 Vaughn Nugent
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

import { set, useLocalStorage, watchDebounced, toRefs, type DeepMaybeRef } from "@vueuse/core";
import { defineStore } from "pinia";
import { defaultsDeep } from 'lodash-es';
import { computed, shallowRef, type UnwrapNestedRefs } from "vue";

export const storeExport = <T>(val: DeepMaybeRef<T>): UnwrapNestedRefs<T> => val as UnwrapNestedRefs<T>;

type GlobalState = { autoHeartbeat: boolean, theme: string, loggedIn: boolean, userName: string | undefined, isLocalAccount: boolean };
const defaultState: GlobalState = { autoHeartbeat: false, theme: '', loggedIn: false, userName: undefined, isLocalAccount: false };

/**
 * Loads the main store for the application
 */
export const useStore = defineStore('main', () => {

    //MANAGED STATE
    const headerRoutes = shallowRef(Array<string>());
    const authRoutes = shallowRef(Array<string>());
    const pageTitle = shallowRef("");
    

    //Get shared global state storage
    const mainState = useLocalStorage<GlobalState | undefined>("vn-state", defaultState);
    defaultsDeep(mainState.value, defaultState);
    const stateRefs = toRefs<GlobalState>(mainState as any);

    // TODO: Re-implement auto-heartbeat using useAccount().heartbeat() and useIntervalFn
    // Previous: useAutoHeartbeat(5 * 60 * 1000, stateRefs.autoHeartbeat);
    // Need to pass ApiConfig to store factory or create a heartbeat plugin

    /**
     * The current routes to display in the header depending on the 
     * user's login status
     */
    const currentRoutes = computed(() => stateRefs.loggedIn.value ? authRoutes.value : headerRoutes.value);

    const setHeaderRouteNames = (routeNames: string[], authRouteNames: string[]) => {
        set(headerRoutes, [...routeNames]);
        set(authRoutes, [...authRouteNames]);
    }
   
    const setPageTitle = (title: string) => set(pageTitle, title);

    //Watch for changes to the system theme and update the html tag
    watchDebounced(stateRefs.theme, (theme) => {
        document.getElementsByTagName('html')
            .item(0)
            ?.setAttribute('data-theme', theme);
        }, 
        { immediate: true, debounce: 50 }
    );
 
    return{
        headerRoutes,
        authRoutes,
        pageTitle,
        setPageTitle,
        currentRoutes,
        setHeaderRouteNames,
        ...stateRefs
    }
})
