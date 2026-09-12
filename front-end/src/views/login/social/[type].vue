<script setup lang="ts">
import { defer } from 'lodash-es';
import { ref } from 'vue';
import { tryOnMounted } from '@vueuse/core';
import { useOauthLogin } from '@vnuge/vnlib.browser';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useStore } from '../../../store';
import { vnlib, toaster } from '../../../main';

const store = useStore();
const { loggedIn } = storeToRefs(store);

store.setPageTitle('Social Login');

const { push } = useRouter();

//Override the message handler to capture the error message and display it
const { invoke: apiCall, waiting } = useApiCall({ toaster });
const { completeLogin } = useOauthLogin(vnlib);

const loginError = ref('');

tryOnMounted(() =>
  defer(async () => {
    // Wait for account data to load
    await store.account.wait();

    //If logged-in redirect to login page
    if (loggedIn.value) {
      await push('/login');
      return;
    }

    //try to complete an oauth login
    apiCall(async () => {
      try {
        //Complete the login
        await completeLogin();

        toaster.success('You have successfully logged in.');

        await push('/login');
      } catch (err: unknown) {
        loginError.value =
          err instanceof Error
            ? err.message
            : 'An unknown error occurred while attempting to log you in via social login.';
      }
    });
  })
);
</script>

<template>
  <div id="social-login-template" class="app-component-entry">
    <div class="container flex flex-col m-auto my-16">
      <div id="social-final-template" class="flex justify-center">
        <div class="entry-container">
          <h3>Finalizing login</h3>
          <div v-if="loginError" class="mt-6 mb-4 text-center">
            <p class="text-error mb-2">Social login failed.</p>
            <p class="text-sm opacity-75 mb-4">{{ loginError }}</p>
            <router-link to="/login" class="btn btn-primary">Back to Login</router-link>
          </div>
          <div v-else class="mt-6 mb-4">
            <div class="flex justify-center">
              <div class="m-auto">
                <span v-if="waiting" class="loading loading-spinner loading-lg" />
              </div>
            </div>
            <p>Please wait while we log you in.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
