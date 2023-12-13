import 'pinia'
import { MaybeRef, shallowRef, watch } from 'vue';
import { MfaMethod, PkiPublicKey, apiCall, useMfaConfig, usePkiConfig, usePkiAuth } from '@vnuge/vnlib.browser';
import { useToggle, get } from '@vueuse/core';
import { PiniaPluginContext, PiniaPlugin, storeToRefs } from 'pinia'
import { includes } from 'lodash-es';

declare module 'pinia' {
    export interface PiniaCustomProperties {
        mfaEndabledMethods: MfaMethod[]
        mfaConfig: ReturnType<typeof useMfaConfig>
        pkiConfig: ReturnType<typeof usePkiConfig>
        pkiAuth: ReturnType<typeof usePkiAuth>
        pkiPublicKeys: PkiPublicKey[]
        mfaRefreshMethods: () => void
    }
}

export const mfaSettingsPlugin = (mfaEndpoint: MaybeRef<string>, pkiEndpoint?:MaybeRef<string>): PiniaPlugin => {

    return ({ store }: PiniaPluginContext) => {

        const { loggedIn } = storeToRefs(store)
        const mfaConfig = useMfaConfig(mfaEndpoint)
        const pkiConfig = usePkiConfig(pkiEndpoint || '/')
        const pkiAuth = usePkiAuth(pkiEndpoint || '/')
        const [onRefresh, mfaRefreshMethods] = useToggle()

        const mfaEndabledMethods = shallowRef<MfaMethod[]>([])
        const pkiPublicKeys = shallowRef<PkiPublicKey[]>([])

        watch([loggedIn, onRefresh], ([ li ]) => {
            if(!li){
                mfaEndabledMethods.value = []
                return
            }

            //load the mfa methods if the user is logged in
            apiCall(async () => mfaEndabledMethods.value = await mfaConfig.getMethods())
        })

        //Watch for changes to mfa methods (refresh) and update the pki keys
        watch([mfaEndabledMethods], ([ methods ]) => {
            if(!includes(methods, 'pki' as MfaMethod) || !get(pkiEndpoint)){
                pkiPublicKeys.value = []
                return
            }

            //load the pki keys if pki is enabled
            apiCall(async () => pkiPublicKeys.value = await pkiConfig.getAllKeys())
        })

        return{
            mfaRefreshMethods,
            mfaEndabledMethods,
            mfaConfig,
            pkiConfig,
            pkiAuth,
            pkiPublicKeys
        }
    }
}