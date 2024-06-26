<script setup lang="ts">
import { computed } from 'vue'
import { get, set } from '@vueuse/core'
import { useRouteParams } from '@vueuse/router'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { useStore } from '../../store'
import Settings from './components/settings/Settings.vue'
import Profile from './components/profile/Profile.vue'
import OauthApps from './components/oauth/Oauth.vue'

const store = useStore()
store.setPageTitle('Account')

const oauthEnabled = computed(() => store.oauth2?.apps);

type ComponentType = 'profile' | 'oauth' | 'settings' | ''

const comp = useRouteParams<ComponentType>('comp', '')

const tabId = computed<number>(() => {
  switch (comp.value) {
    case 'oauth':
      //If oauth is not enabled, redirect to profile
      return get(oauthEnabled) ? 2 : 0
    case 'settings':
      return 1
    case 'profile':
    default:
      return 0
  }
})

const onTabChange = (tabid: number) => {
  switch (tabid) {
    case 1:
      set(comp, 'settings')
      break
    case 2:
      set(comp, 'oauth')
      break
    case 0:
    default:
      set(comp, 'profile')
      break
  }
}

</script>
<template>
  <div id="account-template" class="app-component-entry">
    <TabGroup :selectedIndex="tabId" @change="onTabChange" as="div" class="container h-full m-auto mt-0 mb-10 duration-150 ease-linear text-color-foreground">

      <div class="flex w-full py-2 xl:w-auto lg:pt-4 xl:fixed">
        
        <TabList as="div" class="flex flex-row mx-auto mb-1 xl:mx-0 xl:mb-0">
          
          <Tab v-slot="{ selected }" >
            <span class="page-link" :class="{ 'active': selected }">
             Profile
            </span>
          </tab>

          <Tab v-slot="{ selected }" >
            <span class="page-link" :class="{ 'active': selected }">
             Settings
            </span>
          </tab>

          <Tab v-if="oauthEnabled" v-slot="{ selected }" >
            <span class="page-link" :class="{ 'active': selected }">
             OAuth
            </span>
          </tab>

        </TabList>
      </div>

      <TabPanels as="div" class="xl:my-16 md:mb-4">
        
        <TabPanel :unmount="false">
          <Profile />
        </TabPanel>
        
        <TabPanel :unmount="false">
          <Settings />
        </TabPanel>

        <TabPanel v-if="oauthEnabled" :unmount="false">
          <OauthApps />
        </TabPanel>

      </TabPanels>

    </TabGroup>
  </div>
</template>

<style lang="scss">
#account-template{  

  .page-link{
    font-size: 1.1rem;
    @apply border-b-2 border-transparent cursor-pointer mx-2 px-1;
  }

  .page-link.active{
    @apply border-primary-500;
  }

  .acnt-content-container{
    @apply m-auto max-w-3xl;
  }

  .panel-container{

  }

  .text-color-foreground{
    @apply dark:text-white text-black;
  }

  .panel-container .panel-header{
    @apply flex flex-row px-2;
  }

  .panel-container .panel-content{
    @apply bg-white dark:bg-dark-800 border-transparent dark:border-dark-500;
    @apply m-auto max-w-3xl border sm:rounded shadow-md sm:p-4 p-3 sm:my-3 my-2;
  }

  .panel-container .panel-header .panel-title{
    @apply my-auto;
  }
}

</style>
