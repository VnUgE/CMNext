
<script setup lang="ts">
import { defer } from 'lodash-es'
import { set, tryOnMounted } from '@vueuse/core'
import { useWait, configureApiCall } from '@vnuge/vnlib.browser'
import { useRouter } from 'vue-router';
import { ref } from 'vue'
import { storeToRefs } from 'pinia';
import { useStore } from '../../../store';

const store = useStore();
const { loggedIn } = storeToRefs(store)
const { waiting } = useWait()

const router = useRouter()
const message = ref('')

//Override the message handler to capture the error message and display it
const { apiCall } = configureApiCall(m => message.value = m)

//Set the page title
store.setPageTitle('Social Login')

tryOnMounted(() => defer(() => {

  //If logged-in redirect to login page
  if (loggedIn.value) {
    router.push({ name: 'Login' })
  }

  //try to complete an oauth login
  apiCall(async ({ toaster }) => {
    try {
      const { completeLogin } = await store.socialOauth();

      //Complete the login
      await completeLogin();

      toaster.general.success({
        title: 'Login Successful',
        text: 'You have successfully logged in.'
      })

      router.push({ name: 'Login' })
    }
    catch (err: any) {
      set(message, err.message)
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
            <div v-if="message?.length > 0" class="text-lg text-red-500 dark:text-rose-500">
              <p>{{ message }}</p>
              <div class="flex justify-center mt-5">
                <router-link to="/login">
                  <button type="submit" class="btn primary" :disabled="waiting">
                    <fa-icon icon="sign-in-alt" />
                    Try again
                  </button>
                </router-link>
              </div>
            </div>
            <div v-else>
              <div class="flex justify-center">
                <div class="m-auto">
                  <fa-icon class="animate-spin" icon="spinner" size="2x"/>
                </div>
              </div>
              <p>Please wait while we log you in.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">

#social-login-template{
  .entry-container{
    @apply w-full max-w-[28rem] p-6 text-center sm:border rounded-sm sm:shadow-sm;
    @apply sm:bg-white bg-transparent sm:dark:bg-dark-700 dark:border-dark-400;
  }
}

</style>
