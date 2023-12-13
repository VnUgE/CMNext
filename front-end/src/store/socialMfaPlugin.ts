
import 'pinia'
import {  } from 'vue';
import { useSocialOauthLogin, createSocialMethod, useUser } from '@vnuge/vnlib.browser'
import {  } from '@vueuse/core';
import { PiniaPluginContext, PiniaPlugin, storeToRefs } from 'pinia'
import {  } from 'lodash-es';

declare module 'pinia' {
    export interface PiniaCustomProperties {
        socialOauth: ReturnType<typeof useSocialOauthLogin>
    }
}

export const socialMfaPlugin: PiniaPlugin = ({ store }: PiniaPluginContext) => {

    const { } = storeToRefs(store)
    const { logout } = useUser()

    //Setup social providers
    const socialOauth = useSocialOauthLogin([
        //createSocialMethod('github', '/login/social/github'),
        //createSocialMethod('discord', '/login/social/discord'),
    ])

    /**
     * Override the logout function to default to a social logout,
     * if the social logout fails, then we will logout the user
     */

    const logoutFunc = socialOauth.logout;

    (socialOauth as any).logout = async () => {
        if (await logoutFunc() === false) {
            await logout()
        }
    }

    return {
        socialOauth
    }
}