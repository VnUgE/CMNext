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
            <td>
                {{ post.title }}
            </td>
            <td>
                {{ getPostId(post) }}
            </td>
            <td>
                {{ getDateString(post.date) }}
            </td>
            <td>
                {{ post.author }}
            </td>
            <td>
                {{ getSummaryString(post.summary) }}
            </td>
            <td class="w-20">
                <button class="btn xs no-border" @click="copy(post.id)">
                    <fa-icon icon="copy" />
                </button>
                <button class="btn xs no-border" @click="openEdit(post)">
                    <fa-icon icon="pencil" />
                </button>
            </td>
        </tr>
    </tbody>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { filter as _filter, truncate } from 'lodash';
import { useClipboard } from '@vueuse/core';
import { PostMeta } from '@vnuge/cmnext-admin';

const emit = defineEmits(['reload', 'open-edit'])

const props = defineProps<{
    posts: PostMeta[],
}>()

const { posts } = toRefs(props)

const { copy } = useClipboard()

const openEdit = async (post: PostMeta) => emit('open-edit', post)

const getDateString = (time?: number) => new Date((time || 0) * 1000).toLocaleString();
const getSummaryString = (summary?: string) => truncate(summary || '', { length: 40 })
const getPostId = (post: PostMeta) => truncate(post.id || '', { length: 20 })
</script>