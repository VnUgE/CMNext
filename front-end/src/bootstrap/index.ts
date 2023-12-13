import App from '../App.vue'
import Notifications, { notify } from '@kyvg/vue3-notification'
import { configureNotifier } from '@vnuge/vnlib.browser'
import { CreateAppFunction, createApp as vueCreateApp } from "vue";
import { useDark } from "@vueuse/core";
import { createPinia, type Pinia } from "pinia";

//Font awesome support
import { Library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faBars, faLightbulb, faTimes } from '@fortawesome/free-solid-svg-icons'

export interface AppConfig {
    /**
     * Enables dark mode support
     */
    useDarkMode?: boolean;

    /**
     * The element to mount the app to
     */
    mountElement: string | Element;

    /**
     * library instance for adding required icons
     */
    faLibrary: Library;

    /**
     * Called when the app is created for you to add custom elements 
     * and configure the app
     * @param app The app instance
     * @param store The pinia store instance
     */
    onCreate(app: any, piniaStore: Pinia): void;

    /**
     * Allows the user to override the createApp function
     * @param app The app instance
     * @returns The app instance
     */
    createApp?: CreateAppFunction<Element>
}

/**
 * Creates a new vn-minimal vuejs web-app with the given configuration
 * @param config The configuration for the app
 * @returns The app instance
 */
export const createVnApp = (config: AppConfig) => {
    
    const store = createPinia();

    //Allow the user to override the createApp function
    config.createApp ??= vueCreateApp;

    //Enable dark mode support
    if (config.useDarkMode) {
        useDark({
            selector: 'html',
            valueDark: 'dark',
            valueLight: 'light',
        });
    }

    //Add required icons to library
    config.faLibrary.add(faBars, faLightbulb, faTimes);

    //create the vue app
    const app = config.createApp(App)
    
    app.use(Notifications)  //Add the notification component to the app
        .use(store)         //Add pinia to the app
        .component('fa-icon', FontAwesomeIcon) //Add the font awesome icon component to the app

    //Call the onCreate callback
    config.onCreate(app, store);

    //Mount the app
    app.mount(config.mountElement);

    //Configure notification handler
    configureNotifier({ notify, close: notify.close });

    return app;
}