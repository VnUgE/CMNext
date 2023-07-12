<template>
    <thead>
        <tr>
            <th>Name</th>
            <th>Path</th>
            <th>Index</th>
            <th>Feed?</th>
            <th></th>
        </tr>
    </thead>
    <tbody>
        <tr v-for="channel in channels" :key="channel.id" class="table-row">
            <td>
                {{ channel.name }}
            </td>
            <td>
                {{ channel.path }}
            </td>
            <td>
                {{ channel.index }}
            </td>
            <td>
                {{ feedEnabled(channel) }}
            </td>
            <td class="w-12">
                <button class="btn xs no-border" @click="openEdit(channel)">
                    <fa-icon icon="pencil" />
                </button>
            </td>
        </tr>
    </tbody>
</template>

<script setup lang="ts">
import { BlogChannel } from '@vnuge/cmnext-admin';
import { toRefs } from 'vue';
const emit = defineEmits(['open-edit'])

const props = defineProps<{
    channels:BlogChannel[]
}>()

const { channels } = toRefs(props)

const feedEnabled = (channel: BlogChannel) => channel.feed ? 'Enabled' : 'Disabled'
const openEdit = (channel: BlogChannel) => emit('open-edit', channel)

</script>
