<template>
  
    <form class="w-full" @submit.prevent="SocalLogin('/login/social/github')">
        <button type="submit" class="btn social-button" :disabled="waiting">
            <fa-icon :icon="['fab','github']" size="xl" />
            Login with Github
        </button>
    </form>

    <form class="mt-4" @submit.prevent="SocalLogin('/login/social/discord')">
        <button type="submit" class="btn social-button" :disabled="waiting">
            <fa-icon :icon="['fab','discord']" size="xl" />
            Login with Discord
        </button>
    </form>

    <form v-if="auth0Enabled" class="mt-4" @submit.prevent="SocalLogin('/login/social/auth0')">
        <button type="submit" class="btn social-button" :disabled="waiting">
            <fa-icon :icon="['fa','key']" size="xl" />
            Login with Auth0
        </button>
    </form>

</template>

<script setup lang="ts">
import { apiCall,  useWait, useSession, useSessionUtils, WebMessage } from '@vnuge/vnlib.browser'

//auth0 enabled flag from env
const auth0Enabled = import.meta.env.VITE_ENABLE_AUTH0 == 'true';

const { waiting } = useWait()
const { browserId, publicKey } = useSession()
const { KeyStore } = useSessionUtils()

const SocalLogin = async (url:string) => {
  await apiCall(async ({ axios }) => {
    const { data } = await axios.put<WebMessage<string>>(url, {
      browser_id: browserId.value,
      public_key: publicKey.value
    })
   
    const encDat = data.getResultOrThrow()
    // Decrypt the result which should be a redirect url
    const result = await KeyStore.decryptDataAsync(encDat)
    // get utf8 text
    const text = new TextDecoder('utf-8').decode(result)
    // Recover url
    const redirect = new URL(text)
    // Force https
    redirect.protocol = 'https:'
    // redirect to the url
    window.location.href = redirect.href
  })
}

</script>