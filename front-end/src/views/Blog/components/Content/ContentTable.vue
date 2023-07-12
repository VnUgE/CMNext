<template>
    <thead>
        <tr>
            <th>File Name</th>
            <th>Id</th>
            <th>Date</th>
            <th>Content Type</th>
            <th>Length</th>
            <th></th>
        </tr>
    </thead>
    <tbody>
        <tr v-for="item in content" :key="item.id" class="table-row">
            <td>
                {{ getItemName(item) }}
            </td>
            <td>
                {{ getItemId(item) }}
            </td>
            <td>
                {{ getDateString(item.date) }}
            </td>
            <td>
                {{ item.content_type }}
            </td>
            <td>
                {{ getItemLength(item) }}
            </td>
            <td class="w-24">
                <fieldset :disabled="waiting">
                    <button class="btn xs no-border" @click="copyLink(item)">
                        <fa-icon icon="link" />
                    </button>
                    <button class="btn xs no-border" @click="copy(item.id)">
                        <fa-icon icon="copy" />
                    </button>
                    <button class="btn xs no-border" @click="openEdit(item)">
                        <fa-icon icon="pencil" />
                    </button>
                </fieldset>
            </td>
        </tr>
    </tbody>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { filter as _filter, truncate } from 'lodash';
import { useClipboard } from '@vueuse/core';
import { useWait } from '@vnuge/vnlib.browser';
import { ContentMeta } from '@vnuge/cmnext-admin';

const emit = defineEmits(['open-edit', 'copy-link'])

const props = defineProps<{
    content: ContentMeta[]
}>()

const { content } = toRefs(props)

const { waiting } = useWait()
const { copy } = useClipboard()

const getDateString = (time?: number) => new Date((time || 0) * 1000).toLocaleString();
const getItemLength = (item: ContentMeta) : string =>{
    const length = item.length || 0;
    return length > 1024 ? `${(length / 1024).toFixed(2)} KB` : `${length} B`
}
const getItemId = (item: ContentMeta) => truncate(item.id || '', { length: 20 })
const getItemName = (item : ContentMeta) => truncate(item.name || '', { length: 30 })

const openEdit = async (item: ContentMeta) => emit('open-edit', item)
const copyLink = (item : ContentMeta) => emit('copy-link', item)

</script>