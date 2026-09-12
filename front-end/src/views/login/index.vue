<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { isLoggedIn } from '@vnuge/vnlib.browser';
import { get } from '@vueuse/core';
import { useStore } from '../../store';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { defer, isEmpty, isString } from 'lodash-es';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { toaster } from '../../main';
import UserPass from './components/UserPass.vue';
const Social = defineAsyncComponent(() => import('./components/Social.vue'));

const store = useStore();
const { loggedIn } = storeToRefs(store);
const { push, currentRoute } = useRouter();

store.setPageTitle('Login');

const { invoke: apiCall, waiting } = useApiCall({ toaster });

const otpEnabled = store.account.isMethodSupported('otp.login');

//Submit logout request
const submitLogout = () => apiCall(store.account.logout);

defer(async () => {
  /**
   * redirects the user to the redirect route if
   * they are logged in and there is a redirect route
   */
  const data = await store.account.wait();
  const redirect = get(currentRoute).query['redirect'];

  if (isLoggedIn(data) && isString(redirect) && !isEmpty(redirect)) {
    push({ path: redirect });
  }
});
</script>

<template>
  <div class="default-page-template md:mb-30 mb-20">
    <div class="mx-auto max-w-100 space-y-6 bg-base-100 rounded-lg md:p-6 p-3" data-id="3">
      <div class="space-y-2 text-center" data-id="4">
        <h1 class="text-3xl font-bold" data-id="5">Login</h1>
      </div>
      <div class="" data-id="7">
        <div v-if="!loggedIn">
          <UserPass />
        </div>

        <div v-else>
          <div class="">
            <button class="btn btn-primary w-full" :disabled="waiting" @click="submitLogout">
              <!-- Display spinner if waiting, otherwise the sign-in icon -->
              <span v-if="waiting" class="loading loading-spinner loading-sm" />
              <fa-icon v-else icon="sign-in-alt" />
              Log-out
            </button>
          </div>
        </div>

        <div v-if="!loggedIn" class="w-full">
          <!-- pki button, forward to the pki route -->
          <div v-if="otpEnabled" class="mt-6">
            <router-link to="/login/pki" class="btn w-full" :class="{ 'btn-disabled': waiting }">
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 256 256">
                  <path
                    fill="currentColor"
                    d="M248 128a56 56 0 1 0-96 39.14V224a8 8 0 0 0 11.58 7.16L192 216.94l28.42 14.22A8 8 0 0 0 232 224v-56.86A55.81 55.81 0 0 0 248 128Zm-56-40a40 40 0 1 1-40 40a40 40 0 0 1 40-40Zm3.58 112.84a8 8 0 0 0-7.16 0L168 211.06v-32.47a55.94 55.94 0 0 0 48 0v32.47ZM136 192a8 8 0 0 1-8 8H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16a8 8 0 0 1-16 0H40v128h88a8 8 0 0 1 8 8Zm-16-56a8 8 0 0 1-8 8H72a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8Zm0-32a8 8 0 0 1-8 8H72a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8Z"
                  />
                </svg>
              </span>
              Login with OTP
            </router-link>
          </div>

          <Suspense>
            <template #default>
              <Social />
            </template>
            <template #fallback>
              <div class="flex items-center justify-center h-64">
                <div class="loading loading-spinner loading-lg" />
                <span class="ml-2">Loading social login options...</span>
              </div>
            </template>
          </Suspense>

          <div class="mt-4 text-center text-sm" data-id="18">
            Don't have an account?
            <router-link data-id="19" class="underline" to="/register"> Sign up </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
