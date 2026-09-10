<script setup lang="ts">
import type { PostEditorState } from '../../../../../../lib/usePostEditor';

const props = defineProps<{
  editor: PostEditorState;
}>();

const { post, isNew, waiting, savePost, deletePost, navigateBack, openPreview } = props.editor;
</script>

<template>
  <div class="sticky top-0 z-40 bg-base-100 border-b border-base-200 shadow-sm">
    <div class="container mx-auto px-6 py-4">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="flex items-center gap-4">
          <button class="btn btn-ghost btn-sm" @click="navigateBack">
            <fa-icon icon="arrow-left" class="mr-2" />
            Back
          </button>
          <div class="divider divider-horizontal mx-0" />
          <div>
            <h1 class="text-3xl font-bold text-base-content">
              {{ isNew ? 'Create New Post' : 'Edit Post' }}
            </h1>
            <p v-if="!isNew" class="text-base-content/70 mt-1">ID: {{ post.raw.value.id }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <!-- Save Button -->
          <button
            class="btn btn-primary"
            :class="{ loading: waiting }"
            :disabled="waiting || !post.modified"
            @click="savePost"
          >
            <fa-icon v-if="!waiting" icon="save" class="mr-2" />
            {{ waiting ? 'Saving...' : 'Save Post' }}
          </button>

          <!-- Preview Button -->
          <button class="btn btn-outline" :disabled="!post.raw.value.id" @click="openPreview">
            <fa-icon icon="eye" class="mr-2" />
            Preview
          </button>

          <!-- Delete Button (only for existing posts) -->
          <button v-if="!isNew" class="btn btn-outline btn-error" @click="deletePost">
            <fa-icon icon="trash" class="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
