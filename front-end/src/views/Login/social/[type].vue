<script setup lang="ts">
import { defer } from 'lodash-es'
import { tryOnMounted } from '@vueuse/core'
import { useOauthLogin } from '@vnuge/vnlib.browser';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useStore } from '../../../store';
import { vnlib, toaster } from '../../../main';

const store = useStore();
const { loggedIn } = storeToRefs(store)

store.setPageTitle('Social Login')

const { push } = useRouter()

//Override the message handler to capture the error message and display it
const { invoke: apiCall, waiting } = useApiCall({ toaster })
const { completeLogin } = useOauthLogin(vnlib)

tryOnMounted(() => defer(async () => {

  // Wait for account data to load
  await store.account.wait();

  //If logged-in redirect to login page
  if (loggedIn.value) {
    await push('/login');
    return
  }

  //try to complete an oauth login
  apiCall(async () => {
    try {
      //Complete the login
      await completeLogin();

      toaster.success('You have successfully logged in.')

      await push('/login');
    }
    catch (err: any) {
      toaster.error('Social Login Failed', err?.message || 'An unknown error occurred while attempting to log you in via social login.');
    }
  })
}))

</script>

<template>
  <div id="social-login-template" class="app-component-entry">
    <div class="container flex flex-col m-auto my-16">
      <div id="social-final-template" class="flex justify-center">
        <div class="entry-container">
          <h3>Finalizing login</h3>
          <div class="mt-6 mb-4">
            <div class="flex justify-center">
              <div class="m-auto">
                <fa-icon v-if="waiting" class="animate-spin" icon="spinner" size="2x" />
              </div>
            </div>
            <p>Please wait while we log you in.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
