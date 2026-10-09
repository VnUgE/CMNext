<script setup lang="ts">
import { ref, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { confirm } from '../../../../../../lib/confirm';
import { onClickOutside, useToggle, whenever } from '@vueuse/core';
import type { PostEditorState } from '../../../../../../lib/usePostEditor';

const props = defineProps<{
  editor: PostEditorState;
}>();

const { post, savePost, saveDraft, deletePost, revertChanges, openPreview, channelId } =
  props.editor;

const router = useRouter();

const isNew = toRef(props.editor.isNew);
const waiting = toRef(props.editor.waiting);

// Options menu attached to the Save split button. The primary Save action
// never opens it — only the chevron toggles it — and it closes on outside
// clicks, on a selection, or when a save starts.
const [optionsOpen, toggleOptions] = useToggle();
const saveSplitRef = ref<HTMLElement | null>(null);

const closeOptions = () => toggleOptions(false);

const navigateBack = async () => {
  if (post.modified.value) {
    const { isCanceled } = await confirm({
      title: 'Unsaved changes',
      message: `Are you sure you want to go back without saving your changes?`,
    });

    if (isCanceled) return;
  }

  await router.push(`/channels/${channelId.value}/posts`);
};

onClickOutside(saveSplitRef, closeOptions);
whenever(waiting, closeOptions);
</script>

<template>
  <div class="sticky top-16 lg:top-0 z-40 bg-base-100 border-b border-base-200 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 md:px-6 py-3">
      <div class="flex items-center justify-between gap-4">
        <!-- Left: back navigation + save status -->
        <div class="flex items-center gap-3 min-w-0">
          <button class="btn btn-ghost btn-sm shrink-0" @click="navigateBack">
            <fa-icon icon="arrow-left" class="mr-2" />
            Back
          </button>

          <!-- Unsaved / saved status indicator -->
          <span
            v-if="post.modified.value"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-warning"
            title="You have unsaved changes"
          >
            <span class="w-2 h-2 rounded-full bg-warning animate-pulse" />
            Unsaved
          </span>
          <span
            v-else-if="!isNew"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-base-content/50"
            title="All changes saved"
          >
            <span class="w-2 h-2 rounded-full bg-success" />
            Saved
          </span>

          <div class="divider divider-horizontal mx-0 hidden sm:flex" />

          <!-- Post identity (hidden on small screens) -->
          <div class="min-w-0 hidden sm:block">
            <p class="text-sm font-semibold text-base-content truncate">
              {{ isNew ? 'New Post' : post.raw.value.title || 'Untitled' }}
            </p>
            <p v-if="!isNew" class="text-xs text-base-content/50">ID: {{ post.raw.value.id }}</p>
          </div>
        </div>

        <!-- Right: preview + save (with options) -->
        <div class="flex items-center gap-2">
          <!-- Preview -->
          <button
            class="btn btn-outline btn-sm"
            :disabled="!post.raw.value.id"
            @click="openPreview"
          >
            <fa-icon icon="eye" class="w-4 h-4 mr-2" />
            Preview
          </button>

          <!-- Save split button: primary save + options chevron -->
          <div ref="saveSplitRef" class="join relative">
            <button
              class="btn btn-primary btn-sm join-item"
              :class="{ loading: waiting }"
              :disabled="waiting || !post.modified"
              @click="savePost"
            >
              <fa-icon v-if="!waiting" icon="save" class="w-4 h-4 mr-2" />
              {{ waiting ? 'Saving' : 'Save' }}
            </button>

            <button
              class="btn btn-primary btn-sm join-item"
              :disabled="waiting"
              :aria-expanded="optionsOpen"
              aria-label="More save options"
              @click="toggleOptions()"
            >
              <fa-icon icon="chevron-down" class="w-4 h-4" />
            </button>

            <!-- Options menu -->
            <ul
              v-if="optionsOpen"
              tabindex="-1"
              class="menu bg-base-100 rounded-box w-48 shadow-lg border border-base-200 z-50 p-1 absolute right-0 top-full mt-2"
            >
              <li>
                <button
                  :disabled="waiting"
                  @click="
                    saveDraft();
                    closeOptions();
                  "
                >
                  <fa-icon icon="copy" class="w-4 h-4" />
                  Save as Draft
                </button>
              </li>
              <li>
                <button
                  :disabled="!post.modified || waiting"
                  @click="
                    revertChanges();
                    closeOptions();
                  "
                >
                  <fa-icon icon="refresh" class="w-4 h-4" />
                  Reset Changes
                </button>
              </li>
              <hr v-if="!isNew" class="menu-divider my-1 text-base-content/20" />
              <li v-if="!isNew">
                <button
                  :disabled="waiting"
                  @click="
                    deletePost();
                    closeOptions();
                  "
                  class="text-error"
                >
                  <fa-icon icon="trash" class="w-4 h-4" />
                  Delete Post
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
