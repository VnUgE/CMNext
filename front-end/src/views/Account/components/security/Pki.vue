<script setup lang="ts">
import { isEmpty } from 'lodash-es'
import { useOtpApi, type OtpPublicKey } from '@vnuge/vnlib.browser'
import { useApiCall } from '@vnuge/vnlib.browser/vue'
import { ref } from 'vue'
import { useToggle, set, toRefs, refDefault } from '@vueuse/core'
import { useStore } from '../../../../store'
import { toaster } from '../../../../main'
import { confirm, promptForPassword } from '../../../../lib/confirm'
import * as yup from 'yup'
import type { ValidationError } from 'yup'

const store = useStore()
const apiCall = useApiCall({ toaster })
const { refresh } = store.mfa

const isSupported = store.mfa.isSupported('pkotp')
const pkiConfig = useOtpApi(store.mfa)

const _otpData = store.mfa.getDataFor<{
    keys: OtpPublicKey[],
    can_add_keys: boolean,
    data_size: number,
    max_size: number
}>('pkotp')
const otpData = refDefault(_otpData, { keys: [], can_add_keys: false, data_size: 0, max_size: 0 })
const {
    keys: publicKeys,
    can_add_keys: canAddKeys,
    data_size: dataSize,
    max_size
} = toRefs(otpData)

const [isOpen, toggleOpen] = useToggle()
const keyData = ref('')
const pemFormat = ref(false)
const explicitCurve = ref("")

const onRemoveKey = async (single: OtpPublicKey) => {
    const conf = await confirm({
        title: 'Are you sure?',
        message: `This will remove key ${single.kid} from your account.`,
        isWarning: true
    })
    if (conf.isCanceled) {
        return;
    }

    const password = await promptForPassword();
    if (!password) {
        return;
    }

    await apiCall(async () => {

        const { result, code } = await pkiConfig.removeKey(single, { password });

        if (code == 401) {
            toaster.error('Error', 'Invalid password provided.')
            return;
        }

        toaster.success('Success', result);

        //Refresh the status
        refresh()
    });
}

const onDisable = async () => {
    const { isCanceled } = await confirm({
        title: 'Are you sure?',
        message: 'This will disable PKI authentication for your account.',
        isWarning: true
    })
    if (isCanceled) {
        return;
    }

    const password = await promptForPassword();
    if (!password) {
        return;
    }

    await apiCall(async () => {

        //Disable all keys
        const { result } = await pkiConfig.disable({ password });

        toaster.success('Success', result);

        refresh()
    });
}

const jwkSchema = yup.object({
    kty: yup
        .string()
        .required('Key type (kty) is required'),
    use: yup
        .string()
        .required('Key use (use) is required'),
    alg: yup
        .string()
        .required('Algorithm (alg) is required'),
    kid: yup
        .string()
        .required('Key ID (kid) is required'),
    x: yup
        .string()
        .required('X coordinate (x) is required'),
    y: yup
        .string()
        .required('Y coordinate (y) is required'),
    crv: yup
        .string()
        .optional()
})

const onSubmitKeys = async () => {

    if (window.crypto.subtle == null) {
        toaster.error("Your browser does not support PKI authentication.")
        return;
    }

    //Validate key data
    if (isEmpty(keyData.value)) {
        toaster.error("Please enter key data")
        return;
    }

    let jwk: OtpPublicKey & JsonWebKey;
    try {
        //Try to parse as jwk
        jwk = JSON.parse(keyData.value)
    }
    catch (e) {
        //Write error to debug log
        console.error('Invalid JWK:', e);
        toaster.error('Invalid JWK', 'The key is not a valid Json Web Key (JWK): Unable to parse JSON.')
        return;
    }

    try {
        await jwkSchema.validate(jwk, { abortEarly: false })
    }
    catch (ve: unknown) {
        const validationError = ve as ValidationError
        toaster.error('Invalid Key', "The key is not a valid Json Web Key (JWK): " + validationError.errors.join(", "))
        return;
    }

    //Close the form before the passworm prompt appears
    toggleOpen(false)

    const password = await promptForPassword();
    if (!password) {
        return;
    }

    //Send to server
    const result = await apiCall(async () => {

        //init/update the key
        const { result } = await pkiConfig.addOrUpdate(jwk, { password });

        toaster.success('Success', result);

        set(keyData, '')
        set(pemFormat, false)
        set(explicitCurve, "")

        refresh();

        return true;
    })

    //if the form failed to submit (password error or cancelled), open it again
    if (!result) {
        toggleOpen(true)
    }
}

