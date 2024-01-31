<script setup lang="ts">
import { computed } from 'vue';
import { useRouteQuery } from '@vueuse/router';
import { TabGroup, TabList, Tab, TabPanels, TabPanel, Switch } from '@headlessui/vue'
import { defer, first } from 'lodash-es';
import { useStore, SortType } from '../../store';
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
    get: () => store.queryState.sort === SortType.ModifiedTime,
    set: (value: boolean) => {
        store.queryState.sort = value ? SortType.ModifiedTime : SortType.CreatedTime
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

                        <div class="border-t border-gray-100 dark:border-dark-500">
                            <div class="px-2">
                                
                                 <Tab v-slot="{ selected }" as="div" class="py-4">
                                    <div class="t group menu-item" :class="{'active':selected}">
                                        
                                        <fa-icon icon="bullhorn" size="lg" />

                                        <span class="opacity-0 tooltip group-hover:opacity-100">
                                            Channel
                                        </span>
                                    </div>
                                </Tab>

                                 <ul class="flex flex-col pt-4 space-y-1 border-t border-gray-100 dark:border-dark-500">
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
                                :class="lastModified ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-500'"
                                class="relative inline-flex items-center w-10 h-5 my-auto duration-75 rounded-full">
                                <span class="sr-only">Last modified</span>
                                <span :class="lastModified ? 'translate-x-6' : 'translate-x-1'"
                                    class="inline-block w-3 h-3 transition transform bg-white rounded-full" />
                            </Switch>
                            <div class="my-auto ml-3">
                                Last Modifed
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

<style lang="scss">

#blog-admin-template{
    @apply flex flex-row flex-auto min-h-[50rem] border rounded-sm max-w-[82rem] mx-auto;
    @apply dark:border-dark-600 dark:text-gray-300 border-gray-200;

    .text-color-foreground{
        @apply dark:text-white text-black;
    }

    .text-color-background{
        @apply text-gray-500;
    }

    .username-box{
        @apply grid w-10 h-10 text-sm rounded-lg place-content-center;
        @apply text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-dark-600;
    }

    .menu-item{
        @apply relative flex justify-center rounded px-2 py-2 cursor-pointer;
        @apply text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-gray-300;

        &.active{
            @apply text-primary-600;
        }

        .tooltip{
            @apply absolute start-full -translate-y-1/2 top-1/2 ms-4 rounded  px-2 py-1.5 text-xs font-medium;
            @apply text-white bg-gray-900 dark:bg-dark-600;
        }
    }
   
    .menu{
        @apply flex flex-col justify-between w-16 border-e;
        @apply bg-white dark:bg-dark-800 dark:border-dark-500;
    }
   
    #channel-select{
        @apply w-full p-1 px-2 border rounded-sm sm:text-sm min-w-[13rem];
        @apply border-gray-300 text-gray-700 bg-white;
        @apply dark:bg-dark-800 dark:border-dark-500 focus:dark:border-dark-400 hover:dark:border-dark-400 dark:text-inherit; 

        option{
            @apply text-base;
        }
    }

    .tab-container{
        @apply flex-1 py-4 rounded-r-sm dark:bg-dark-800 bg-white text-gray-700 dark:text-inherit;
    }

    // Rules for dynamic forms in edit panes
    .dynamic-form.form{
        @apply w-full mt-4 md:px-12;

        .dynamic-form.input-group{
            @apply grid grid-flow-row grid-cols-2;
        }

        .dynamic-form.input-group{
            @apply gap-x-16;

            .dynamic-form.input-container{
                
                .dynamic-form.dynamic-input{
                    @apply border rounded-sm p-2 bg-transparent w-full dark:border-dark-600;
                    @apply dark:bg-dark-800 focus:border-primary-500;

                    &.input-textarea{
                        @apply h-40 outline-none;
                    }

                    &::placeholder{
                        @apply dark:text-gray-500;
                    }
                    
                    &:disabled{
                        @apply text-rose-400;
                    }
                }

                &.dirty.data-invalid .dynamic-form.dynamic-input{
                    @apply border-red-500 focus:border-red-500;
                }

                .dynamic-form.field-description{
                    @apply pt-1 p-2 pb-4 text-sm text-gray-500;
                }

            }

            .dynamic-form.input-label{
                @apply col-span-2 text-right m-auto mr-2;
            }

            .dynamic-form.dynamic-input.input:disabled + .dynamic-form.field-description {
                @apply hidden;
            }
        }
    }

    table.edit-table {
        @apply w-full divide-y-2 divide-gray-200 bg-white text-sm dark:divide-dark-500 dark:bg-dark-800;
        
        thead{
            @apply text-left text-lg;
        }

        tbody{
            @apply divide-y divide-gray-200 dark:divide-dark-500; 
        }

        thead th,
        tr td{
            @apply whitespace-nowrap px-4 py-2 font-medium;
        }

        .fa-image{
            @apply cursor-pointer text-primary-500;
        }
    }

    .ck.ck-editor{
        @apply border dark:border-coolGray-600;
    }

    .ck-editor .ck-content,
    .ck-editor .ck-source-editing-area{
        @apply min-h-[32rem] resize-y dark:bg-dark-800 px-4 dark:border-dark-300 leading-6;
        @apply text-sm;

        a {
            @apply text-blue-500;
        }

        p{
            @apply my-2;
        }

        pre{
            @apply p-2 dark:text-gray-200 my-3;
        }

        h1, h2{
            @apply border-b pb-3 mb-2;
        }

        ul, ol{
            @apply pl-6 pr-3 my-3;
        }

        /* Change some font sizing and spacing up */
        h1{
            @apply text-3xl;
        }

        h2{
            @apply text-2xl;
        }

        h3{
            @apply text-xl;
        }

        h4{
            @apply text-lg;
        }

        h5{
            @apply text-base;
        }

        h6{
            @apply text-sm;
        }
    }

    .ck-source-editing-area textarea{
        @apply dark:bg-transparent;
    }

    .ck.ck-toolbar,
    .ck.ck-reset
    {
        @apply dark:bg-dark-700 dark:text-gray-300 dark:border-dark-300;

        .ck-button,
        .ck-dropdown
        {
            @apply dark:text-gray-300;

            &:hover,
            &.ck-on
            {
                @apply dark:bg-dark-600;
            }
        }
    }
}
</style>