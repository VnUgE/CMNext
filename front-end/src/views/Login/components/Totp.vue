<script setup lang="ts">
import { MfaFlow, totpSubmitCode } from '@vnuge/vnlib.browser';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { toSafeInteger } from 'lodash-es';
import { toaster } from '../../../main';
import VOtpInput from 'vue3-otp-input';

const emit = defineEmits(['clear', 'back']);
const props = defineProps<{ upgrade: MfaFlow<'totp'> }>();

const { invoke: apiCall, waiting } = useApiCall({ toaster });

const SubimitTotp = (code: string) => {

    //If a request is still pending, do nothing
    if (waiting.value) return;

    apiCall(async () => {
        //Submit totp code
        const res = await totpSubmitCode(props.upgrade, { code: toSafeInteger(code) });
        res.getResultOrThrow();

        emit('clear');

        // Push a new toast message
        toaster.success('You have been logged in');
    });
};

</script>

<template>
    <div id="totp-login-form">
        <h5 class="text-center">Enter your TOTP code</h5>
        <div class="flex flex-col h-32">
            <div class="h-8 mx-auto">
                <span v-if="waiting" class="loading loading-spinner loading-lg" />
            </div>
            <div class="mx-auto mt-4">
                <VOtpInput
                    class="otp-input" input-type="letter-numeric" :is-disabled="waiting" separator=""
                    input-classes="input input-bordered" :num-inputs="6" value="" @on-complete="SubimitTotp"
                />
            </div>
        </div>
        <div class="mt-4 w-fit mx-auto">
            <button class="mt-3" @click="emit('back')">
                <div class="flex flex-row items-center justify-center gap-2">
                    <fa-icon icon="arrow-left" />
                    <span>Back</span>
                </div>
            </button>
        </div>
    </div>
</template>
