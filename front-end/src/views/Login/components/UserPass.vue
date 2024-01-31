<template>
    <div class="">
        <h3>Login</h3>

        <div v-if="mfaUpgrade?.type === MfaMethod.TOTP">
            <Totp @clear="totpClear" :upgrade="mfaUpgrade" />
        </div>

        <form v-else id="user-pass-submit-form" method="post" action="/login" @submit.prevent="SubmitLogin">
            <fieldset class="" :disabled="waiting" >
                <div>
                    <div class="float-label">
                        <input
                            id="username"
                            v-model="v$.username.$model"
                            type="email"
                            class="w-full primary input"
                            placeholder="Email"
                            :class="{ 'data-invalid': v$.username.$invalid }"
                            @input="onInput"
                        >
                        <label for="username">Email</label>
                    </div>
                </div>
                    <div class="py-3">
                    <div class="mb-2 float-label">
                        <input
                            id="password"
                            v-model="v$.password.$model"
                            type="password"
                            class="w-full primary input"
                            placeholder="Password"
                            :class="{ 'data-invalid': v$.password.$invalid }"
                            @input="onInput"
                        >
                        <label for="password">Password</label>
                    </div>
                </div>
            </fieldset>
            <button type="submit" form="user-pass-submit-form" class="btn primary" :disabled="waiting">
                <!-- Display spinner if waiting, otherwise the sign-in icon -->
                <fa-icon :class="{'animate-spin':waiting}" :icon="waiting ? 'spinner' : 'sign-in-alt'"/>
                Log-in
            </button>
            <div class="flex flex-row justify-between gap-3 pt-3 pb-2 form-links">
                <router-link to="/pwreset">
                    Forgot password
                </router-link>
                <router-link to="/register">
                    Register a new account
                </router-link>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, defineAsyncComponent, Ref } from 'vue'
import { useTimeoutFn, set } from '@vueuse/core'
import { useVuelidate } from '@vuelidate/core'
import { isEqual } from 'lodash-es'
import { required, maxLength, minLength, email, helpers } from '@vuelidate/validators'
import { 
    useVuelidateWrapper, useMfaLogin, totpMfaProcessor, IMfaFlowContinuiation, MfaMethod,
    apiCall, useMessage, useWait, debugLog, WebMessage,
    type VuelidateInstance
} from '@vnuge/vnlib.browser'
const Totp = defineAsyncComponent(() => import('./Totp.vue'))

const { onInput, setMessage } = useMessage();
const { waiting } = useWait();

//Setup mfa login with TOTP support
const { login } = useMfaLogin([ totpMfaProcessor() ])

const mfaUpgrade = shallowRef<IMfaFlowContinuiation>();

const mfaTimeout = ref<number>(600 * 1000);
const mfaTimer = useTimeoutFn(() => {
    //Clear upgrade message
    mfaUpgrade.value = undefined;
    setMessage('Your TOTP request has expired')
}, mfaTimeout, { immediate: false })

const vState = reactive({ username: '', password: '' })

const rules = {
    username: {
        required: helpers.withMessage('Email cannot be empty', required),
        email: helpers.withMessage('Your email address is not valid', email),
        maxLength: helpers.withMessage('Email address must be less than 50 characters', maxLength(50))
    },
    password: {
        required: helpers.withMessage('Password cannot be empty', required),
        minLength: helpers.withMessage('Password must be at least 8 characters', minLength(8)),
        maxLength: helpers.withMessage('Password must have less than 128 characters', maxLength(128))
    }
}

const v$ = useVuelidate(rules, vState)
const { validate } = useVuelidateWrapper(v$ as Ref<VuelidateInstance>);

const SubmitLogin = async () => {

    // If the form is not valid set the error message
    if (!await validate()) {
        return
    }
    
    // Run login in an apicall wrapper
    await apiCall(async ({ toaster }) => {
        
        //Attempt to login
        const response = await login(
            v$.value.username.$model, 
            v$.value.password.$model
        );

        debugLog('Mfa-login', response);

        //See if the response is a web message
        if(response.getResultOrThrow){
            (response as WebMessage).getResultOrThrow();
        }

        //Try to get response as a flow continuation
        const mfa = response as IMfaFlowContinuiation

        // Response is a totp upgrade request
        if (isEqual(mfa.type, MfaMethod.TOTP)) {
            //Store the upgrade message
            set(mfaUpgrade, mfa);
            //Setup timeout timer
            set(mfaTimeout, mfa.expires! * 1000);
            mfaTimer.start();
        }
        //If login without mfa was successful
        else if (response.success) {
            // Push a new toast message
            toaster.general.success({
                title: 'Success',
                text: 'You have been logged in',
            })
        }
    })
}

const totpClear = () => {
    //Clear timer
    mfaTimer.stop();
    //Clear upgrade message
    set(mfaUpgrade, undefined);
}

</script>