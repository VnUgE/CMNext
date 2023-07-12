<template>
    <slot class="flex flex-row">
        <div class="flex-1 px-4 mt-3">
            <div v-if="!showEdit" class="">
                <div class="flex justify-between p-4 pt-0">
                    <div class="w-[20rem]">
                        <h4>{{ $props.title }}</h4>
                    </div>
                     <div class="h-full">
                        <div :class="{'opacity-100':waiting}" class="opacity-0">
                            <fa-icon icon="spinner" class="animate-spin" />
                        </div>
                    </div>
                     <div class="mt-auto">
                        <div class="flex justify-center">
                            <nav aria-label="Pagination">
                                <ul class="inline-flex items-center space-x-1 text-sm rounded-md">
                                    <li>
                                        <button :disabled="isFirstPage" class="page-button" @click="prev">
                                            <fa-icon icon="chevron-left" />
                                        </button>
                                    </li>
                                    <li>
                                        <span class="inline-flex items-center px-4 py-2 space-x-1">
                                            Page 
                                            <b class="mx-1">
                                                {{ currentPage }}
                                            </b>
                                                of
                                            <b class="ml-1">
                                                {{ pageCount }}
                                            </b>
                                        </span>
                                    </li>
                                    <li>
                                        <button :disabled="isLastPage" class="page-button" @click="next">
                                            <fa-icon icon="chevron-right" />
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    
                    <div class="h-fit">
                        <button class="rounded btn primary sm" @click="openNew">
                            <fa-icon :icon="['fas', 'plus']" class="mr-2" />
                            New
                        </button>
                    </div>
                </div>
                <table class="edit-table">
                   <slot name="table" />
                </table>
            </div>
            <div v-else class="">
                <slot name="editor" />
            </div>
        </div>
    </slot>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { useWait } from '@vnuge/vnlib.browser';
import { UseOffsetPaginationReturn } from '@vueuse/core';

const emit = defineEmits(['open-new'])
const props = defineProps<{
    title: string,
    showEdit: boolean,
    pagination: UseOffsetPaginationReturn
}>()

const { showEdit } = toRefs(props)

const { waiting } = useWait()

//Get pagination
const { pageCount, next, prev, isLastPage, isFirstPage, currentPage } = props.pagination

const openNew = () => {
    emit('open-new')
}

</script>

<style lang="scss">

button.page-button{
    @apply inline-flex items-center px-2 py-1.5 space-x-2 font-medium;
    @apply text-gray-500 bg-white border border-gray-300 rounded-full hover:bg-gray-50;
    @apply dark:border-dark-300 dark:bg-transparent dark:text-gray-300 hover:dark:bg-dark-700; 
}

</style>