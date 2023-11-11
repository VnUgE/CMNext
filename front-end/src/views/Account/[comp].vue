<template>
  <div id="account-template" class="app-component-entry">
    <TabGroup :selectedIndex="tabId" @change="onTabChange" as="div" class="container h-full m-auto mt-0 mb-10 duration-150 ease-linear">

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

        </TabList>
      </div>

      <TabPanels as="div" class="xl:my-16 md:mb-4">
        
        <TabPanel :unmount="false">
          <Profile />
        </TabPanel>
        
        <TabPanel :unmount="false">
          <Settings />
        </TabPanel>

      </TabPanels>

    </TabGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePageGuard, useTitle } from '@vnuge/vnlib.browser'
import { useRouteParams } from '@vueuse/router'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import Settings from './components/settings/Settings.vue'
import Profile from './components/profile/Profile.vue'

usePageGuard()
useTitle('Account')

enum ComponentType{
  Profile = 'profile',
  Oauth = 'oauth',
  Settings = 'settings'
}

const comp = useRouteParams<ComponentType>('comp')

const tabId = computed<number>(() =>{
   switch (comp.value) {
    case ComponentType.Settings:
      return 1
    case ComponentType.Profile:
    default:
      return 0
  }
})

const onTabChange = (tabid : number) =>{
  switch (tabid) {
    case 1:
      comp.value = ComponentType.Settings
      break
    case 0:
    default:
      comp.value = ComponentType.Profile
      break
  }
}

</script>

<style lang="scss">
#account-template{
  p{
    @apply text-gray-700 dark:text-gray-400;
  }

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

  .panel-container .panel-header{
    @apply flex flex-row px-2;
  }

  .panel-container .panel-content{
    @apply bg-white dark:bg-dark-800 border-transparent dark:border-dark-500;
    @apply m-auto max-w-3xl border sm:rounded-md shadow-md sm:p-4 p-3 sm:my-3 my-2;
  }

  .panel-container .panel-header .panel-title{
    @apply my-auto;
  }
}

</style>
