<script setup lang="ts">
import { Switch } from '@headlessui/vue'
import { useStore } from '../../../../store'
import Fido from './Fido.vue'
import Pki from './Pki.vue'
import TotpSettings from './TotpSettings.vue'
import PasswordReset from './PasswordReset.vue'

const store = useStore();

//Load mfa methods
store.mfa.refresh();

</script>

<template>
  <div id="account-security-settings">
    <div class="panel-container">

      <div class="panel-header">
        <div class="panel-title">
          <h4 class="text-xl font-bold mb-2">Security</h4>
        </div>
      </div>

      <div id="browser-poll-settings" class="panel-content">
        <div class="flex justify-between">
          <h5>Keep me logged in</h5>
          <div class="pl-1">
            <Switch v-model="store.autoHeartbeat"
              :class="store.autoHeartbeat ? 'bg-primary' : 'bg-base-200'"
              class="relative inline-flex items-center h-6 rounded-full w-11">
              <span class="sr-only">Enable auto heartbeat</span>
              <span :class="store.autoHeartbeat ? 'translate-x-6' : 'translate-x-1'"
                class="inline-block w-4 h-4 transition transform bg-white rounded-full" />
            </Switch>
          </div>
        </div>

        <p class="p-1 text-sm text-bg">
          When enabled, continuously regenerates your login credentials to keep you logged in. The longer you are logged
          in, the easier session fixation attacks become. If disabled, you will need to log when your credentials have
          expired. It is recommneded that you leave this <strong>off</strong>.
        </p>

      </div>

      <password-reset />

      <div id="account-mfa-settings" class="panel-content">
        <h5 class="text-lg font-bold mb-2">Multi Factor Authentication</h5>
        <div class="py-2 border-b-2 border-base-200">
          <TotpSettings />
        </div>
        <div class="py-2">
          <Fido />
        </div>
      </div>

      <Pki />

    </div>
  </div>
</template>