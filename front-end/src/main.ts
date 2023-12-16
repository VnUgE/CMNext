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
import { configureApi } from '@vnuge/vnlib.browser'

//Import all styles
import './bootstrap/style/all.scss'
//Import your main style file
import './assets/main.scss'

//Import font data
import "@fontsource/source-sans-pro"

/* FONT AWESOME CONFIG */
import { library } from '@fortawesome/fontawesome-svg-core'
import { faBullhorn, faCertificate, faCheck, faChevronLeft, faChevronRight, faCode, faComment, faCopy, faFile, faFileDownload, faFileZipper, faFolderOpen, faHeadphones, faImage, faKey, faLink, faMinusCircle, faPencil, faPhotoFilm, faPlus, faRotateLeft, faSignInAlt, faSpinner, faSync, faTrash, faUser, faVideo } from '@fortawesome/free-solid-svg-icons'
import { faGithub, faDiscord, faMarkdown } from '@fortawesome/free-brands-svg-icons'

//Add required icons for the app
library.add(faSignInAlt, faGithub, faDiscord, faSpinner, faCertificate, faKey, faSync, faPlus, faMinusCircle, faUser, faCheck, faTrash, faCopy, 
    faPencil, faLink, faPhotoFilm, faRotateLeft, faMarkdown, faBullhorn, faFolderOpen, faComment, faChevronLeft, faChevronRight, faFileDownload,
    faCode, faFile, faVideo, faImage, faHeadphones, faFileZipper
    );

//Add icons to library
import router from './router'

//Import nav components
import FooterNav1 from './components/FooterNav1.vue'
import FooterNav2 from './components/FooterNav2.vue'
import SiteLogo from './components/Site-Logo.vue'
import DynamicFormVue from './components/DynamicForm.vue'

import { globalStatePlugin } from './store/globalState'
import { profilePlugin } from './store/userProfile'
import { mfaSettingsPlugin } from './store/mfaSettingsPlugin'
import { pageProtectionPlugin } from './store/pageProtectionPlugin'
import { socialMfaPlugin } from './store/socialMfaPlugin'
import { cmnextAdminPlugin } from './store/cmnextAdminPlugin'

//Setup the vnlib api
configureApi({
    session: {
        //The identifier of the login cookie, see Essentials.Accounts docs
        loginCookieName: 'li',
        browserIdSize: 32,
    },
    user: {
        accountBasePath: '/account',
    },
    axios: {
        //The base url to make api requests against
        baseURL: import.meta.env.VITE_API_URL,
        withCredentials: false,
        //See Essentials.Accounts docs
        tokenHeader: 'X-Web-Token',
    },
    storage: localStorage
})

createVnApp({
    //The app mount point
    mountElement: '#app',

    //Enable dark mode support
    useDarkMode: true,

    //Add the font awesome library
    faLibrary: library,

    //Called when the app is created for you to add custom elements
    onCreate(app, store) {

        //Add the router
        app.use(router)

        store.use(globalStatePlugin)
        //User-profile plugin
        .use(profilePlugin('/account/profile'))
        //setup page protection plugin with the router
        .use(pageProtectionPlugin(router))
        //Enable mfa with totp settings plugin (optional pki config)
        .use(mfaSettingsPlugin('/account/mfa', '/account/pki'))
        //Setup social mfa plugin
        .use(socialMfaPlugin)
        //Setup blog state
        .use(cmnextAdminPlugin(router, 'https://cdn.ckeditor.com/ckeditor5/40.0.0/super-build/ckeditor.js', 15))
        
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
