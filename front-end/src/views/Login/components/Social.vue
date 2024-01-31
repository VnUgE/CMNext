<script setup lang="ts">
import { shallowRef } from 'vue'
import { apiCall, useWait, type OAuthMethod } from '@vnuge/vnlib.browser'
import { capitalize } from 'lodash-es';
import { useStore } from '../../../store';

const { waiting } = useWait()
const store = useStore()

const methods = shallowRef<OAuthMethod[]>([])

//Invoke login wrapped in api call
const submitLogin = (method: OAuthMethod) => apiCall(async () => {
    const { beginLoginFlow } = await store.socialOauth();
    await beginLoginFlow(method)
})

const getIcon = (method: OAuthMethod): string[] => {
    switch (method.Id) {
        case 'auth0':
            return ['fa', 'certificate']
        default:
            return ['fab', method.Id]
    }
}

//Load methods once the fetch completes
store.socialOauth().then(m => methods.value = m.methods);

</script>

<template>

    <div class="flex flex-col gap-3">
        <div v-for="method in methods" :key="method.Id" class="">
            <button 
            type="submit" 
            class="btn social-button" 
            :disabled="waiting" 
            @click.prevent="submitLogin(method)"
            >
                <fa-icon :icon="getIcon(method)" size="xl" />
                Login with {{ capitalize(method.Id) }}
            </button>
        </div>
    </div>

</template>
