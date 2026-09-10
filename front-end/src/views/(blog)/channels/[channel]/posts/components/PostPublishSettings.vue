<script setup lang="ts">
import { computed } from 'vue';
import { formatDate } from '../../../../../../lib/helpers';
import type { PostEditorState } from '../../../../../../lib/usePostEditor';

const props = defineProps<{
  editor: PostEditorState;
}>();

const { post, isNew, imageLoadError, channelId, channels } = props.editor;
const { buffer, errors, raw } = post;

const postCreatedDate = computed(() => formatDate(raw.value.created));
</script>

<template>
  <div class="card bg-base-100 shadow-xl border border-base-200">
    <div class="flex items-center justify-between px-4 py-3 border-b border-base-200">
      <h3 class="card-title text-base">
        <fa-icon icon="cog" class="w-4 h-4" />
        Publish Settings
      </h3>
    </div>
    <div class="card-body p-4 space-y-4">
      <!-- Channel Selection -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Channel</span>
        </label>
        <select
          v-model="channelId"
          class="select select-bordered select-sm w-full"
          :disabled="!isNew"
        >
          <option value="">Select Channel</option>
          <option v-for="channel in channels" :key="channel.id" :value="channel.id">
            {{ channel.name }}
          </option>
        </select>
        <label class="label">
          <span v-if="!isNew" class="label-text-alt text-warning">
            Cannot change channel after creation
          </span>
        </label>
      </div>

      <!-- Date -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Publication Date</span>
        </label>
        <input :value="postCreatedDate" disabled class="input input-bordered input-sm w-full" />
      </div>

      <!-- Author -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Author</span>
          <span v-if="errors.author?.isError" class="label-text-alt text-error">
            {{ errors.author?.message }}
          </span>
        </label>
        <input
          v-model="buffer.author"
          type="text"
          placeholder="Author name..."
          class="input input-bordered w-full"
        />
      </div>

      <!-- Image URL -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Featured Image</span>
        </label>
        <input
          v-model="buffer.image"
          type="url"
          placeholder="https://example.com/image.jpg"
          class="input input-bordered input-sm w-full"
        />
        <div v-if="buffer.image" class="mt-2">
          <img
            :src="buffer.image"
            alt="Featured image preview"
            class="w-full h-32 object-cover rounded border"
            @error="imageLoadError = true"
            @load="imageLoadError = false"
          />
          <div v-if="imageLoadError" class="text-error text-xs mt-1">Failed to load image</div>
        </div>
      </div>
    </div>
  </div>
</template>
