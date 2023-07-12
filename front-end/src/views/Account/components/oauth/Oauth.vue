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
            <button class="btn primary sm" :disabled="!isLocalAccount" @click="editNew = true">
              Create App
            </button>
          </div>
        </div>
      </div>
      <div v-if="apps?.length == 0" class="no-apps-container">
        <div class="m-auto">
          You dont have any OAuth2 client applications yet.
        </div>
      </div>
      <div v-else>
        <div v-for="app in apps" :key="app.data.Id" class="panel-content">
          <SingleApplication :application="app" :allow-edit="isLocalAccount" @appDeleted="loadApps" />
        </div>
      </div>
    </div>
    <div class="px-2 my-10">
      <div class="m-auto text-sm">
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

<script setup lang="ts">
import { ref } from 'vue'
import CreateApp from './CreateApp.vue'
import { useSession, apiCall } from '@vnuge/vnlib.browser'

import SingleApplication from './SingleApplication.vue'
import { AppBuffer, OAuth2Application, useOAuth2Apps } from './o2Api'

const { isLocalAccount } = useSession()
const { getApps } = useOAuth2Apps('/oauth/apps');

const apps = ref<AppBuffer<OAuth2Application>[]>();
const editNew = ref(false);

const loadApps = async () => {
  await apiCall(async () => {
    const appList = await getApps();
    // sort apps from newest to oldest
    appList.sort((a, b) => {
      if (a.data.Created > b.data.Created) return -1
      if (a.data.Created < b.data.Created) return 1
      return 0
    })
    // set the apps
    apps.value = appList
  })
}

const newAppClose = () => {
  editNew.value = false;
  //Reload apps on close
  loadApps();
}

//Load apps, but do not await 
loadApps()

</script>

<style>

#oauth-apps {
  @apply m-auto max-w-3xl;
}

#oauth-apps .app-container .no-apps-container {
  @apply w-full flex h-36 sm:border sm:rounded-md mt-4 mb-20 dark:border-dark-500 border-gray-300;
}

</style>
