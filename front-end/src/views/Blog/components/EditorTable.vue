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

const openNew = () => emit('open-new')

</script>

<template>
    <slot class="flex flex-row">
        <div class="flex-1 px-4 mt-3">
            <div v-if="!showEdit" class="">
                <div class="flex justify-between p-4 pt-0">
                    <div class="w-[20rem]">
                        <h4>{{ $props.title }}</h4>
                    </div>
                    <div class="h-full">
                        <div :class="{ 'opacity-100': waiting }" class="opacity-0">
                            <fa-icon icon="spinner" class="animate-spin" />
                        </div>
                    </div>
                    <div class="mt-auto">
                        <div class="flex justify-center">
                            <nav aria-label="Pagination">
                                <ul class="join">
                                    <li>
                                        <button :disabled="isFirstPage" class="join-item btn btn-circle btn-sm" @click="prev">
                                            <fa-icon icon="chevron-left" />
                                        </button>
                                    </li>
                                    <li>
                                        <span class="join-item btn btn-ghost btn-sm">
                                            Page {{ currentPage }} of {{ pageCount }}
                                        </span>
                                    </li>
                                    <li>
                                        <button :disabled="isLastPage" class="join-item btn btn-circle btn-sm" @click="next">
                                            <fa-icon icon="chevron-right" />
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>

                    <div class="h-fit">
                        <button class="btn btn-primary btn-sm" id="new-btn" @click="openNew">
                            <fa-icon :icon="['fas', 'plus']" class="mr-2" />
                            New
                        </button>
                    </div>
                </div>
                <table class="table table-zebra">
                    <slot name="table" />
                </table>
            </div>
            <div v-else class="">
                <slot name="editor" />
            </div>
        </div>
    </slot>
</template>

