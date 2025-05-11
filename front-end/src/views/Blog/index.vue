<script setup lang="ts">
import { computed } from 'vue';
import { useRouteQuery } from '@vueuse/router';
import { TabGroup, TabList, Tab, TabPanels, TabPanel, Switch } from '@headlessui/vue'
import { defer, first } from 'lodash-es';
import { useStore } from '../../store';
import Channels from './components/Channels.vue';
import Posts from './components/Posts.vue';
import Content from './components/Content.vue';

//Protect page
const store = useStore()
store.setPageTitle('Blog Admin')

const firstLetter = computed(() => first(store.userName))
const tabIdQ = useRouteQuery<string>('tabid', '', { mode: 'push' })

//Map queries to their respective computed values
const tabId = computed(() => tabIdQ.value ? parseInt(tabIdQ.value) : 0);
const lastModified = computed({
    get: () => store.queryState.sort === 'date',
    set: (value: boolean) => {
        store.queryState.sort = value ? 'date' : 'created'
    }
})

const onTabChange = (id: number) => tabIdQ.value = id.toString(10)

//Load channels on page load
defer(() => store.channels.refresh());

</script>
<template>
    <div class="container mx-auto mt-10 mb-[10rem]">
        <div id="blog-admin-template" class="">
            
           <TabGroup vertical :selected-index="tabId" @change="onTabChange">
                <div class="menu">
                    <TabList>
                        <div class="inline-flex items-center justify-center w-16 h-16">
                            <span class="username-box">
                                {{ firstLetter }}
                            </span>
                        </div>

                        <div class="border-t border-base-300">
                            <div class="px-2">
                                
                                 <Tab v-slot="{ selected }" as="div" class="py-4">
                                    <div class="t group menu-item" :class="{'active':selected}">
                                        
                                        <fa-icon icon="bullhorn" size="lg" />

                                        <span class="opacity-0 tooltip group-hover:opacity-100">
                                            Channel
                                        </span>
                                    </div>
                                </Tab>

                                 <ul class="flex flex-col pt-4 space-y-1 border-t border-base-300">
                                    <Tab v-slot="{ selected }" as="li">
                                        <div class="group menu-item" :class="{'active':selected}">
                                            
                                            <fa-icon icon="comment" size="xl" />

                                            <span class="opacity-0 tooltip group-hover:opacity-100">
                                                Posts
                                            </span>
                                        </div>
                                    </Tab>
                                    <Tab v-slot="{ selected }" as="li">
                                         <div class="group menu-item" :class="{'active':selected}">
                                            
                                            <fa-icon icon="folder-open" size="lg" />

                                            <span class="opacity-0 tooltip group-hover:opacity-100">
                                                Content
                                            </span>
                                        </div>
                                    </Tab>
                                   
                                 </ul>
                            </div>
                        </div>
                    </TabList>
                </div>
                
                <TabPanels class="tab-container">
                    <div class="flex flex-row h-12 px-4 pb-2">
                        
                        <div class="inline-flex flex-row gap-3">
                            <div class="my-auto">
                                <fa-icon icon="bullhorn"  />
                            </div>
                            
                            <select id="channel-select" class="" v-model="store.channels.selectedId">
                                <option value="">Select Channel</option>
                                <option v-for="c in store.channels.all" :value="c.id">
                                    {{ c.name }}
                                </option>
                            </select>
                        </div>
                        
                        <div class="flex flex-row w-full max-w-md gap-4 ml-auto mr-4 filter">
                            <div class="my-auto">Filter</div>
                            <input class="w-full rounded input primary" v-model="store.queryState.search"/>
                        </div>
                        
                        <div class="flex flex-row py-2 mr-auto">
                            <Switch v-model="lastModified"
                                :class="lastModified ? 'bg-primary' : 'bg-base-300'"
                                class="relative inline-flex items-center w-10 h-5 my-auto duration-75 rounded-full">
                                <span class="sr-only">Last modified</span>
                                <span :class="lastModified ? 'translate-x-6' : 'translate-x-1'"
                                    class="inline-block w-3 h-3 transition transform bg-white rounded-full" />
                            </Switch>
                            <div class="my-auto ml-3">
                                Last Modified
                            </div>
                        
                        </div>
                    </div>

                    <TabPanel>
                        <Channels />
                    </TabPanel>
                    
                    <TabPanel>
                       <Posts />
                    </TabPanel>
                    
                    <TabPanel>
                        <Content />
                    </TabPanel>
                
                </TabPanels>
           </TabGroup>
        </div>
    </div>
</template>
