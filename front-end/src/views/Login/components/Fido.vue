<script setup lang="ts">
import { toRefs } from 'vue';
import { apiCall, useWait, type IMfaFlow, type IFidoMfaFlow, useFidoApi } from '@vnuge/vnlib.browser';
import { get } from '@vueuse/core';

const emit = defineEmits(['clear', 'back'])
const props = defineProps<{ upgrade: IMfaFlow }>()

const { upgrade } = toRefs(props)
const { waiting } = useWait();
const { isSupported } = useFidoApi()

const authenticateFido = () => {
    
    //If a request is still pending, do nothing
    if (waiting.value) {
        return
    }

    apiCall(async ({ toaster }) => {

        const { authenticate } = get(upgrade) as IFidoMfaFlow

         //Submit totp code
        const res = await authenticate(false);
        res.getResultOrThrow()

        emit('clear')
        
        // Push a new toast message
        toaster.general.success({
            title: 'Success',
            text: 'You have been logged in',
        })
    })
}

</script>

<template>
    <div id="fido-login-form" class="py-6">
        <div class="">
            <button :disabled="!isSupported()" class="btn w-full btn-primary" @click="authenticateFido()">
                <!-- Display spinner if waiting, otherwise the sign-in icon -->
                <fa-icon :class="{ 'animate-spin': waiting }" :icon="waiting ? 'spinner' : ''" />
                <span class="text-base">
                    Complete Login
                </span>
            </button>
        </div>
        <div class="mt-3 w-fit mx-auto">
            <button @click="emit('back')" class="mt-3">
                <div class="flex flex-row items-center justify-center gap-2">
                    <fa-icon icon="arrow-left" />
                    <span>Back</span>
                </div>
            </button>
        </div>
    </div>
</template>
