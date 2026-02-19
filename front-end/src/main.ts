// Copyright (C) 2026 Vaughn Nugent
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

// TODO: Remove @headlessui/vue dependency - it has been deprecated for Vue.js
// Replace all HeadlessUI components with DaisyUI equivalents:
// - Switch → DaisyUI toggle (<input type="checkbox" class="toggle" />)
// - Dialog → DaisyUI modal
// Account settings components have been migrated to use DaisyUI toggles and form controls.
// TODO: Migrate to vue-sonner for modern toast notifications
// Replace @kyvg/vue3-notification with vue-sonner for better UX and smaller bundle size

//Get the create app from boostrap dir
import App from './App.vue';
import { createApiConfig } from '@vnuge/vnlib.browser';
import { createToaster } from '@vnuge/vnlib.browser/vue';
import Notifications, { notify } from '@kyvg/vue3-notification';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Axios from 'axios';

//Import all styles
import './assets/main.css';

//Load the suneditor editor css
import 'suneditor/dist/css/suneditor.min.css';

//Import font data
import '@fontsource/source-sans-pro';

/* FONT AWESOME CONFIG */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
    faBars,
    faLock,
    faBullhorn,
    faCertificate,
    faCheck,
    faChevronLeft,
    faChevronRight,
    faCode,
    faComment,
    faCopy,
    faFile,
    faFileDownload,
    faFileZipper,
    faFolderOpen,
    faHeadphones,
    faImage,
    faKey,
    faLink,
    faMinusCircle,
    faPencil,
    faPhotoFilm,
    faPlus,
    faRotateLeft,
    faSignInAlt,
    faSpinner,
    faSync,
    faTrash,
    faUser,
    faVideo,
    faTrashCan,
    faEllipsisH,
    faBook,
    faCog,
    faSignOutAlt,
    faGlobe,
    faEye,
    faClock,
    faBolt,
    faEdit,
    faChartLine,
    faPaperPlane,
    faPlusCircle,
    faUpload,
    faInfoCircle,
    faBlog,
    faMicrophone,
    faCalendar,
    faArrowLeft,
    faRss,
    faSave,
    faRefresh,
    faBolt as faLightningBolt,
    faFileAlt,
    faQuestionCircle,
    faTimes,
    faThumbTack,
    faThumbTackSlash,
    faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub, faDiscord, faMarkdown } from '@fortawesome/free-brands-svg-icons';

//Add required icons for the app
library.add(
    faTrashCan,
    faBars,
    faLock,
    faSignInAlt,
    faGithub,
    faDiscord,
    faSpinner,
    faCertificate,
    faKey,
    faSync,
    faPlus,
    faMinusCircle,
    faUser,
    faCheck,
    faTrash,
    faCopy,
    faPencil,
    faLink,
    faPhotoFilm,
    faRotateLeft,
    faMarkdown,
    faBullhorn,
    faFolderOpen,
    faComment,
    faChevronLeft,
    faChevronRight,
    faFileDownload,
    faCode,
    faFile,
    faVideo,
    faImage,
    faHeadphones,
    faFileZipper,
    faEllipsisH,
    faBook,
    faCog,
    faSignOutAlt,
    faGlobe,
    faEye,
    faClock,
    faBolt,
    faEdit,
    faChartLine,
    faPaperPlane,
    faPlusCircle,
    faUpload,
    faInfoCircle,
    faBlog,
    faMicrophone,
    faCalendar,
    faArrowLeft,
    faRss,
    faSave,
    faRefresh,
    faLightningBolt,
    faFileAlt,
    faQuestionCircle,
    faTimes,
    faThumbTack,
    faThumbTackSlash,
    faFolder
);

//Add icons to library
import router from './router';

//Import nav components
import Dialog from './components/Dialog.vue';

import { profilePlugin } from './store/userProfilePlugin';
import { mfaSettingsPlugin } from './store/mfaSettingsPlugin';
import { pageGuardPlugin } from './store/routeGuard';
import { accountStatePlugin } from './store/accountStatePlugin';
import { userPreferencesPlugin } from './store/preferencesPlugin';
import { useCmnextAdmin } from './lib/blog';

export const vnlib = createApiConfig({
    account: {
        endpointUrl: '/api/account',
    },
    axios: Axios.create({
        withCredentials: true,
    }),
    session: {},
    // storage auto-detected: uses wrapped localStorage in browser/jsdom
});

const createToastAdapter = (id: string) => {
    return createToaster({
        show: (type, { title, message }) => notify({ type, id, text: message, title }),
        close: () => notify.close(id),
    });
};

// Export toaster for application-wide use
export const toaster = createToastAdapter('general');

// Setup CMNext Admin blog state
export const cmnext = useCmnextAdmin(vnlib, '/api/blog');

const store = createPinia();

store
    .use(accountStatePlugin(vnlib, 15000))
    .use(pageGuardPlugin(router))
    .use(profilePlugin(vnlib))
    .use(mfaSettingsPlugin(vnlib))
    .use(userPreferencesPlugin(vnlib, '/api/app-data', 'cmnext-preferences'));

const app = createApp(App);

app.use(Notifications)
    .use(store)
    .use(router)
    .component('Dialog', Dialog)
    //Add the footer nav components
    .component('fa-icon', FontAwesomeIcon)

    //MOUNT
    .mount('#app');
