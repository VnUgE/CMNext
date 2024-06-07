import 'pinia'
import { useAutoHeartbeat } from '@vnuge/vnlib.browser';
import { toRefs, useLocalStorage } from '@vueuse/core';
import { PiniaPluginContext, PiniaPlugin } from 'pinia'
import { defaults } from 'lodash-es';

declare module 'pinia' {
    export interface PiniaCustomProperties {
        autoHeartbeat: boolean;
    }
}

export const globalStatePlugin: PiniaPlugin = ({ store }: PiniaPluginContext) =>{

    //Get shared global state storage
    const mainState = useLocalStorage("vn-state", { ahEnabled: false });
    
    //Set defaults to avoid undefined errors from toRefs
    defaults(mainState.value, { ahEnabled: false })
    
    const { ahEnabled } = toRefs(mainState)

    //Setup heartbeat for 5 minutes
    useAutoHeartbeat(5 * 60 * 1000, ahEnabled)
    
    return{
        autoHeartbeat: ahEnabled,
    }
}