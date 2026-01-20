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

    <hr v-show="methods.length > 0" class="my-6 border-base-content" />

    <ul v-for="method in enabledMethods" :key="method.method_id" class="">
        <li class="my-2">
            <button type="submit" class="btn flex flex-row w-full" :disabled="waiting"
                @click.prevent="submitLogin(method)">

                <img v-if="method.data.icon_url" :src="method.data.icon_url" class="w-6 h-6" />

                {{ method.data.friendly_name }}
            </button>
        </li>
    </ul>

    <div v-if="errorMethods.length" class="collapse collapse-arrow border border-base-300 rounded-lg mt-4">
        <input type="checkbox" />
        <div class="collapse-title font-medium text-sm">
            Failed to load {{ errorMethods.length }} method(s)
        </div>
        <div class="collapse-content">
            <ul class="space-y-2">
                <li v-for="method in errorMethods" :key="method.method_id" class="text-sm p-2 bg-base-200 rounded">
                    <div class="font-semibold text-base-content">{{ method.data.friendly_name }}</div>
                    <div class="text-error text-xs mt-2 font-medium">
                        {{ method.data.error }}
                    </div>
                </li>
            </ul>
        </div>
    </div>

</template>
