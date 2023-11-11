<template>
      <thead>
        <tr>
            <th>Title</th>
            <th>Id</th>
            <th>Date</th>
            <th>Author</th>
            <th>Summary</th>
            <th></th>
        </tr>
    </thead>
    <tbody>
        <tr v-for="post in posts" :key="post.id" class="table-row">
            <td class="truncate max-w-[16rem]">
                {{ post.title }}
            </td>
            <td>
                {{ getPostId(post) }}
            </td>
            <td>
                {{ getDateString(post.date) }}
            </td>
            <td class="truncate max-w-[10rem]">
                {{ post.author }}
            </td>
            <td class="truncate max-w-[16rem]">
                {{ post.summary }}
            </td>
            <td class="w-20">
                 <button class="btn xs no-border" @click="openEdit(post)">
                    <fa-icon icon="pencil" />
                </button>
                <button class="btn xs no-border" @click="copy(post.id)">
                    <fa-icon icon="copy" />
                </button>
                <button class="btn xs no-border red" @click="onDelete(post)">
                    <fa-icon icon="trash" />
                </button>
            </td>
        </tr>
    </tbody>
</template>

<script setup lang="ts">
import { toRefs, watch } from 'vue';
import { filter as _filter, truncate } from 'lodash-es';
import { useClipboard } from '@vueuse/core';
import { PostMeta } from '@vnuge/cmnext-admin';
import { useGeneralToaster } from '@vnuge/vnlib.browser';

const emit = defineEmits(['reload', 'open-edit', 'delete'])

const props = defineProps<{
    posts: PostMeta[],
}>()

const { posts } = toRefs(props)

const { copy, copied } = useClipboard()
const { info } = useGeneralToaster()

const openEdit = async (post: PostMeta) => emit('open-edit', post)

const getDateString = (time?: number) => new Date((time || 0) * 1000).toLocaleString();
const getPostId = (post: PostMeta) => truncate(post.id || '', { length: 20 })
const onDelete = (post: PostMeta) => emit('delete', post)

watch(copied, (c) => c ? info({'title':'Copied to clipboard'}) : null)
</script>