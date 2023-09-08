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


//Get the create app from boostrap dir
import { createVnApp } from './bootstrap'

//Import all styles
import './bootstrap/style/all.scss'
import './assets/main.scss'

//Import font data
import "@fontsource/source-sans-pro"

/* FONT AWESOME CONFIG */
import { library } from '@fortawesome/fontawesome-svg-core'
import { faBullhorn, faCertificate, faCheck, faChevronLeft, faChevronRight, faComment, faCopy, faFolderOpen, faKey, faLink, faMinusCircle, faPencil, faPhotoFilm, faPlus, faRotateLeft, faSignInAlt, faSpinner, faSync, faTrash, faUser } from '@fortawesome/free-solid-svg-icons'
import { faGithub, faDiscord, faMarkdown } from '@fortawesome/free-brands-svg-icons'

//Add required icons for the app
library.add(faSignInAlt, faGithub, faDiscord, faSpinner, faCertificate, faKey, faSync, faPlus, faMinusCircle, faUser, faCheck, faTrash, faCopy, 
    faPencil, faLink, faPhotoFilm, faRotateLeft, faMarkdown, faBullhorn, faFolderOpen, faComment, faChevronLeft, faChevronRight);

//Add icons to library
import router from './router'

//Import nav components
import FooterNav1 from './components/FooterNav1.vue'
import FooterNav2 from './components/FooterNav2.vue'
import SiteLogo from './components/Site-Logo.vue'
import DynamicFormVue from './components/DynamicForm.vue'
import { configureApi, useAutoHeartbeat } from '@vnuge/vnlib.browser'
import { useLocalStorage } from '@vueuse/core'
import { watch } from 'vue'

createVnApp({
    //The app mount point
    mountElement: '#app',

    //The site title
    siteTitle: 'CMNext Admin',

    //Routes to display in the header when the user is not logged in
    headerRoutes: ['Home', 'Login'],

    //Routes to display in the header when the user is logged in
    authRoutes: ['Home', 'Blog', 'Account', 'Login'],

    //Enable dark mode support
    useDarkMode: true,

    //Add the font awesome library
    faLibrary: library,

    //Called when the app is created for you to add custom elements
    onCreate(app) {

        //Add the router
        app.use(router)

        //Add the home-page component
        router.addRoute({
            path: '/',
            name: 'Home',
            redirect: { path: '/' }
        })

        //Configure account page redirect to profile
        router.addRoute({
            path: '/account',
            name: 'Account',
            redirect: { path: '/account/profile' }
        })

        //Add the footer nav components
        app.component('FooterNav1', FooterNav1)
        app.component('FooterNav2', FooterNav2)

        //Register site-logo component
        app.component('SiteLogo', SiteLogo)

        //Register the dynamic form component
        app.component('dynamic-form', DynamicFormVue)
    },
})

//Setup the vnlib api
configureApi({
    session: {
        cookiesEnabled: navigator.cookieEnabled,
        loginCookieName: import.meta.env.VITE_LOGIN_COOKIE_ID,
        bidSize: 32,
        storage: localStorage
    },
    user: {
        accountBasePath: import.meta.env.VITE_ACCOUNTS_BASE_PATH,
        storage: localStorage,
        //The heartbeat interval in milliseconds, if you enable it
        autoHearbeatInterval: 1000 * 60 * 5, //5 minute interval
    },
    axios: {
        baseURL: import.meta.env.VITE_API_URL,
        withCredentials: import.meta.env.VITE_CORS_ENABLED === 'true',
        tokenHeader: import.meta.env.VITE_WEB_TOKEN_HEADER,
    }
})

//Get shared global state storage
const mainState = useLocalStorage("vn-state", { ahEnabled: false });

//Setup interval from local storage that remembers the user's preferrence
const { enabled } = useAutoHeartbeat(mainState.value.ahEnabled)
//Update the local storage when the value changes
watch(enabled, (val) => mainState.value.ahEnabled = val)