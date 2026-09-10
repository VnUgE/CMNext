<script setup lang="ts">
import { computed } from 'vue';
import { useRouteParams } from '@vueuse/router';
import { useChannelEditor } from '../../../../../lib/useChannelEditor';
import { cmnext } from '../../../../../main';
import ChannelForm from './ChannelForm.vue';

// Get channel ID from query params (e.g., /channels/:channel/edit)
const channelId = useRouteParams<string>('channel', '');

// Initialize channel editor with centralized state
const editor = useChannelEditor(cmnext, channelId);
const waiting = computed(() => editor.waiting.value);
</script>

<template>
  <div id="channel-editor-page" class="p-6 space-y-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-base-content">
          {{ editor.isNew ? 'Create New Channel' : 'Edit Channel' }}
        </h1>
        <p class="text-base-content/70 mt-1">
          {{
            editor.isNew
              ? 'Configure a new channel for your content'
              : 'Modify channel settings and properties'
          }}
        </p>
      </div>
      <div class="flex gap-2">
        <button
          :disabled="waiting || !editor.channel.modified.value"
          class="btn btn-primary"
          form="channel-edit-form"
          @click.prevent="editor.saveChannel"
        >
          <span v-if="waiting" class="loading loading-spinner loading-sm" />
          <span v-else>{{ editor.isNew ? 'Create' : 'Save' }}</span>
        </button>
        <button class="btn btn-outline" @click.prevent="editor.cancelEdit">Cancel</button>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="editor.isLoading.value" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Channel form -->
    <div v-else id="channel-edit-body" class="my-10">
      <ChannelForm :editor="editor" />
    </div>

    <!-- Delete button for existing channels -->
    <div v-if="!editor.isNew && !editor.isLoading" class="flex justify-center mt-6">
      <button class="btn btn-error" :disabled="waiting" @click="editor.deleteChannel">
        <fa-icon icon="trash" class="mr-2" />
        Delete Channel Forever
      </button>
    </div>
  </div>
</template>
