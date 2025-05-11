

<script setup lang="ts">
import { ref, shallowRef, reactive, computed, type Ref, watch } from 'vue'
import { useTimeoutFn, set } from '@vueuse/core'
import { useVuelidate } from '@vuelidate/core'
import { isEmpty, isArray } from 'lodash-es'
import { required, maxLength, minLength, email, helpers } from '@vuelidate/validators'
import { 
    useVuelidateWrapper, useMfaLogin, totpMfaProcessor,
    apiCall, useMessage, useWait, debugLog,
    fidoMfaProcessor,
    type WebMessage,
    type IMfaFlow,
    type IMfaContinuation,
    type VuelidateInstance,
    type MfaMethod
} from '@vnuge/vnlib.browser'
import Fido from './Fido.vue'
import Totp from './Totp.vue'
import { useStore } from '../../../store'

const { onInput, setMessage } = useMessage();
const { waiting } = useWait();
const { account } = useStore()

interface LoginAccountPropertyData{
    readonly enforce_email: boolean;
    readonly username_max_chars: number;
}

//Stores dynamic account data from the server
const loginData = account.getPropertyData<LoginAccountPropertyData>('login', { 
    enforce_email: false, 
    username_max_chars: 50 
});

const { login } = useMfaLogin([ 
    totpMfaProcessor(),     //Enable totp mfa support
    fidoMfaProcessor()      //Enable fido mfa support
 ])

const mfaUpgrades = shallowRef<IMfaFlow[]>();
const selectedUpgrade = shallowRef<IMfaFlow>(); 

const clearUpgrade = () => {
    set(mfaUpgrades, []);
    set(selectedUpgrade, undefined);
}

const mfaTimeout = ref<number>(600 * 1000);
const mfaTimer = useTimeoutFn(() => {
    //Clear upgrade message
    clearUpgrade();
    setMessage('Your request has expired')
}, mfaTimeout, { immediate: false })

const vState = reactive({ username: '', password: '' })

const rules = computed(() => ({
    username: {
        required: helpers.withMessage('Email cannot be empty', required),
        email: helpers.withMessage('Your email address is not valid', loginData.value.enforce_email ? email : () => true),
        maxLength: helpers.withMessage('Email address must be less than 50 characters', maxLength(loginData.value.username_max_chars))
    },
    password: {
        required: helpers.withMessage('Password cannot be empty', required),
        minLength: helpers.withMessage('Password must be at least 8 characters', minLength(8)),
        maxLength: helpers.withMessage('Password must have less than 128 characters', maxLength(128))
    }
}));

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
        const response = await login({
            userName: v$.value.username.$model, 
            password: v$.value.password.$model
        });

        debugLog('Mfa-login', response);

        //See if the response is a web message
        if((response as WebMessage).getResultOrThrow){
            (response as WebMessage).getResultOrThrow();
        }

        //Try to get response as a flow continuation
        const { methods, expires } = response as IMfaContinuation

        // Response is an mfa upgrade
        if (isArray(methods) && methods.length > 0) {

            /**
             * If mfa has a type assicated, then we should have a handler matched 
             * with it to continue the flow
             * 
             * All mfa upgrades will have a token expiration, and an assoicated 
             * type string name (string) 
             */
           
            set(mfaUpgrades, methods);
          
            set(mfaTimeout, expires! * 1000);
            
            mfaTimer.start();
        }
        //If login without mfa was successful
        else if ((response as WebMessage).success) {
            // Push a new toast message
            toaster.general.success({
                title: 'Success',
                text: 'You have been logged in',
            })
        }
    })
}

const mfaClear = () => {
    mfaTimer.stop();
    clearUpgrade();
    account.refresh();
}

const goBackToSelect = () => set(selectedUpgrade, undefined);

const isMethodSelected = (upgrade: IMfaFlow | undefined, type: MfaMethod) =>  upgrade?.type === type;
const isSelectectionReady = computed(() => !selectedUpgrade.value && !isEmpty(mfaUpgrades.value));

