<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '../../store'
import Settings from './components/settings/Settings.vue'
import Profile from './components/profile/Profile.vue'
import OauthApps from './components/oauth/Oauth.vue'

const store = useStore()
store.setPageTitle('Account')

const oauthEnabled = computed(() => !!store.oauth2)

</script>
<template>
  <div id="account-template" class="app-component-entry">

    <div class="mx-auto mt-6">
      <h3 class="text-2xl">Account</h3>
    </div>

    <div class="flex flex-col items-center justify-center gap-10 mb-20">

      <Profile />

      <Settings />

      <OauthApps v-if="oauthEnabled" />
    </div>
  </div>
</template>
