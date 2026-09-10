<script setup lang="ts">
import { computed } from 'vue';
import { formatDate } from '../../../../../../lib/helpers';
import type { PostEditorState } from '../../../../../../lib/usePostEditor';

const props = defineProps<{
  editor: PostEditorState;
}>();

const { isNew, saveDraft, revertChanges, waiting } = props.editor;
const { buffer, modified, raw } = props.editor.post;

const contentLength = computed(() => buffer.content?.length || 0);
const wordCount = computed(() => {
  if (!buffer.content) return 0;

  return buffer.content
    .trim()
    .split(/\s+/)
    .filter((word: string) => word.length > 0).length;
});
</script>

<template>
  <div class="card bg-base-100 shadow-xl border border-base-200">
    <div class="flex items-center justify-between px-4 py-3 border-b border-base-200">
      <h3 class="card-title text-base">
        <fa-icon icon="bolt" class="w-4 h-4" />
        Quick Actions
      </h3>
    </div>
    <div class="card-body p-4 space-y-2">
      <button class="btn btn-outline btn-sm w-full" :disabled="waiting" @click="saveDraft">
        <fa-icon icon="copy" class="w-4 h-4" />
        Save as Draft
      </button>

      <button class="btn btn-outline btn-sm w-full" :disabled="!modified" @click="revertChanges">
        <fa-icon icon="refresh" class="w-4 h-4" />
        Reset Changes
      </button>

      <div class="divider my-2" />

      <div class="text-xs text-base-content/60 space-y-1">
        <div class="flex justify-between">
          <span>Characters:</span>
          <span>{{ contentLength }}</span>
        </div>
        <div class="flex justify-between">
          <span>Words:</span>
          <span>{{ wordCount }}</span>
        </div>
        <div v-if="!isNew" class="flex justify-between">
          <span>Last saved:</span>
          <span>{{ formatDate(raw?.created) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
