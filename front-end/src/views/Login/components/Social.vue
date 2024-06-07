<script setup lang="ts">
import { apiCall, useWait, type OAuthMethod } from '@vnuge/vnlib.browser'
import { capitalize, map } from 'lodash-es';
import { useStore } from '../../../store';
import { useAsyncState } from '@vueuse/core';
import { shallowRef } from 'vue';
import { Mutable } from '@vueuse/core';

const { waiting } = useWait()
const store = useStore()
const buttonCont = shallowRef<HTMLDivElement | null>(null)

const filterSvgIcon = (oauth: OAuthMethod[]) => {
    return map(oauth, (method: Mutable<OAuthMethod>) => {
        //parse the base64 icon as an svg
        if (method.icon) {
            return{
                ...method,
                icon: atob(method.icon).replace(/(width|height)="[^"]*"/g, '')
            }
        }
        return method;
    })
}

const { state: methods, isReady } = useAsyncState(store.socialOauth().then(p => filterSvgIcon(p.methods)), []);

//Invoke login wrapped in api call
const submitLogin = (method: OAuthMethod) => apiCall(async () => {
    const { beginLoginFlow } = await store.socialOauth();
    await beginLoginFlow(method)
})

</script>

<template>

    <div ref="buttonCont" v-if="isReady" class="flex flex-col gap-3">
        <div v-for="method in methods" :key="method.id" class="">
            <button type="submit" class="btn social-button" :disabled="waiting" @click.prevent="submitLogin(method)">

                <div v-html="method.icon" class="w-6 h-6" >
                </div>

                Login with {{ capitalize(method.id) }}
            </button>
        </div>
    </div>

    <div v-else class="my-8">
        <fa-icon icon="spinner" size="2xl" spin />
    </div>

</template>
