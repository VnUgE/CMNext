<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { apiCall, useWait } from '@vnuge/vnlib.browser';
import { computed, Ref, ref } from 'vue';
import { map, slice, truncate } from 'lodash-es';
import { ContentMeta } from '@vnuge/cmnext-admin';
import { useStore } from '../../../store';

const emit = defineEmits(['selected'])
const store = useStore()

const { waiting } = useWait()

const search = ref('')
const searcher = store.content.createReactiveSearch(search);

interface ContentResult extends ContentMeta {
    readonly shortId: string,
    readonly shortName: string,
    readonly copied: Ref<boolean>,
    copyLink(): void
}

const searchResults = computed<ContentResult[]>(() => {
    const current = slice(searcher.value, 0, 5);

    //Copies the link to the clipboard from the server to insert into the editor
    const copyLink = (result : ContentMeta, copy : (text: string) => Promise<void> ) => {
        apiCall(async () =>{
            const link = await store.content.getPublicUrl(result);
            await copy(link);
        })
    }

    //Formats the result for display
    return map(current, content => {
        //scoped clipboard for copy link
        const { copied, copy } = useClipboard();
        return {
            ...content,
            //truncate the id and name for display
            shortId: truncate(content.id, { length: 18 }),
            shortName: truncate(content.name, { length: 36 }),
            copyLink: () => copyLink(content, copy),
            copied
        }
    })
})

const onSelected = (result: ContentResult) => {
    emit('selected', result)
}

</script>

<template>
    <div id="content-search" class="my-4">
        <div class="">
            <div class="">
                <input class="w-full input input-bordered" placeholder="Search..." v-model="search" />
            </div>
        </div>
        <div class="search-results">
            <div v-if="searchResults.length == 0" class="result">
                No results found.
            </div>
            <div v-else v-for="result in searchResults" :key="result.id" @click.prevent="onSelected(result)" class="result">
                <div class="flex-auto result name">
                    {{ result.shortName }}
                </div>
                <div class="result id">
                    {{ result.shortId }}
                </div>
                <div class="rseult controls">
                    <div v-if="waiting">
                        <fa-icon icon="spinner" spin />
                    </div>
                    <div v-else-if="result.copied.value" class="text-sm text-warning">
                        copied
                    </div>
                    <div v-else class="">
                         <button class="btn btn-secondary btn-sm btn-ghost" @click="result.copyLink()">
                            <fa-icon icon="link" />
                         </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

