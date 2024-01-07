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

        const _loadPromise = new Promise<SocialMfaPlugin>((resolve, reject) => {

            if(get(portalEndpoint) == null) {
                const socialOauth = useSocialOauthLogin([])
                setLogoutMethod(socialOauth)
                return resolve(socialOauth)
            }

            defer(async () => {
                try {
                    //Get axios instance
                    const axios = useAxios(null)

                    //Get all enabled portals
                    const { data } = await axios.get<SocialOAuthPortal[]>(get(portalEndpoint));
                    //Setup social providers from server portals
                    const socialOauth = useSocialOauthLogin(fromPortals(data));
                    setLogoutMethod(socialOauth);

                    resolve(socialOauth)

                } catch (error) {
                    reject(error)
                }
            })
        })

        const socialOauth = () => _loadPromise

        return {
            socialOauth,
        }
    }
}