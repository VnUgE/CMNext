<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useStore } from '../../../../store'
const CreateApp = defineAsyncComponent(() => import('./CreateApp.vue'))

import SingleApplication from './SingleApplication.vue'
import { useToggle } from '@vueuse/core';

const store = useStore()
const { isLocalAccount } = storeToRefs(store)

const [editNew, toggleEdit] = useToggle()

const newAppClose = () => {
  toggleEdit(false);
  //Reload apps on close
  store.oauth2.refresh();
}

//Load apps
store.oauth2.refresh();

</script>
<template>
  <div id="oauth-apps" class="acnt-content-container">
    <div class="app-container panel-container">
      <div class="mb-6 panel-header">
        <div class="flex ml-0 mr-auto">
          <div class="my-auto panel-title">
            <h4>Your applications</h4>
          </div>
        </div>
        <div class="ml-auto mr-0">
          <div class="button-container">
            <button class="btn primary sm" :disabled="!isLocalAccount" @click="toggleEdit(true)">
              Create App
            </button>
          </div>
        </div>
      </div>
      <div v-if="store.oauth2.apps.length == 0" class="no-apps-container">
        <div class="m-auto">
          You dont have any OAuth2 client applications yet.
        </div>
      </div>
      <div v-else>
        <div v-for="app in store.oauth2.apps" :key="app.Id" class="panel-content">
          <SingleApplication :application="app" :allow-edit="isLocalAccount" />
        </div>
      </div>
    </div>
    <div class="px-2 my-10">
      <div class="m-auto text-sm text-bg">
        OAuth2 applications allow you grant api access to OAuth2 clients using the Client Credentials grant type.
        <a class="link" href="https://oauth.net" target="_blank">
          Learn more
        </a>
      </div>
      <div v-show="!isLocalAccount" class="mt-3 text-center text-red-500">
        You may not create or edit applications if you are using external authentication.
      </div>
    </div>
    <CreateApp :is-open="editNew" @close="newAppClose" />
  </div>
</template>

<style>

#oauth-apps {
  @apply m-auto max-w-3xl;
}

#oauth-apps .app-container .no-apps-container {
  @apply w-full flex h-36 sm:border sm:rounded-md mt-4 mb-20 dark:border-dark-500 border-gray-300;
}

</style>
