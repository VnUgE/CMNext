<script setup lang="ts">
import { isNil, chunk, defaultTo, map, join, toSafeInteger } from 'lodash-es'
import base32Encode from 'base32-encode'
import { computed, ref } from 'vue'
import { get } from '@vueuse/core'
import { useApiCall } from '@vnuge/vnlib.browser/vue'
import {
  useSession,
  useTotpApi,
  type TotpUpdateResponse
} from '@vnuge/vnlib.browser'
import { useStore } from '../../../../store'
import { confirm, promptForPassword } from '../../../../lib/confirm'
import { vnlib, toaster } from '../../../../main'
import { storeToRefs } from 'pinia'
import QrCodeVue from 'qrcode.vue'
import VOtpInput from "vue3-otp-input"

const store = useStore()
const { isLocalAccount } = storeToRefs(store)

const session = useSession(vnlib)
const apiCall = useApiCall({ toaster })
const totpApi = useTotpApi(store.mfa)
const totpSupported = store.mfa.isSupported('totp')
const totpEnabled = store.mfa.isEnabled('totp')

const totpMessage = ref<TotpUpdateResponse>()
const showSubmitButton = ref(false)

const showTotpCode = computed(() => !isNil(totpMessage.value?.secret))

const secretSegments = computed<string[]>(() => {
  //Chunk the secret into 6 character segments
  const chunks = chunk(totpMessage.value?.secret, 6)
  //Join the chunks into their chunk arrays
  return map(chunks, chunk => join(chunk, ''))
})

const qrCode = computed(() => {
  if (isNil(totpMessage.value?.secret)) {
    return ''
  }

  const m = get(totpMessage)!;

  // Build the totp qr codeurl
  const params = new URLSearchParams()
  params.append('secret', m.secret)
  params.append('issuer', m.issuer)
  params.append('algorithm', m.algorithm)
  params.append('digits', defaultTo(m.digits, 6).toString())
  params.append('period', defaultTo(m.period, 30).toString())
  const url = `otpauth://totp/${m.issuer}:${store.userName}?${params.toString()}`
  return url
})

const ProcessAddOrUpdate = async () => {
  const password = await promptForPassword()
  if (!password) {
    return
  }

  await apiCall(async () => {
    // Init or update the totp method and get the encrypted totp message
    const totp = await totpApi.enable({ password })

    // Decrypt the totp secret
    const secretBuf = await session.decryptPayload(totp.secret)

    // Encode the secret to base32
    totp.secret = base32Encode(secretBuf, 'RFC3548', { padding: false })

    totpMessage.value = totp
  })
}

const configTotp = async () => {
  const { isCanceled } = await confirm({
    title: 'Enable TOTP multi factor?',
    message: 'Are you sure you understand TOTP multi factor and wish to enable it?',
  })

  if (!isCanceled) {
    ProcessAddOrUpdate()
  }
}

const regenTotp = async () => {
  // If totp is enabled, show a prompt to regenerate totp
  if (!totpEnabled.value) {
    return
  }

  const { isCanceled } = await confirm({
    title: 'Are you sure?',
    message: 'If you continue your previous TOTP authenticator and recovery codes will no longer be valid.'
  })

  if (!isCanceled) {
    ProcessAddOrUpdate()
  }
}

const disable = async () => {
  // Show a confrimation prompt
  const { isCanceled } = await confirm({
    title: 'Disable TOTP',
    message: 'Are you sure you want to disable TOTP? You may re-enable TOTP later.',
    isWarning: true
  })

  if (isCanceled) {
    return
  }

  const password = await promptForPassword()
  if (!password) {
    return
  }

  await apiCall(async () => {
    // Disable the totp method
    const result = await totpApi.disable({ password })

    toaster.success(result.result)

    store.mfa.refresh()
  })
}

const VerifyTotp = (code: string) => {
  apiCall(async () => {
    try {
      await totpApi.verify(toSafeInteger(code))

      showSubmitButton.value = true

      toaster.success('Your TOTP code is valid and is now enabled')
    }
    catch (e) {
      toaster.error('Your TOTP code is not valid.')
    }
  })
}


const CloseQrWindow = () => {
  showSubmitButton.value = false
  totpMessage.value = undefined

  //Fresh methods
  store.mfa.refresh()
}

</script>
<template>
  <div id="totp-settings" v-if="totpSupported">

    <div v-if="!isLocalAccount" class="flex flex-row justify-between">
      <h6 class="block font-bold">
        TOTP Authenticator App
      </h6>
      <div class="text-red-500">
        Unavailable for external auth
      </div>
    </div>

    <div v-else-if="showTotpCode" class="w-full py-2 text-center">
      <h5 class="text-center" />
      <p class="py-2">
        Scan the QR code with your TOTP authenticator app.
      </p>

      <div class="flex">
        <QrCodeVue class="m-auto" :size="180" render-as="svg" level="Q" :value="qrCode" />
      </div>

      <p class="py-2">
        Your secret, if your application requires it.
      </p>

      <p class="flex flex-row flex-wrap justify-center p-2 bg-base-100 border-base-100 border">
        <span v-for="code in secretSegments" :key="code" class="px-2 font-mono tracking-wider">
          {{ code }}
        </span>
      </p>

      <p class="py-2 text-bg">
        Please enter your code from your authenticator app to continue.
      </p>

      <div class="m-auto w-min">
        <VOtpInput class="otp-input" input-type="letter-numeric" separator="" value="" :is-disabled="showSubmitButton"
          input-classes="primary input rounded" :num-inputs="6" @on-complete="VerifyTotp" />
      </div>

      <div v-if="showSubmitButton" class="flex flex-row justify-end my-2">
        <button class="btn btn-primary" @click.prevent="CloseQrWindow">
          Complete
        </button>
      </div>
    </div>

    <div v-else class="">
      <div class="flex flex-row flex-wrap justify-between">
        <h6 class="font-bold">TOTP Authenticator App</h6>

        <div v-if="totpEnabled" class="join">
          <button class="btn join-item tooltip max-sm:tooltip-left" data-tip="Reset your TOTP secret"
            @click.prevent="regenTotp">
            <fa-icon icon="sync" />
            <span class="pl-2 max-sm:hidden">Regenerate</span>
          </button>
          <button class="btn text-error join-item tooltip max-sm:tooltip-left tooltip-error" data-tip="Disable TOTP 2fa"
            @click.prevent="disable">
            <fa-icon icon="minus-circle" />
            <span class="pl-2 max-sm:hidden">Disable</span>
          </button>
        </div>

        <div v-else>
          <button class="btn btn-primary" @click.prevent="configTotp">
            <fa-icon icon="plus" />
            <span class="pl-2">Setup</span>
          </button>
        </div>
      </div>

      <p v-if="!totpEnabled" class="p-1 pt-3 text-sm text-bg">
        TOTP is a time based one time password. You can use it as a form of Multi Factor Authentication when
        using another device such as a smart phone or TOTP hardware device. You can use TOTP with your smart
        phone using apps like Google Authenticator, Authy, or Duo. Read more on
        <a class="link" href="https://en.wikipedia.org/wiki/Time-based_one-time_password" target="_blank">
          Wikipedia.
        </a>
      </p>

      <p v-else class="p-1 pt-2 text-sm text-primary-700">
        TOTP is enabled for your account
      </p>

    </div>

  </div>
  <div v-else>
    <div class="">
      <div class="text-sm text-bg">
        TOTP is not enabled on this server
      </div>
    </div>
  </div>
</template>
