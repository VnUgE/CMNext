<script setup lang="ts">
import { useStore } from '../../store'
import Profile from './components/profile/Profile.vue'
import Security from './components/security/Security.vue'

const store = useStore()
store.setPageTitle('Account')

</script>
<template>
  <div id="account-template" class="app-component-entry">

    <div class="mx-auto mt-6">
      <h3 class="text-2xl">Account</h3>
    </div>

    <div class="flex flex-col items-center justify-center gap-10 mb-20">

      <Profile />

      <Security />

    </div>
  </div>
</template>
