<template>
    <div id="pki-settings" v-show="pkiEnabled" class="container">
        <div class="panel-content">
            <h5>PKI Authentication</h5>
            <div class="flex flex-row flex-wrap justify-between">
                <h6>Authentication keys</h6>

                <div v-if="enabled" class="button-group">
                    <button class="btn yellow sm" @click.prevent="setIsOpen(true)">
                        <fa-icon icon="sync" />
                        <span class="pl-3">Update Key</span>
                    </button>
                    <button class="btn red sm" @click.prevent="onDisable">
                        <fa-icon icon="minus-circle" />
                        <span class="pl-3">Disable</span>
                    </button>
                </div>
                
                <div v-else class="">
                    <button class="btn primary sm" @click.prevent="setIsOpen(true)">
                        <fa-icon icon="plus" />
                        <span class="pl-3">Add Key</span>
                    </button>
                </div>
                
                <p class="p-1 pt-3 text-sm text-gray-600">
                  PKI authentication is a method of authenticating your user account with signed messages and a shared public key. This method implementation 
                  uses client signed Json Web Tokens to authenticate user generated outside this website as a One Time Password (OTP). This allows for you to
                  use your favorite hardware or software tools, to generate said OTPs to authenticate your user.
                
                </p>
            </div>
        </div>
    </div>
    <Dialog :open="isOpen" @close="setIsOpen" class="relative z-30">
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div class="fixed inset-0 flex justify-center">
          <DialogPanel class="w-full max-w-lg p-4 m-auto mt-24 bg-white rounded dark:bg-dark-600 dark:text-gray-300">
            <h4>Configure your authentication key</h4>
            <p class="mt-2 text-sm">
                Please paste your authenticator's public key as a Json Web Key (JWK) object. Your JWK must include a kid (key id) and a kty (key type) field.
            </p>
            <div class="p-2 mt-3">
                <textarea class="w-full p-1 text-sm border dark:bg-dark-700 ring-0 dark:border-dark-400" rows="10" v-model="keyData" />
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <button class="rounded btn sm primary" @click.prevent="onSubmitKeys">Submit</button>
                <button class="rounded btn sm red" @click.prevent="setIsOpen(false)">Cancel</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
</template>

<script setup lang="ts">
import { isEmpty, isNil } from 'lodash-es'
import { apiCall, useConfirm, useSession, debugLog, useFormToaster } from '@vnuge/vnlib.browser'
import { computed, ref, watch } from 'vue'
import { Dialog, DialogPanel } from '@headlessui/vue'
import { PkiApi } from '@vnuge/vnlib.browser/dist/mfa';

const props = defineProps<{
    pkaiApi: PkiApi
}>()

const { reveal } = useConfirm()
const { isLocalAccount } = useSession()
const { error } = useFormToaster()

const pkiEnabled = computed(() => isLocalAccount.value && !isNil(import.meta.env.VITE_PKI_ENDPOINT) && window.crypto.subtle)
const { enabled } = props.pkaiApi

const isOpen = ref(false)
const keyData = ref('')
const pemFormat = ref(false)
const explicitCurve = ref("")

watch(isOpen, () =>{
    keyData.value = ''
    pemFormat.value = false
    explicitCurve.value = ""
    //Reload status
    props.pkaiApi.refresh()
})

const setIsOpen = (value : boolean) => isOpen.value = value

const onDisable = async () => {
     const { isCanceled } = await reveal({
        title: 'Are you sure?',
        text: 'This will disable PKI authentication for your account.'
    })
    if (isCanceled) {
       return;
    }

    //Delete pki
    await apiCall(async ({ toaster }) =>{

        //Disable pki
        //TODO: require password or some upgrade to disable
        const { success } = await props.pkaiApi.disable();
        
        if(success){
            toaster.general.success({
                title: 'Success',
                text: 'PKI authentication has been disabled.'
            })
        }
        else{
            toaster.general.error({
                title: 'Error',
                text: 'PKI authentication could not be disabled.'
            })
        }

        //Refresh the status
        props.pkaiApi.refresh();
    });
}

//Server requires the JWK to set a keyid (kid) field
interface IdJsonWebKey extends JsonWebKey {
    readonly kid?: string
}

const onSubmitKeys = async () =>{
    
    if(window.crypto.subtle == null){
        error({ title: "Your browser does not support PKI authentication." })
        return;
    }
    
    //Validate key data
    if(isEmpty(keyData.value)){
        error({ title: "Please enter key data" })
        return;
    }

    let jwk : IdJsonWebKey;
    try {
        //Try to parse as jwk
        jwk = JSON.parse(keyData.value)
        if(isEmpty(jwk.use) 
        || isEmpty(jwk.kty) 
        || isEmpty(jwk.alg) 
        || isEmpty(jwk.kid)
        || isEmpty(jwk.x) 
        || isEmpty(jwk.y)){
            throw new Error("Invalid JWK");
        }
    }
    catch (e) {
        //Write error to debug log
        debugLog(e)
        error({ title:"The key is not a valid Json Web Key (JWK)"})
        return;
    }

    //Send to server
    await apiCall(async ({ toaster }) => {

        //init/update the key
        //TODO: require password or some upgrade to disable
        const { getResultOrThrow } = await props.pkaiApi.initOrUpdate(jwk);

        const result = getResultOrThrow();

        toaster.general.success({
            title: 'Success',
            text: result
        })
        setIsOpen(false)
    })
}

</script>

<style>

</style>
