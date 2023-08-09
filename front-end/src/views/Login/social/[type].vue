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

<script setup lang="ts">
import { isEqual } from 'lodash-es'
import { useRouteParams, useRouteQuery } from '@vueuse/router'
import { useSession, useWait, useUser, useTitle, configureApiCall } from '@vnuge/vnlib.browser'
import { useRouter } from 'vue-router';
import { ref } from 'vue'
import { ITokenResponse } from '@vnuge/vnlib.browser/dist/session';

useTitle('Social Login')

const { loggedIn } = useSession()
const { prepareLogin } = useUser()
const { waiting } = useWait()

const type = useRouteParams('type')
const result = useRouteQuery('result', '');
const nonce = useRouteQuery('nonce', '');
const router = useRouter()

const message = ref('')

//Override the message handler to capture the error message and display it
const { apiCall } = configureApiCall(m => message.value = m)

//If logged-in redirect to login page
if (loggedIn.value) {
  router.push({ name: 'Login' })
}


const run = async () => {
  if (isEqual(result.value, 'authorized')) {

    let loginUrl : string = ''

    switch (type.value) {
      case 'github':
        loginUrl = '/login/social/github';
        break;
      case 'discord':
        loginUrl = '/login/social/discord';
        break;
      case 'auth0':
        loginUrl = '/login/social/auth0';
        break;
      default:
        router.push({ name: 'Login' })
        break;
    }

    // If nonce is set, then we can proceed with finalization
    await apiCall(async ({ axios }) => {
      const preppedLogin = prepareLogin()
      // Send the login request
      const { data } = await axios.post<ITokenResponse>(loginUrl, { nonce: nonce.value })

      data.getResultOrThrow()

      // Finalize the login
      await preppedLogin.finalize(data)
      
      // If the login was successful, then we can redirect to the login page
      router.push({ name: 'Login' })
    })
    
  } else {
    switch (result.value) {
      case 'invalid':
        message.value = 'The request was invalid, and you could not be logged in. Please try again.'
        break
      case 'expired':
        message.value = 'The request has expired. Please try again.'
        break
      default:
        message.value = 'There was an error processing the request. Please try again.'
        break
    }
  }
}

//Run without awaiting
run()

</script>

<style lang="scss">

#social-login-template{
  .entry-container{
    @apply w-full max-w-[28rem] p-6 text-center sm:border rounded-sm sm:shadow-sm;
    @apply sm:bg-white bg-transparent sm:dark:bg-dark-700 dark:border-dark-400;
  }
}

</style>
