<script setup lang="ts">
import { toRefs, defineAsyncComponent } from 'vue';
import { IMfaFlow, apiCall, useMessage, useWait } from '@vnuge/vnlib.browser';
import { toSafeInteger } from 'lodash-es';
const VOtpInput = defineAsyncComponent(() => import('vue3-otp-input'))

const emit = defineEmits(['clear', 'back'])
const props = defineProps<{ upgrade: IMfaFlow }>()

const { upgrade } = toRefs(props)
const { waiting } = useWait();
const { onInput } = useMessage();

const SubimitTotp = (code : string) => {
    
    //If a request is still pending, do nothing
    if (waiting.value) {
        return
    }

    apiCall(async ({ toaster }) => {
         //Submit totp code
        const res = await upgrade.value.submit({ code: toSafeInteger(code) })
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
    <div id="totp-login-form">
        <h5 class="text-center">Enter your TOTP code</h5>
        <div class="flex flex-col h-32">
            <div class="h-8 mx-auto">
                <fa-icon v-if="waiting" class="animate-spin" size="xl" icon="spinner"/>
            </div>
            <div class="mx-auto mt-4">
                <VOtpInput
                    class="otp-input"
                    input-type="letter-numeric"
                    :is-disabled="waiting"
                    separator=""
                    input-classes="input input-bordered"
                    :num-inputs="6"
                    value=""
                    @on-change="onInput"
                    @on-complete="SubimitTotp"
                />
            </div>
        </div>
        <div class="mt-4 w-fit mx-auto">
            <button @click="emit('back')" class="mt-3">
                <div class="flex flex-row items-center justify-center gap-2">
                    <fa-icon icon="arrow-left" />
                    <span>Back</span>
                </div>
            </button>
        </div>
    </div>
</template>
