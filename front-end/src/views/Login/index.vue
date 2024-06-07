<script setup lang="ts">
import { computed } from 'vue'
import { apiCall, useWait } from '@vnuge/vnlib.browser'
import { isNil } from 'lodash-es'
import { useStore } from '../../store'
import { storeToRefs } from 'pinia'
import UserPass from './components/UserPass.vue'
import Social from './components/Social.vue'

const store = useStore();
const { loggedIn } = storeToRefs(store)
const pkiEnabled = computed(() => !isNil(store.pki?.pkiAuth))

store.setPageTitle('Login')

const { waiting } = useWait()

const submitLogout = async () => {
  //Submit logout request
  await apiCall(async ({ toaster }) => {
    const { logout } = await store.socialOauth()
    // Attempt to logout
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

<template>
  <div id="login-template" class="app-component-entry">
    <div class="login-container">

      <div v-if="!loggedIn">
        <UserPass />
      </div>

      <div v-else>
        <h3>Logout</h3>
        <p class="mt-3 mb-5 text-lg">
          You are currently logged-in.
        </p>
        <div class="">
          <button form="user-pass-submit-form" class="btn primary" @click="submitLogout" :disabled="waiting">
            <!-- Display spinner if waiting, otherwise the sign-in icon -->
            <fa-icon :class="{'animate-spin':waiting}" :icon="waiting ? 'spinner' : 'sign-in-alt'" />
            Log-out
          </button>
        </div>
      </div>

      <div v-if="!loggedIn" class="w-full mt-6">

        <Social />

        <!-- pki button, forward to the pki route -->
        <div v-if="pkiEnabled" class="mt-4">
          <router-link to="/login/pki">
            <button type="submit" class="btn social-button" :disabled="waiting">
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 256 256">
                  <path fill="currentColor" d="M248 128a56 56 0 1 0-96 39.14V224a8 8 0 0 0 11.58 7.16L192 216.94l28.42 14.22A8 8 0 0 0 232 224v-56.86A55.81 55.81 0 0 0 248 128Zm-56-40a40 40 0 1 1-40 40a40 40 0 0 1 40-40Zm3.58 112.84a8 8 0 0 0-7.16 0L168 211.06v-32.47a55.94 55.94 0 0 0 48 0v32.47ZM136 192a8 8 0 0 1-8 8H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16a8 8 0 0 1-16 0H40v128h88a8 8 0 0 1 8 8Zm-16-56a8 8 0 0 1-8 8H72a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8Zm0-32a8 8 0 0 1-8 8H72a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8Z" />
                </svg>
              </span>
              Login with OTP
            </button>
          </router-link>
        </div>
      </div>

    </div>
  </div>
</template>

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

}
</style>
