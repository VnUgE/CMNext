import 'pinia'
import { MaybeRef, computed, ref, shallowRef, watch } from 'vue';
import { apiCall, useAxios } from '@vnuge/vnlib.browser';
import { get, set, useToggle } from '@vueuse/core';
import { PiniaPlugin, PiniaPluginContext, storeToRefs } from 'pinia'
import { map, sortBy, isArray } from 'lodash-es';
import { storeExport } from '.';

export interface OAuth2Application {
    readonly Id: string,
    readonly name: string,
    readonly description: string,
    readonly permissions: string[],
    readonly client_id: string,
    Created: Date,
    readonly LastModified: Date,
}

export interface NewAppResponse {
    readonly secret: string
    readonly app: OAuth2Application
}

export interface Oauth2Store{
    oauth2: {
        apps: OAuth2Application[],
        scopes: string[],
        getApps(): Promise<OAuth2Application[]>
        createApp(app: OAuth2Application): Promise<NewAppResponse>
        updateAppSecret(app: OAuth2Application, password: string): Promise<string>
        updateAppMeta(app: OAuth2Application): Promise<void>
        deleteApp(app: OAuth2Application, password: string): Promise<void>
        refresh(): void
    }
}

declare module 'pinia' {
    export interface PiniaCustomProperties extends Oauth2Store{
      
    }
}

export const oauth2AppsPlugin = (o2EndpointUrl: MaybeRef<string>, scopeEndpoint: MaybeRef<string>): PiniaPlugin =>{

    return ({ store }: PiniaPluginContext): Oauth2Store => {

        const axios = useAxios(null);
        const { loggedIn } = storeToRefs(store)

        const [onRefresh, refresh] = useToggle()

        const _oauth2Apps = shallowRef<OAuth2Application[]>([])
        const scopes = ref<string[]>([])

        /**
        * Updates an Oauth2 application's metadata
        */
        const updateAppMeta = async (app: OAuth2Application): Promise<void> => {
            //Update the app metadata
            await axios.put(get(o2EndpointUrl), app)
        }

        /**
         * Gets all of the user's oauth2 applications from the server
         * @returns The user's oauth2 applications
         */
        const getApps = async () => {
            // Get all apps
            const { data } = await axios.get<OAuth2Application[]>(get(o2EndpointUrl));

            if(!isArray(data)){
                throw new Error("Invalid response from server")
            }

            return map(data, (appData) => {
                //Store the created time as a date object
                appData.Created = new Date(appData?.Created ?? 0)
                //create a new state manager for the user's profile
                return appData;
            })
        }

        /**
         * Creates a new application from the given data
         * @param param0 The application server buffer
         * @returns The newly created application
         */
        const createApp = async ({ name, description, permissions }: OAuth2Application): Promise<NewAppResponse> => {

            // make the post request, response is the new app data with a secret
            const { data } = await axios.post<OAuth2Application & { raw_secret: string }>(`${get(o2EndpointUrl)}?action=create`, { name, description, permissions })

            // Store secret
            const secret = data.raw_secret

            // remove secre tfrom the response
            delete (data as any).raw_secret

            return { secret, app: data }
        }

        /**
         * Requets a new secret for an application from the server
         * @param app The app to request a new secret for
         * @param password The user's password
         * @returns The new secret
         */
        const updateAppSecret = async (app: OAuth2Application, password: string): Promise<string> => {
            const { data } = await axios.post(`${o2EndpointUrl}?action=secret`, { Id: app.Id, password })
            return data.raw_secret
        }

        /**
         * Deletes an application from the server
         * @param app The application to delete
         * @param password The user's password
         * @returns The response from the server
         */
        const deleteApp = async ({ Id }: OAuth2Application, password: string): Promise<void> => {
            await axios.post(`${o2EndpointUrl}?action=delete`, { password, Id });
        }

        const apps = computed(() => sortBy(_oauth2Apps.value, a => a.Created))

        watch([loggedIn, onRefresh], async ([li]) => {
            if (!li){
                set(_oauth2Apps, [])
                return; 
            }

            //Load the user's oauth2 apps
            apiCall(async () => {
                _oauth2Apps.value = await getApps()

                //Load the oauth2 scopes
                const { data } = await axios.get<string[]>(get(scopeEndpoint))
                set(scopes, data)
            })
        })

        return storeExport({
            oauth2:{
                apps,
                scopes,
                getApps,
                createApp,
                updateAppMeta,
                updateAppSecret,
                deleteApp,
                refresh
            }
        })
    }
}