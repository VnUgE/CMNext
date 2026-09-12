<script setup lang="ts">
import { computed } from 'vue';
import { useRouteParams } from '@vueuse/router';
import { useChannelEditor } from '../../../../../lib/useChannelEditor';
import { cmnext } from '../../../../../main';
import ChannelForm from './components/ChannelForm.vue';

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
          {{ editor.isNew.value ? 'Create New Channel' : 'Edit Channel' }}
        </h1>
        <p class="text-base-content/70 mt-1">
          {{
            editor.isNew.value
              ? 'Configure a new channel for your content'
              : 'Modify channel settings and properties'
          }}
        </p>
      </div>
      <div class="flex gap-2">
        <button
          :disabled="waiting || !editor.channel.modified.value"
          class="btn btn-primary"
          type="submit"
          form="channel-edit-form"
        >
          <span v-if="waiting" class="loading loading-spinner loading-sm" />
          <span v-else>{{ editor.isNew.value ? 'Create' : 'Save' }}</span>
        </button>
        <button type="button" class="btn btn-outline" @click.prevent="editor.cancelEdit">
          Cancel
        </button>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="editor.isLoading.value" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Unknown channel id -->
    <div v-else-if="!editor.isNew.value && !editor.hasSource.value" class="text-center py-12">
      <fa-icon icon="bullhorn" size="3x" class="text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold text-base-content/70 mb-2">Channel not found</h3>
      <p class="text-base-content/50 mb-6">
        The requested channel could not be found or you don't have access to it.
      </p>
      <router-link to="/channels" class="btn btn-primary">
        <fa-icon icon="arrow-left" class="mr-2" />
        Back to Channels
      </router-link>
    </div>

    <!-- Channel form -->
    <div v-else id="channel-edit-body" class="my-10">
      <ChannelForm :editor="editor" />
    </div>

    <!-- Delete button for existing channels -->
    <div v-if="!editor.isNew.value && !editor.isLoading.value" class="flex justify-center mt-6">
      <button class="btn btn-error" :disabled="waiting" @click="editor.deleteChannel">
        <fa-icon icon="trash" class="mr-2" />
        Delete Channel Forever
      </button>
    </div>
  </div>
</template>
