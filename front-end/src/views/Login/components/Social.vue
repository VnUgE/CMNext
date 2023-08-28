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

</template>

<script setup lang="ts">
import { apiCall, useWait, useSessionUtils, WebMessage, useUser } from '@vnuge/vnlib.browser'

const { waiting } = useWait()
const { KeyStore } = useSessionUtils()
const { prepareLogin } = useUser()

const SocalLogin = async (url:string) => {
  await apiCall(async ({ axios }) => {

    //Prepare the login claim
    const claim = await prepareLogin()
    const { data } = await axios.put<WebMessage<string>>(url, claim)
   
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