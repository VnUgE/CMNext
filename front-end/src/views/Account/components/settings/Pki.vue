<script setup lang="ts">
import { isEmpty } from 'lodash-es'
import { useConfirm, debugLog, useFormToaster, type PkiPublicKey, useOtpApi, usePassConfirm } from '@vnuge/vnlib.browser'
import { ref } from 'vue'
import { useToggle, set, toRefs, refDefault } from '@vueuse/core'
import { useStore } from '../../../../store'

const store = useStore()
const { reveal } = useConfirm()
const { error } = useFormToaster()
const { refresh } = store.mfa
const { elevatedApiCall } = usePassConfirm()

const isSupported = store.mfa.isSupported('pkotp')
const pkiConfig = useOtpApi(store.mfa)

const _otpData = store.mfa.getDataFor<{ 
    keys: PkiPublicKey[], 
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

const [ isOpen, toggleOpen ] = useToggle()
const keyData = ref('')
const pemFormat = ref(false)
const explicitCurve = ref("")


const onRemoveKey = async (single: PkiPublicKey) => {
    const { isCanceled } = await reveal({
        title: 'Are you sure?',
        text: `This will remove key ${single.kid} from your account.`,
        isWarning: true
    })
    if (isCanceled) {
        return;
    }

    await elevatedApiCall(async ({ toaster, password }) => {

        const text = await pkiConfig.removeKey(single, { password });

        toaster.general.success({ title: 'Success', text })

        //Refresh the status
        refresh()
    });
}

const onDisable = async () => {
    const { isCanceled } = await reveal({
        title: 'Are you sure?',
        text: 'This will disable PKI authentication for your account.',
        isWarning: true
    })
    if (isCanceled) {
        return;
    }
  
    await elevatedApiCall(async ({ toaster, password }) => {

        //Disable all keys
        const text = await pkiConfig.disable({ password});

        toaster.general.success({ title: 'Success', text })

        refresh()
    });
}

const onSubmitKeys = async () => {

    if (window.crypto.subtle == null) {
        error({ title: "Your browser does not support PKI authentication." })
        return;
    }

    //Validate key data
    if (isEmpty(keyData.value)) {
        error({ title: "Please enter key data" })
        return;
    }

    let jwk: PkiPublicKey & JsonWebKey;
    try {
        //Try to parse as jwk
        jwk = JSON.parse(keyData.value)
        if (isEmpty(jwk.use)
            || isEmpty(jwk.kty)
            || isEmpty(jwk.alg)
            || isEmpty(jwk.kid)
            || isEmpty(jwk.x)
            || isEmpty(jwk.y)) {
            throw new Error("Invalid JWK");
        }
    }
    catch (e) {
        //Write error to debug log
        debugLog(e)
        error({ title: "The key is not a valid Json Web Key (JWK)" })
        return;
    }

    //Close the form before the passworm prompt appears
    toggleOpen(false)

    //Send to server
    const result = await elevatedApiCall(async ({ toaster, password }) => {

        //init/update the key
        const text = await pkiConfig.addOrUpdate(jwk, { password });

        toaster.general.success({ title: 'Key Added', text })

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
                        <button class="btn join-item tooltip tooltip-top max-sm:tooltip-left" data-tip="Add a new OTP public key"
                            :disabled="!canAddKeys" @click.prevent="toggleOpen(true)">
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
                                    <div class="truncate max-w-[10rem]">
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
                                    <button class="btn btn-sm hover:text-error duration-75 ease-linear" @click="onRemoveKey(key)">
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
                    <textarea class="w-full px-2 py-1 text-sm border input-primary rounded-none input input-bordered min-h-48" rows="8"
                        v-model="keyData" />
                </div>
                <div class="flex justify-end gap-2 mt-4 join">
                    <button class="btn btn-primary join-item" @click.prevent="onSubmitKeys">Submit</button>
                    <button class="btn join-item" @click.prevent="toggleOpen(false)">Cancel</button>
                </div>
            </div>
        </template>

    </Dialog>

</template>


