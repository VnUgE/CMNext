<script setup lang="ts">
import { apiCall, useOauthLogin, useWait, type SocialOAuthMethod } from '@vnuge/vnlib.browser'
import { useStore } from '../../../store';
import { get, useArrayFilter } from '@vueuse/core';
import { computed } from 'vue';

const store = useStore()
const { waiting } = useWait()

const { getPortals, beginLoginFlow } = useOauthLogin()
const methods = computed(() => {
    const data = get(store.account.data);
    return data?.properties ? getPortals(data) : []
})

const enabledMethods = useArrayFilter(methods, m => m.data.enabled)

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
