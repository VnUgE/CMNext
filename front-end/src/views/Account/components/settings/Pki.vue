<script setup lang="ts">
import { includes, isEmpty } from 'lodash-es'
import { apiCall, useConfirm, useSession, debugLog, useFormToaster, type PkiPublicKey, MfaMethod } from '@vnuge/vnlib.browser'
import { computed, ref, watch } from 'vue'
import { Dialog, DialogPanel } from '@headlessui/vue'
import { useStore } from '../../../../store'
import { useToggle } from '@vueuse/core'

const store = useStore()
const { reveal } = useConfirm()
const { isLocalAccount } = useSession()
const { error } = useFormToaster()
const { refresh, pkiConfig } = store.pki!

const pkiEnabled = computed(() => isLocalAccount.value && includes(store.mfa.enabledMethods, "pki" as MfaMethod) && window.crypto.subtle)
const pkiPublicKeys = computed(() => store.pki!.publicKeys)

const [isOpen, toggleOpen] = useToggle()
const keyData = ref('')
const pemFormat = ref(false)
const explicitCurve = ref("")

watch(isOpen, () => {
    keyData.value = ''
    pemFormat.value = false
    explicitCurve.value = ""
    //Reload status
    refresh()
})

const onRemoveKey = async (single: PkiPublicKey) => {
    const { isCanceled } = await reveal({
        title: 'Are you sure?',
        text: `This will remove key ${single.kid} from your account.`
    })
    if (isCanceled) {
        return;
    }

    //Delete pki
    await apiCall(async ({ toaster }) => {

        //TODO: require password or some upgrade to disable
        const { success } = await pkiConfig.removeKey(single.kid);

        if (success) {
            toaster.general.success({
                title: 'Success',
                text: 'Key was removed successfully.'
            })
        }
        else {
            toaster.general.error({
                title: 'Error',
                text: 'Your single PKI key could not be removed.'
            })
        }

        //Refresh the status
        refresh()
    });
}

const onDisable = async () => {
    const { isCanceled } = await reveal({
        title: 'Are you sure?',
        text: 'This will disable PKI authentication for your account.'
    })
    if (isCanceled) {
        return;
    }

    //Delete pki
    await apiCall(async ({ toaster }) => {

        //Disable pki
        //TODO: require password or some upgrade to disable
        const { success } = await pkiConfig.disable();

        if (success) {
            toaster.general.success({
                title: 'Success',
                text: 'PKI authentication has been disabled.'
            })
        }
        else {
            toaster.general.error({
                title: 'Error',
                text: 'PKI authentication could not be disabled.'
            })
        }

        //Refresh the status
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

    //Send to server
    await apiCall(async ({ toaster }) => {

        //init/update the key
        //TODO: require password or some upgrade to disable
        const { getResultOrThrow } = await pkiConfig.addOrUpdate(jwk);

        const result = getResultOrThrow();

        toaster.general.success({
            title: 'Success',
            text: result
        })
        toggleOpen(false)
    })
}

</script>

<template>
    <div id="pki-settings" class="container">
        <div class="panel-content">
           
            <div class="flex flex-row flex-wrap justify-between">
                <h5>PKI Authentication</h5>
                <div class="">
                    <div v-if="pkiEnabled" class="button-group">
                        <button class="btn xs" @click.prevent="toggleOpen(true)">
                            <fa-icon icon="plus" />
                            <span class="pl-2">Add Key</span>
                        </button>
                        <button class="btn red xs" @click.prevent="onDisable">
                            <fa-icon icon="minus-circle" />
                            <span class="pl-2">Disable</span>
                        </button>
                    </div>
                      <div v-else class="">
                        <button class="btn primary xs" @click.prevent="toggleOpen(true)">
                            <fa-icon icon="plus" />
                            <span class="pl-2">Add Key</span>
                        </button>
                    </div>
                </div>

                <div v-if="pkiPublicKeys && pkiPublicKeys.length > 0" class="w-full mt-4">
                    <table class="min-w-full text-sm divide-y-2 divide-gray-200 dark:divide-dark-500">
                        <thead class="text-left">
                            <tr>
                                <th class="p-2 font-medium whitespace-nowrap dark:text-white" >
                                    KeyID
                                </th>
                                <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                                    Algorithm
                                </th>
                                <th class="p-2 font-medium whitespace-nowrap dark:text-white">
                                    Curve
                                </th>
                                <th class="p-2"></th>
                            </tr>
                        </thead>

                        <tbody class="divide-y divide-gray-200 dark:divide-dark-500">
                            <tr v-for="key in pkiPublicKeys">
                                <td class="p-2 t font-medium truncate max-w-[8rem] whitespace-nowrap dark:text-white">
                                    {{ key.kid }}
                                </td>
                                <td class="p-2 text-gray-700 whitespace-nowrap dark:text-gray-200">
                                    {{ key.alg }}
                                </td>
                                <td class="p-2 text-gray-700 whitespace-nowrap dark:text-gray-200">
                                    {{ key.crv }}
                                </td>
                                <td class="p-2 text-right whitespace-nowrap">
                                    <button class="rounded btn red xs borderless" @click="onRemoveKey(key)">
                                        <span class="hidden sm:inline">Remove</span>
                                        <fa-icon icon="trash-can" class="inline sm:hidden" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <p v-else class="p-1 pt-3 text-sm bg">
                  PKI authentication is a method of authenticating your user account with signed messages and a shared public key. This method implementation 
                  uses client signed Json Web Tokens to authenticate user generated outside this website as a One Time Password (OTP). This allows for you to
                  use your favorite hardware or software tools, to generate said OTPs to authenticate your user.
                </p>
            </div>
        </div>
    </div>
    <Dialog :open="isOpen" @close="toggleOpen(false)" class="relative z-30">
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div class="fixed inset-0 flex justify-center">
          <DialogPanel class="w-full max-w-lg p-4 m-auto mt-24 bg-white rounded dark:bg-dark-700 dark:text-gray-300">
            <h4>Configure your authentication key</h4>
            <p class="mt-2 text-sm">
                Please paste your authenticator's public key as a Json Web Key (JWK) object. Your JWK must include a kid (key id) and a kty (key type) field.
            </p>
            <div class="p-2 mt-3">
                <textarea class="w-full p-1 text-sm border dark:bg-dark-700 ring-0 dark:border-dark-400" rows="10" v-model="keyData" />
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <button class="rounded btn sm primary" @click.prevent="onSubmitKeys">Submit</button>
                <button class="rounded btn sm" @click.prevent="toggleOpen(false)">Cancel</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
</template>