</script>

<template>
    <div id="pki-settings" v-if="isSupported" class="container">
        <div class="panel-content">

            <div class="flex flex-row flex-wrap justify-between">
                <h5 class="font-bold">OTP Authentication</h5>
                <div class="">
                    <div v-if="publicKeys.length > 0" class="join">
                        <button class="btn join-item tooltip tooltip-top max-sm:tooltip-left"
                            data-tip="Add a new OTP public key" :disabled="!canAddKeys"
                            @click.prevent="toggleOpen(true)">
                            <fa-icon icon="plus" />
                            <span class="pl-2 max-sm:hidden">Add Key</span>
                        </button>
                        <button class="btn join-item text-error tooltip sm:tooltip-top tooltip-left tooltip-error"
                            data-tip="Removes all your OTP keys" @click.prevent="onDisable">
                            <fa-icon icon="minus-circle" />
                            <span class="pl-2 max-sm:hidden">Disable</span>
                        </button>
                    </div>
                    <div v-else class="">
                        <button class="btn btn-primary" :disabled="!canAddKeys" @click.prevent="toggleOpen(true)">
                            <fa-icon icon="plus" />
                            <span class="pl-2">Add Key</span>
                        </button>
                    </div>
                </div>

                <div v-if="publicKeys && publicKeys.length > 0" class="w-full mt-4">
                    <table class="min-w-full text-sm divide-y-2 divide-base-200">
                        <thead class="text-left text-base-content">
                            <tr>
                                <th class="p-2 font-medium whitespace-nowrap">
                                    KeyID
                                </th>
                                <th class="p-2 font-medium whitespace-nowrap">
                                    Algorithm
                                </th>
                                <th class="p-2 font-medium whitespace-nowrap max-sm:hidden">
                                    Curve
                                </th>
                                <th class="p-2"></th>
                            </tr>
                        </thead>

                        <tbody class="divide-y divide-base-200 text-base-content">
                            <tr v-for="key in publicKeys">
                                <td class="p-2 whitespace-nowrap tooltip tooltip-bottom" :data-tip="key.kid">
                                    <div class="truncate max-w-40">
                                        {{ key.kid }}
                                    </div>
                                </td>
                                <td class="p-2 whitespace-nowrap">
                                    {{ key.alg }}
                                </td>
                                <td class="p-2 whitespace-nowrap max-sm:hidden">
                                    {{ key.crv }}
                                </td>
                                <td class="p-2 text-right whitespace-nowrap">
                                    <button class="btn btn-sm hover:text-error duration-75 ease-linear"
                                        @click="onRemoveKey(key)">
                                        <span class="hidden sm:inline">Remove</span>
                                        <fa-icon icon="trash-can" class="inline sm:hidden" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="text-xs text-right text-bg">
                        <span>Data size: {{ dataSize }}/{{ max_size }} b</span>
                    </div>
                </div>

                <p v-else class="p-1 pt-3 text-sm bg">
                    OTP authentication is a method of authenticating your user account with signed messages and a shared
                    public key. This method implementation uses client signed Json Web Tokens to authenticate user
                    generated outside this website as a One Time Password (OTP). This allows for you to use your
                    favorite hardware or software tools, to generate said OTPs to authenticate your user.
                </p>
            </div>
        </div>
    </div>

    <Dialog :open="isOpen" @close="toggleOpen(false)" class="">

        <template #main>
            <div class="max-w-lg">
                <h4 class="text-lg font-bold">Paste your key</h4>
                <p class="mt-4 text-sm">
                    Please paste your authenticator's public key as a Json Web Key (JWK) object. Your JWK must include a
                    kid (key id) and a kty (key type) field.
                </p>
                <div class="p-2 mt-3">
                    <textarea
                        class="w-full px-2 py-1 text-sm border input-primary rounded-none input input-bordered min-h-48"
                        rows="8" v-model="keyData" />
                </div>
                <div class="flex justify-end gap-2 mt-4 join">
                    <button class="btn btn-primary join-item" @click.prevent="onSubmitKeys">Submit</button>
                    <button class="btn join-item" @click.prevent="toggleOpen(false)">Cancel</button>
                </div>
            </div>
        </template>

    </Dialog>

</template>
