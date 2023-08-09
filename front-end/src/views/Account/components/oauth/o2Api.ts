import { forEach } from 'lodash-es'
import { Ref } from 'vue'
import useVuelidate from '@vuelidate/core'
import { maxLength, helpers, required } from '@vuelidate/validators'
import { useAxios, useDataBuffer, useVuelidateWrapper } from '@vnuge/vnlib.browser'
import { AxiosResponse } from 'axios'

export interface OAuth2Application{
    readonly Id: string,
    readonly name: string,
    readonly description: string,
    readonly permissions: string[],
    readonly client_id: string,
    readonly Created: Date,
    readonly LastModified: Date,
}

export interface NewAppResponse {
    readonly secret: string
    readonly app: AppBuffer<OAuth2Application>
}

export interface AppBuffer<T>{
    readonly data: T,
    buffer: T
    readonly modified: Readonly<Ref<boolean>>
    apply: (data: T) => void
    revert(): void
}

/**
 * Initializes the oauth2 applications api
 * @param o2EndpointUrl The url of the oauth2 applications endpoint
 * @returns The oauth2 applications api
 */
export const useOAuth2Apps = (o2EndpointUrl : string) => {
    const { post, get, put } = useAxios(null);

    /**
     * Gets all of the user's oauth2 applications from the server
     * @returns The user's oauth2 applications
     */
    const getApps = async (): Promise<AppBuffer<OAuth2Application>[]>=> {
        // Get all apps
        const { data } = await get(o2EndpointUrl);

        const apps: AppBuffer<OAuth2Application>[] = []

        //Loop through the apps and create a new state manager for each
        forEach(data, (appData) => {

            //Store the created time as a date object
            appData.created = new Date(appData?.Created ?? 0)
            
            //create a new state manager for the user's profile
            const app: AppBuffer<OAuth2Application> = useDataBuffer(appData)

            apps.push(app)
        })

        return apps
    }

    /**
     * Creates a new application from the given data
     * @param param0 The application server buffer
     * @returns The newly created application
     */
    const createApp = async ({ name, description, permissions } : OAuth2Application): Promise<NewAppResponse> => {
        
        // make the post request, response is the new app data with a secret
        const { data } = await post(`${o2EndpointUrl}?action=create`, { name, description, permissions })

        // Store secret
        const secret = data.raw_secret

        // remove secre tfrom the response
        delete data.raw_secret

        return { secret, app: useDataBuffer(data) }
    }

    /**
     * Updates an Oauth2 application's metadata
     */
    const updateAppMeta = async (app: AppBuffer<OAuth2Application>): Promise<void> => {

        //Update the app metadata
        await put(o2EndpointUrl, app.buffer)

        //Get the app data from the server to update the local copy
        const response = await get(`${o2EndpointUrl}?Id=${app.data.Id}`)

        //Update the app
        app.apply(response.data)
    }

    /**
     * Requets a new secret for an application from the server
     * @param app The app to request a new secret for
     * @param password The user's password
     * @returns The new secret
     */
    const updateAppSecret = async (app: AppBuffer<OAuth2Application>, password: string): Promise<string> => {
        const response = await post(`${o2EndpointUrl}?action=secret`, { Id: app.data.Id, password })
        return response.data.raw_secret
    }

    /**
     * Deletes an application from the server
     * @param app The application to delete
     * @param password The user's password
     * @returns The response from the server
     */
    const deleteApp = (app: AppBuffer<OAuth2Application>, password: string): Promise<AxiosResponse> => {
        return post(`${o2EndpointUrl}?action=delete`, { password, Id: app.data.Id });
    }

    return { getApps, createApp, updateAppMeta, updateAppSecret, deleteApp }
}


//Custom alpha numeric regex
const alphaNumRegex = helpers.regex(/^[a-zA-Z0-9_,\s]*$/)

const rules = {
    name: {
        alphaNumSpace: helpers.withMessage("Name contains invalid characters", alphaNumRegex),
        maxLength: helpers.withMessage('App name must be less than 50 characters', maxLength(50)),
        required: helpers.withMessage('Oauth Application name is required', required)
    },
    description: {
        alphaNumSpace: helpers.withMessage("Description contains invalid characters", alphaNumRegex),
        maxLength: helpers.withMessage('Description must be less than 50 characters', maxLength(50))
    },
    permissions: {
        alphaNumSpace: helpers.regex(/^[a-zA-Z0-9_,:\s]*$/),
        maxLength: helpers.withMessage('Permissions must be less than 64 characters', maxLength(64))
    }
}

export interface AppValidator {
    readonly v$: ReturnType<typeof useVuelidate>
    readonly validate: () => Promise<boolean>
    readonly reset: () => void
}

/**
 * Gets the validator for the given application (or new appication) buffer
 * @param buffer The app buffer to validate
 * @returns The validator instance, validate function, and reset function
 */
export const getAppValidator = <T>(buffer: T) : AppValidator => {
    //App validator
    const v$ = useVuelidate(rules, buffer, { $lazy: true, $autoDirty: true })
    //validate wrapper function
    const { validate } = useVuelidateWrapper(v$);
    return { v$, validate, reset: v$.value.$reset };
}

export const getAppPermissions = () =>{
    return [
        {
            type: 'account:read',
            label: 'Account Read'
        },
        {
            type: 'account:write',
            label: 'Account Write'
        },
        {
            type: 'email:send',
            label: 'Send Emails'
        }
    ]
}