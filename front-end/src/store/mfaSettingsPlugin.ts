import 'pinia'
import { MaybeRef, ref, shallowRef, watch } from 'vue';
import { MfaMethod, PkiPublicKey, apiCall, useMfaConfig, usePkiConfig, usePkiAuth, MfaApi } from '@vnuge/vnlib.browser';
import { useToggle, get, set } from '@vueuse/core';
import { PiniaPluginContext, PiniaPlugin, storeToRefs } from 'pinia'
import { includes } from 'lodash-es';
import { storeExport, } from './index';

interface PkiStore {
    publicKeys: PkiPublicKey[]
    pkiConfig: ReturnType<typeof usePkiConfig>
    pkiAuth: ReturnType<typeof usePkiAuth>
    refresh: () => void
}

export interface MfaSettingsStore{
    mfa:{
        enabledMethods: MfaMethod[]
        refresh: () => void
    } & MfaApi
    pki?: PkiStore
}

declare module 'pinia' {
    export interface PiniaCustomProperties extends MfaSettingsStore {
       
    }
}

export const mfaSettingsPlugin = (mfaEndpoint: MaybeRef<string>, pkiEndpoint?:MaybeRef<string>): PiniaPlugin => {

    return ({ store }: PiniaPluginContext): MfaSettingsStore => {

        const { loggedIn } = storeToRefs(store)
        const mfaConfig = useMfaConfig(mfaEndpoint)
       
        const [onRefresh, refresh] = useToggle()

        const enabledMethods = ref<MfaMethod[]>([])

        const usePki = () => {

            const publicKeys = shallowRef<PkiPublicKey[]>([])

            const pkiConfig = usePkiConfig(pkiEndpoint || '/')
            const pkiAuth = usePkiAuth(pkiEndpoint || '/')

            //Watch for changes to mfa methods (refresh) and update the pki keys
            watch([enabledMethods], ([methods]) => {
                if (!includes(methods, 'pki' as MfaMethod) || !get(pkiEndpoint)) {
                    set(publicKeys, [])
                    return
                }

                //load the pki keys if pki is enabled
                apiCall(async () => publicKeys.value = await pkiConfig.getAllKeys())
            })

            return{
                publicKeys,
                pkiConfig,
                pkiAuth,
                refresh
            } 
        }

        watch([loggedIn, onRefresh], ([ li ]) => {
            if(!li){
                set(enabledMethods, [])
                return
            }

            //load the mfa methods if the user is logged in
            apiCall(async () => enabledMethods.value = await mfaConfig.getMethods())
        })

        //Only return the pki store if pki is enabled
        if(get(pkiEndpoint)){
            return storeExport({
                mfa:{
                    enabledMethods,
                    refresh,
                    ...mfaConfig
                },
                pki: usePki()
            })   
        }
        else{
            return storeExport({
                mfa:{
                    enabledMethods,
                    refresh,
                    ...mfaConfig
                },
            })
        
        }
    }
}