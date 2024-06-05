<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import { filter as _filter, defaultTo, includes, truncate } from 'lodash-es';
import { useClipboard } from '@vueuse/core';
import { useWait } from '@vnuge/vnlib.browser';
import { ContentMeta } from '@vnuge/cmnext-admin';
const ImgPreviewDialog = defineAsyncComponent(() => import('../image-preview-dialog.vue'))

const emit = defineEmits(['open-edit', 'copy-link', 'delete', 'download'])
defineProps<{ items: ContentMeta[] }>()

const { waiting } = useWait()
const { copy } = useClipboard()

const previewItem = ref<ContentMeta | undefined>()

const getDateString = (time?: number) => new Date((time || 0) * 1000).toLocaleString();
const getItemLength = (item: ContentMeta) : string =>{
    const length = item.length || 0;
    return length > 1024 ? `${(length / 1024).toFixed(2)} KB` : `${length} B`
}
const getItemId = (item: ContentMeta) => truncate(item.id || '', { length: 20 })
const getItemName = (item : ContentMeta) => truncate(item.name || '', { length: 30 })

const getContentIconType = (item: ContentMeta) => {
    const type = defaultTo(item.content_type, '')
    if (includes(type, 'image')) return 'image'
    if (includes(type, 'video')) return 'video'
    if (includes(type, 'audio')) return 'headphones'
    if (includes(type, 'html')) return 'code'
    if (includes(type, 'zip')) return 'file-zipper'
    return 'file'
}

const isImage = (item: ContentMeta) => includes(item.content_type, 'image')
const openEdit = async (item: ContentMeta) => emit('open-edit', item)
const copyLink = (item : ContentMeta) => emit('copy-link', item)
const deleteItem = (item : ContentMeta) => emit('delete', item)
const download = (item : ContentMeta) => emit('download', item)

const onShowPreview = (item: ContentMeta) => previewItem.value = item
const onClosePreview = () => previewItem.value = undefined

</script>

<template>
    <thead>
        <tr>
            <th>File Name</th>
            <th>Id</th>
            <th>Date</th>
            <th>Content Type</th>
            <th>Size</th>
            <th></th>
        </tr>
    </thead>
    <tbody>
        <tr v-for="item in $props.items" :key="item.id" class="table-row">
            <td>
                <span class="mr-2">
                    <fa-icon v-if="isImage(item)"
                        size="sm" 
                        :icon="getContentIconType(item)" 
                        @click="onShowPreview(item)"
                    />
                     <fa-icon v-else
                        size="sm" 
                        :icon="getContentIconType(item)" 
                    />
                </span>
                <span>
                    {{ getItemName(item) }}
                </span>
            </td>
            <td>
                {{ getItemId(item) }}
            </td>
            <td>
                {{ getDateString(item.date) }}
            </td>
            <td>
                <span>{{ item.content_type }}</span>
            </td>
            <td>
                {{ getItemLength(item) }}
            </td>
            <td class="w-24">
                <fieldset :disabled="waiting">
                     <button class="btn xs no-border" @click="openEdit(item)">
                        <fa-icon icon="pencil" />
                    </button>
                    <button class="btn xs no-border" @click="copyLink(item)">
                        <fa-icon icon="link" />
                    </button>
                    <button class="btn xs no-border" @click="copy(item.id)">
                        <fa-icon icon="copy" />
                    </button>
                    <button class="btn xs no-border" @click="download(item)">
                        <fa-icon icon="file-download" />
                    </button>
                    <button class="btn xs no-border red" @click="deleteItem(item)">
                        <fa-icon icon="trash" />
                    </button>
                </fieldset>
            </td>
        </tr>
    </tbody>
    <!-- Image preview dialog -->
    <ImgPreviewDialog :item="previewItem" @close="onClosePreview()" />
</template>
