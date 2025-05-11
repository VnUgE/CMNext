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


//Get the create app from boostrap dir
import App from './App.vue'
import { configureApi, configureNotifier } from '@vnuge/vnlib.browser'
import Notifications, { notify } from '@kyvg/vue3-notification'
import { createApp } from "vue";
import { createPinia } from "pinia";

//Import all styles
import './assets/main.css'

//Import font data
import "@fontsource/source-sans-pro"

/* FONT AWESOME CONFIG */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faBars, faLock, faBullhorn, faCertificate, faCheck, faChevronLeft, faChevronRight, faCode, faComment, faCopy, faFile, faFileDownload, faFileZipper, faFolderOpen, faHeadphones, faImage, faKey, faLink, faMinusCircle, faPencil, faPhotoFilm, faPlus, faRotateLeft, faSignInAlt, faSpinner, faSync, faTrash, faUser, faVideo, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { faGithub, faDiscord, faMarkdown } from '@fortawesome/free-brands-svg-icons'

//Add required icons for the app
library.add(faTrashCan, faBars, faLock, faSignInAlt, faGithub, faDiscord, faSpinner, faCertificate, faKey, faSync, faPlus, faMinusCircle, faUser, faCheck, faTrash, faCopy, 
    faPencil, faLink, faPhotoFilm, faRotateLeft, faMarkdown, faBullhorn, faFolderOpen, faComment, faChevronLeft, faChevronRight, faFileDownload,
    faCode, faFile, faVideo, faImage, faHeadphones, faFileZipper
);

//Add icons to library
import router from './router'

//Import nav components
import Dialog from './components/Dialog.vue';
import DynamicFormVue from './components/DynamicForm.vue'

import { oauth2AppsPlugin } from './store/oauthAppsPlugin'
import { profilePlugin } from './store/userProfile'
import { mfaSettingsPlugin } from './store/mfaSettingsPlugin'
import { pageGuardPlugin } from './store/routeGuard'
import { accountStatePlugin } from './store/accountStatePlugin'
import { cmnextAdminPlugin } from './store/cmnextAdminPlugin'

//Setup the vnlib api
configureApi({
    session: {
        //The identifier of the login cookie, see Essentials.Accounts docs
        loginCookieName: import.meta.env.VITE_LOGIN_COOKIE_ID,
        browserIdSize: 32,
    },
    account: {
        endpointUrl: '/account',
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

const store = createPinia();

store.use(accountStatePlugin())
    //Protect desired routes
    .use(pageGuardPlugin(router, ['Account', 'Blog']))
    //Use the oauth2 plugin store
    //.use(oauth2AppsPlugin('/oauth/apps', '/oauth/scopes'))
    //User-profile plugin
    .use(profilePlugin())
    //Enable mfa with totp settings plugin
    .use(mfaSettingsPlugin())
     //Setup blog state
     .use(cmnextAdminPlugin(router, 'https://cdn.ckeditor.com/ckeditor5/40.0.0/super-build/ckeditor.js', 15))

// Redirect the homepage to the blog page
router.addRoute({
    path: '/',
    name: 'Home',
    redirect: { path: '/' }
})

const app = createApp(App)

app.use(Notifications) 
    .use(store)
    .use(router)
    .component('Dialog', Dialog)
    //Add the footer nav components
    .component('fa-icon', FontAwesomeIcon)
    //Register the dynamic form component
    .component('dynamic-form', DynamicFormVue)

    //MOUNT
    .mount('#app');

configureNotifier({ notify, close: notify.close });
