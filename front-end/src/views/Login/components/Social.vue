<template>

    <div class="flex flex-col gap-3">
        <div v-for="method in store.socialOauth.methods" :key="method.Id" class="">
            <button 
            type="submit" 
            class="btn social-button" 
            :disabled="waiting" 
            @click.prevent="submitLogin(method)"
            >
                <fa-icon :icon="['fab', method.Id]" size="xl" />
                Login with {{ capitalize(method.Id) }}
            </button>
        </div>
    </div>

</template>

<script setup lang="ts">
import { apiCall, useWait, type OAuthMethod } from '@vnuge/vnlib.browser'
import { capitalize } from 'lodash-es';
import { useStore } from '../../../store';

const { waiting } = useWait()
const store = useStore()

//Invoke login wrapped in api call
const submitLogin = (method: OAuthMethod) => apiCall(() => store.socialOauth.beginLoginFlow(method))

</script>