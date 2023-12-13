<template>
  <div id="account-security-settings">
    <div class="panel-container">
      
      <div class="panel-header">
        <div class="panel-title">
          <h4>Security</h4>
        </div>
      </div>

      <password-reset :totpEnabled="totpEnabled" :fido-enabled="fidoEnabled" />

      <div id="account-mfa-settings" class="panel-content">
        <h5>Multi Factor Authentication</h5>
        <div class="py-2 border-b-2 border-gray-200 dark:border-dark-500">
          <TotpSettings />
        </div>
        <div class="py-2">
          <Fido :fido-enabled="fidoEnabled"/>
        </div>
      </div>

      <Pki />

      <div id="browser-poll-settings" class="panel-content" >
        <div class="flex justify-between">
          <h5>Keep me logged in</h5>
          <div class="pl-1">
              <Switch
                v-model="autoHeartbeat"
                :class="autoHeartbeat ? 'bg-primary-500 dark:bg-primary-600' : 'bg-gray-200 dark:bg-dark-500'"
                class="relative inline-flex items-center h-6 rounded-full w-11"
              >
                <span class="sr-only">Enable auto heartbeat</span>
                <span
                  :class="autoHeartbeat ? 'translate-x-6' : 'translate-x-1'"
                  class="inline-block w-4 h-4 transition transform bg-white rounded-full"
                />
              </Switch>
          </div>
        </div>

        <p class="p-1 text-sm text-color-background">
          When enabled, continuously regenerates your login credentials to keep you logged in. The longer you are logged in,
          the easier session fixation attacks become. If disabled, you will need to log when your credentials have expired.
          It is recommneded that you leave this <strong>off</strong>.
        </p>
        
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MfaMethod } from '@vnuge/vnlib.browser'
import { computed } from 'vue'
import { Switch } from '@headlessui/vue'
import { includes } from 'lodash-es'
import { storeToRefs } from 'pinia'
import { useStore } from '../../../../store'
import Fido from './Fido.vue'
import Pki from './Pki.vue'
import TotpSettings from './TotpSettings.vue'
import PasswordReset from './PasswordReset.vue'

const store = useStore();
const { autoHeartbeat } = storeToRefs(store);

//Load mfa methods
store.mfaRefreshMethods();

const fidoEnabled = computed(() => includes(store.mfaEndabledMethods, 'fido' as MfaMethod))
const totpEnabled = computed(() => includes(store.mfaEndabledMethods, MfaMethod.TOTP))

</script>

<style>

#account-security-settings .modal-body{
    @apply w-full sm:max-w-md ;
}

</style>
