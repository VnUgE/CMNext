
import 'pinia'
import { MaybeRef } from 'vue';
import { useSocialOauthLogin, useUser, SocialOAuthPortal, fromPortals, useAxios } from '@vnuge/vnlib.browser'
import { get } from '@vueuse/core';
import { PiniaPluginContext, PiniaPlugin, storeToRefs } from 'pinia'
import { defer } from 'lodash-es';

type SocialMfaPlugin = ReturnType<typeof useSocialOauthLogin>

declare module 'pinia' {
    export interface PiniaCustomProperties {
        socialOauth(): Promise<SocialMfaPlugin>
    }
}

export const socialMfaPlugin = (portalEndpoint?: MaybeRef<string>): PiniaPlugin => {

    return ({ store }: PiniaPluginContext) => {

        const { } = storeToRefs(store)
        const { logout } = useUser()

        /**
         * Override the logout function to default to a social logout,
         * if the social logout fails, then we will logout the user
         */
        const setLogoutMethod = (socialOauth: SocialMfaPlugin) => {
            const logoutFunc = socialOauth.logout;

            (socialOauth as any).logout = async () => {
                if (await logoutFunc() === false) {
                    await logout()
                }
            }
        }

        const _loadPromise = new Promise<SocialMfaPlugin>((resolve, _) => {

            if (get(portalEndpoint) == null) {
                const socialOauth = useSocialOauthLogin([])
                setLogoutMethod(socialOauth)
                return resolve(socialOauth)
            }

            /*
            Try to load social methods from server, if it fails, then we will 
            fall back to default
             */

            defer(async () => {

                let portals: SocialOAuthPortal[] = []

                try {
                    //Get axios instance
                    const axios = useAxios(null)

                    //Get all enabled portals
                    const { data, headers } = await axios.get<SocialOAuthPortal[]>(get(portalEndpoint)!);
                    
                    if(headers['content-type'] === 'application/json') {
                        portals = data
                    }

                } catch (error) {
                    //Let failure fall back to default
                }

                //Create social login from available portals
                const socialOauth = useSocialOauthLogin(fromPortals(portals));
                setLogoutMethod(socialOauth);
                resolve(socialOauth)
            })
        })

        const socialOauth = () => _loadPromise

        return {
            socialOauth,
        }
    }
}