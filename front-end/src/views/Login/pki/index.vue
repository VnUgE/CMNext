<template>
    <div id="pki-login-template" class="app-component-entry">
        <div class="container max-w-lg mx-auto mt-6 lg:mt-20">
            <div class="p-2 text-center bg-white border rounded shadow-md dark:border-dark-500 dark:bg-dark-800">
                
                <h4>Enter your PKI-OTP</h4>

                <div class="p-3">
                    <div class="">
                        <textarea v-model="otp" class="w-full p-1 border rounded-sm input primary" rows="5"></textarea>
                    </div>

                    <div class="flex justify-between mt-4">
                        <div class="text-sm">
                            <a class="link" target="_blank" href="https://github.com/VnUgE/Plugins.Essentials/tree/master/plugins/VNLib.Plugins.Essentials.Accounts">
                                Goto OTP spec
                                <fa-icon icon="arrow-right" class="ml-1" />
                            </a>
                        </div>
                        <div class="button-group">
                            <RouterLink to="/login">
                                <button class="btn">Back</button>
                            </RouterLink>
                            <button class="btn primary" @click.prevent="submit">Login</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { isEmpty } from 'lodash-es';
import { apiCall, debugLog, useMessage, usePkiAuth } from '@vnuge/vnlib.browser';
import { ref } from 'vue'
import { decodeJwt } from 'jose'
import { useRouter } from 'vue-router';

const otp = ref('')

const { setMessage } = useMessage()
const { push } = useRouter()
const { login } = usePkiAuth(import.meta.env.VITE_PKI_ENDPOINT)

const submit = () =>{

    apiCall(async () =>{
        if(isEmpty(otp.value)){
            setMessage('Please enter your OTP')
            return
        }

        //try to decode the jwt to confirm its form is valid
        const jwt = decodeJwt(otp.value)
        debugLog(jwt)

        await login(otp.value)

        //Go back to login page
        push({ name: 'Login' })
    })
}

</script>