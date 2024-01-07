<template>
  <div id="login-template" class="app-component-entry">
    <div class="login-container">

      <div v-if="!loggedIn">
        <UserPass/>
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

      <div v-if="!loggedIn" class="w-full mt-6">

        <Social />

        <!-- pki button, forward to the pki route -->
        <div v-if="pkiEnabled" class="mt-3">
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
import {  } from 'vue'
import { apiCall, useWait } from '@vnuge/vnlib.browser'
import { isNil } from 'lodash-es'
import { useStore } from '../../store'
import { storeToRefs } from 'pinia'
import UserPass from './components/UserPass.vue'
import Social from './components/Social.vue'

//pki enabled flag from env
const pkiEnabled = !isNil(import.meta.env.VITE_PKI_ENABLED);

const store = useStore();
const { loggedIn } = storeToRefs(store)

store.setPageTitle('Login')

const { waiting } = useWait()

const submitLogout = async () => {
  //Submit logout request
  await apiCall(async ({ toaster }) => {
    // Attempt to logout
    const { logout } = await store.socialOauth()
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
