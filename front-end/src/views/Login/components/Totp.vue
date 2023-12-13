<template>
    <div id="totp-login-form">
        <h5>Enter your TOTP code</h5>
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
                    input-classes="primary input rounded"
                    :num-inputs="6"
                    value=""
                    @on-change="onInput"
                    @on-complete="SubimitTotp"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { toRefs, defineAsyncComponent } from 'vue';
import { IMfaFlowContinuiation, apiCall, useMessage, useWait } from '@vnuge/vnlib.browser';
import { toSafeInteger } from 'lodash-es';
const VOtpInput = defineAsyncComponent(() => import('vue3-otp-input'))

const emit = defineEmits(['clear'])

const props = defineProps<{
    upgrade: IMfaFlowContinuiation
}>()

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

<style lang="scss">

#totp-login-form {
   .otp-input {
        @apply rounded-sm gap-2;

        input {
            @apply w-12 h-12 p-3 text-center text-2xl;
            appearance: none;
            -webkit-appearance: none;
        }
    }
}

</style>