import App from '../App.vue'
import Notifications, { notify } from '@kyvg/vue3-notification'
import { configureNotifier } from '@vnuge/vnlib.browser'
import { createApp as vueCreateApp, ref } from "vue";
import { useDark } from "@vueuse/core";

//Font awesome support
import { Library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faBars, faLightbulb, faTimes } from '@fortawesome/free-solid-svg-icons'


//Required global state elements for app components
export const headerRoutes = ref<string[]>([]);
export const authRoutes = ref<string[]>([]);
export const siteTitle = ref<string>("");
export const showCookieWarning = ref<boolean>(false);


export interface AppConfig {
    /**
     * Routes to be displayed in the header when the user is not logged in
     */
    headerRoutes: string[];

    /**
     * Routes to be displayed in the header when the user is logged in
     */
    authRoutes: string[];

    /**
     * The title of the site, used in the title bar
     */
    siteTitle: string;

    /**
     * Enables dark mode support
     */
    useDarkMode: boolean;

    /**
     * The element to mount the app to
     */
    mountElement: string;

    /**
     * library instance for adding required icons
     */
    faLibrary: Library;

    /**
     * If true, the cookie warning will not be displayed
     */
    hideCookieWarning?: boolean;

    /**
     * Called when the app is created for you to add custom elements 
     * and configure the app
     * @param app The app instance
     */
    onCreate: (app: any) => void;
}

/**
 * Creates a new vn-minimal vuejs web-app with the given configuration
 * @param config The configuration for the app
 * @returns The app instance
 */
export const createVnApp = (config: AppConfig, createApp?: (app: any) => any) => {
    headerRoutes.value = config.headerRoutes;
    authRoutes.value = config.authRoutes;
    siteTitle.value = config.siteTitle;

    //Allow the user to override the createApp function
    createApp = createApp || vueCreateApp;

    //Enable dark mode support
    if (config.useDarkMode) {
        useDark({
            selector: 'html',
            valueDark: 'dark',
            valueLight: 'light',
        });
    }

    if (!config.hideCookieWarning) {
        //Configure the cookie warning to be displayed cookies are not enabled
        showCookieWarning.value = navigator?.cookieEnabled === false;
    }

    //Add required icons to library
    config.faLibrary.add(faBars, faLightbulb, faTimes);

    //create the vue app
    const app = createApp(App)

    //Add the library to the app
    app.component('fa-icon', FontAwesomeIcon)

    //Add the notification and router to the app
    app.use(Notifications);

    //Call the onCreate callback
    config.onCreate(app);

    //Mount the app
    app.mount(config.mountElement);

    //Configure notification handler
    configureNotifier({ notify, close: notify.close });

    return app;
}