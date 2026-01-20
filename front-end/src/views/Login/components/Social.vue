<script setup lang="ts">
import { useOauthLogin, type SocialOAuthMethod } from '@vnuge/vnlib.browser';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useStore } from '../../../store';
import { get, useArrayFilter } from '@vueuse/core';
import { computed } from 'vue';
import { toaster, vnlib } from '../../../main';

const store = useStore()

const { getPortals, beginLoginFlow } = useOauthLogin(vnlib)
const { invoke: apiCall, waiting } = useApiCall({ toaster })

const methods = computed(() => {
    const data = get(store.account.data);
    return data?.properties ? getPortals(data) : []
})

const enabledMethods = useArrayFilter(methods, m => m.data.enabled)
const errorMethods = useArrayFilter(methods, m => m.data.error)

//Invoke login wrapped in api call
const submitLogin = (method: SocialOAuthMethod) => apiCall(async () => {
    await beginLoginFlow({ method, autoRedirect: true })
})

</script>

<template>

    <ul v-for="method in enabledMethods" :key="method.method_id" class="">
        <li class="my-2">
            <button type="submit" class="btn flex flex-row w-full" :disabled="waiting"
                @click.prevent="submitLogin(method)">

                <img v-if="method.data.icon_url" :src="method.data.icon_url" class="w-6 h-6" />

                {{ method.data.friendly_name }}
            </button>
        </li>
    </ul>

</template>