const getIconUrl = (method: MfaMethod) => {
    switch (method) {
        case 'fido':
            return `M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 
             15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25
             2.25Zm.75-12h9v9h-9v-9Z`

        case 'totp':
            return `M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0
             0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3`
    }
}

const getMfaName = (method: MfaMethod) => {
    switch (method) {
        case 'fido':
            return 'Security Key'

        case 'totp':
            return 'Authenticator App'
    }
}

watch(loginData, console.log)

</script>

<template>
    <div class="">

        <div v-if="isMethodSelected(selectedUpgrade, 'totp')">
            <Totp @clear="mfaClear()" @back="goBackToSelect" :upgrade="selectedUpgrade!" />
        </div>

        <div v-else-if="isMethodSelected(selectedUpgrade, 'fido')">
            <Fido @clear="mfaClear()" @back="goBackToSelect" :upgrade="selectedUpgrade!" />
        </div>

        <div v-else-if="isSelectectionReady">
            <div class="flex flex-col gap-3 py-6">
                <h4 class="text-base font-semibold md:text-lg text-center">Two factor</h4>
                <div class="flex flex-col gap-2">
                    <div v-for="upgrade in mfaUpgrades" :key="upgrade.type" class="flex flex-row gap-4">
                        <button @click="selectedUpgrade = upgrade"
                            class="flex flex-row items-center justify-center gap-2 btn btn-secondary w-full">
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                    stroke-width="1.5" stroke="currentColor" class="size-6">
                                    <path stroke-linecap="round" stroke="currentColor" stroke-linejoin="round"
                                        :d="getIconUrl(upgrade.type)"></path>
                                </svg>
                            </span>
                            <span class="md:text-base">
                                {{ getMfaName(upgrade.type) }}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <form v-else id="user-pass-submit-form" method="post" action="/login" @submit.prevent="SubmitLogin">

            <fieldset class="mt-10" :disabled="waiting">
                <div class="pt-3">
                    <label class="input input-bordered flex items-center gap-2 w-full"
                        :class="{ 'input-error': (v$.username.$invalid && v$.username.$model.length > 0) }">

                        <fa-icon icon="user" />

                        <!-- Enforce an email address only if the server requires it, otherwise a username is acceptable -->
                        <input tabindex="1" id="username" v-if="loginData.enforce_email" v-model="v$.username.$model" type="email" autocomplete="username"
                            class="grow" placeholder="Email" @input="onInput">
                        
                        <input tabindex="1" id="username" v-else v-model="v$.username.$model" type="text" autocomplete="username"
                            class="grow" placeholder="Username" @input="onInput">
                    </label>
                </div>
                <div class="py-5">
                    <label class="input input-bordered flex items-center gap-2 w-full"
                        :class="{ 'input-error': v$.password.$invalid && v$.password.$model.length > 0 }">
                        <fa-icon icon="lock" />

                        <input tabindex="2" id="password" v-model="v$.password.$model" type="password"
                            autocomplete="current-password" class="grow" placeholder="Password" @input="onInput">
                    </label>
                    <div class="label text-sm w-full flex flex-row justify-between mt-1">
                        <span class="label-text-alt link link-hover"></span>
                        <span class="label-text-alt link link-hover">
                            <router-link to="/pwreset">
                                Forgot password
                            </router-link>
                        </span>
                    </div>
                </div>
            </fieldset>
            <button tabindex="3" type="submit" form="user-pass-submit-form" class="btn btn-primary w-full" :disabled="waiting">
                <!-- Display spinner if waiting, otherwise the sign-in icon -->
                <fa-icon :class="{ 'animate-spin': waiting }" :icon="waiting ? 'spinner' : 'sign-in-alt'" />
                <span class="ml-2"> Login </span>
            </button>
        </form>
    </div>
</template>