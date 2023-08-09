<template>
  <div id="login-template" class="app-component-entry">
    <div class="login-container">

      <div v-if="showTotp">
        <Totp @submit="totpSubmit" />
      </div>

      <div v-else-if="!loggedIn">
        <UserPass @login="submitLogin" />
      </div>

      <div v-else>
        <h3>Logout</h3>
        <p class="mt-3 mb-5 text-lg">
          You are currently logged-in.
        </p>
         <div class="">
            <button form="user-pass-submit-form" class="btn primary" @click="submitLogout" :disabled="waiting">
                <!-- Display spinner if waiting, otherwise the sign-in icon -->
                <fa-icon :class="{'animate-spin':waiting}" :icon="waiting ? 'spinner' : 'sign-in-alt'"/>
                Log-out
            </button>
         </div>
      </div>

      <div v-if="!(loggedIn || showTotp)" class="w-full mt-6">
        
        <Social />

        <!-- pki button, forward to the pki route -->
        <div v-if="pkiEnabled" class="mt-4">
          <router-link to="/login/pki">
            <button type="submit" class="btn red social-button" :disabled="waiting">
              <fa-icon :icon="['fa','certificate']" size="xl" />
              Login with PKI Credential
            </button>
          </router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Totp from './components/Totp.vue'
import UserPass from './components/UserPass.vue'
import Social from './components/Social.vue'
import { apiCall, useMessage, useWait, useUser, useSession, useLastPage, useTitle, debugLog } from '@vnuge/vnlib.browser'
import { useMfaLogin, totpMfaProcessor, IMfaFlowContinuiation, MfaMethod } from '@vnuge/vnlib.browser/dist/mfa'
import { useTimeoutFn } from '@vueuse/shared'
import { isNil } from 'lodash-es'

useTitle('Login')

//pki enabled flag from env
const pkiEnabled = !isNil(import.meta.env.VITE_PKI_ENDPOINT);

const { waiting } = useWait()
const { setMessage } = useMessage()
const { logout } = useUser();
const { loggedIn } = useSession()

//Setup mfa login
const { login } = useMfaLogin([ totpMfaProcessor() ])

//If logged in re-route to the last page the user 
//was on but delayed to the session has time to be set
const { gotoLastPage } = useLastPage()
useTimeoutFn(() => loggedIn.value ? gotoLastPage() : null, 500)

const mfaUpgrade = ref<IMfaFlowContinuiation>();
const mfaTimer = ref<{stop:() => void}>();
const showTotp = computed(() => mfaUpgrade.value?.type === MfaMethod.TOTP)

const submitLogout = async () => {
  //Submit logout request
  await apiCall(async ({ toaster }) => {
    // Attempt to login
    await logout()
    // Push a new toast message
    toaster.general.success({
      id: 'logout-success',
      title: 'Success',
      text: 'You have been logged out',
      duration: 5000
    })
  })
}

const submitLogin = async ({username, password} : { username: string, password:string }) => {
  // Run login in an apicall wrapper
  await apiCall(async ({ toaster }) => {
    // Attempt to login
    const response = await login(username, password)

    debugLog('Mfa-login',response)

    //Try to get response as a flow continuation
    const mfa = response as IMfaFlowContinuiation

    // Response is a totp upgrade request
    if (mfa.type === MfaMethod.TOTP) {

      //Store the upgrade message
      mfaUpgrade.value = mfa;

      // Set timeout to reset the form when totp expires
      mfaTimer.value = useTimeoutFn(() => {

        //Clear upgrade message
        mfaUpgrade.value = undefined;
        
        setMessage('Your TOTP request has expired')

      }, mfa.expires! * 1000)
    }
    //If login without mfa was successful
    else if (response.success) {
        // Push a new toast message
        toaster.general.success({
          title: 'Success',
          text: 'You have been logged in',
        })

        return;
      }
  })
}

const totpSubmit = ({ code } : {code:number}) =>{
    apiCall(async ({ toaster }) =>{

        if (!mfaUpgrade.value)
            return;

        //Submit totp code
        const res = await mfaUpgrade.value.submit({ code })
        res.getResultOrThrow()

         //Clear timer
        mfaTimer.value?.stop()

        //Clear upgrade message
        mfaUpgrade.value = undefined;

        // Push a new toast message
        toaster.general.success({
            title: 'Success',
            text: 'You have been logged in',
        })
    })
}

</script>

<style lang="scss">
#login-template {
  .login-container{
      @apply container max-w-sm w-full sm:mt-2 mt-8 mb-16 mx-auto lg:mt-16 px-6 py-4 flex flex-col;
      @apply ease-linear duration-150 text-center;
      @apply rounded-sm sm:bg-white sm:border shadow-sm border-gray-200 sm:dark:bg-dark-800 dark:border-dark-500;
  }

  .login-container button{
    @apply w-full border py-2.5;
  }

  button.social-button {
    @apply flex flex-row justify-center gap-3 items-center;
  }

  a {
    @apply ease-in-out duration-100;
    @apply hover:text-primary-600 dark:hover:text-primary-500;
  }
}
</style>
