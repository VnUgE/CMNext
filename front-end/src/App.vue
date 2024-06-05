<template>
  <head>
    <title>{{ metaTile }}</title>
  </head>
  <!-- Import environment component top level as the entrypoint -->
  <Environment @logout="logout()">
    <template #main>
      <router-view />
    </template>
  </Environment>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from './store';
import { storeToRefs } from 'pinia';
import { apiCall } from '@vnuge/vnlib.browser';
import Environment from './bootstrap/Environment.vue';

const store = useStore()
const { siteTitle, pageTitle } = storeToRefs(store)

//Compute meta title from the default site title and the page title
const metaTile = computed(() => `${pageTitle.value} | ${siteTitle.value}`)

const logout = () => {
  apiCall(async () => {
    const { logout } = await store.socialOauth()
    await logout()
  })
}

store.setSiteTitle('CMNext Admin')
store.setPageTitle('Blog')

//Set header routes
store.setHeaderRouteNames(
  ['Login'],
  ['Blog', 'Account', 'Login']
)

</script>