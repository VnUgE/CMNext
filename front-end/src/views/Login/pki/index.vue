<script setup lang="ts">
import { isEmpty } from 'lodash-es';
import { apiCall, debugLog, useMessage, useOtpAuth } from '@vnuge/vnlib.browser';
import { ref } from 'vue'
import { decodeJwt } from 'jose'
import { useRouter } from 'vue-router';

const { setMessage } = useMessage()
const { push } = useRouter()
const { login } = useOtpAuth()

const otp = ref('')

const submit = () => {

    apiCall(async () => {
        if (isEmpty(otp.value)) {
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

<template>
    <div id="pki-login-template" class="app-component-entry">
        <div class="container max-w-lg mx-auto mt-6 lg:mt-20">
            <div class="p-2 text-center bg-base rounded">

                <h4 class="text-xl">Enter your OTP</h4>

                <form id="otp-login-form" method="post" action="#" class="p-3" @submit.prevent="submit">
                    <div class="">
                        <textarea v-model="otp" class="w-full py-2 px-3 rounded-sm input input-bordered min-h-40" rows="10"></textarea>
                    </div>

                    <div class="flex justify-between mt-4">
                        <div class="text-sm">
                            <a class="link" target="_blank"
                                href="https://www.vaughnnugent.com/resources/software/articles?tags=docs,_VNLib.Plugins.Essentials.Accounts">
                                Goto OTP spec
                                <fa-icon icon="arrow-right" class="ml-1" />
                            </a>
                        </div>
                        <div class="join join-horizontal">
                            <RouterLink class="btn join-item" to="/login">Back</RouterLink>
                            <button class="btn join-item btn-primary" type="submit" for="otp-login-form">Login</button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    </div>
</template>
