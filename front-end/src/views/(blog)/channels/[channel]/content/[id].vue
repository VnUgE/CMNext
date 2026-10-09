<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { get, set, reactiveComputed, useObjectUrl, useDropZone, useFileDialog } from '@vueuse/core';
import { useRouteParams } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { type ContentMeta } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { clone, first } from 'lodash-es';
import * as yup from 'yup';
import { cmnext, toaster } from '../../../../../main';
import { useFormValidation } from '../../../../../lib/forms';
import { confirm } from '../../../../../lib/confirm';
import { formatBytes, formatDate } from '../../../../../lib/helpers';

// ContentMeta is readonly; the form buffer needs to be writable
type EditableContentMeta = { -readonly [K in keyof ContentMeta]: ContentMeta[K] };

const router = useRouter();
const { waiting, invoke: apiCall } = useApiCall({ toaster });
const { validate } = useFormValidation({ toaster });

const id = useRouteParams<string>('id', '');
const channelId = useRouteParams<string>('channel', '');

const contentApi = cmnext.createContentStore(channelId);
const editFile = contentApi.single(id);

const dropZoneEl = ref<HTMLElement>();
const uploadProgress = ref(0);

const metaBuffer = reactiveComputed<Required<EditableContentMeta>>(
  () => clone(get(editFile) ?? ({} as ContentMeta)) as Required<EditableContentMeta>
);

const { file, isImage, previewUrl, isOverDropZone, open, clear } = (() => {
  const file = ref<File | undefined>();
  const isImage = computed(() => !!get(file)?.type.startsWith('image/'));
  const previewUrl = useObjectUrl(() => (get(isImage) ? get(file) : null));

  const selectFile = (f?: File) => {
    set(file, f);
    metaBuffer.name = f?.name ?? get(editFile)?.name ?? '';
  };

  const { open, reset, onChange } = useFileDialog({ accept: '*' });
  const { isOverDropZone } = useDropZone(dropZoneEl, {
    onDrop: (files) => selectFile(first(files)),
  });

  onChange((f) => selectFile(first(f)));

  const clear = () => {
    selectFile(undefined);
    reset();
  };

  return { file, isImage, previewUrl, isOverDropZone, open, clear };
})();

const isNew = computed(() => !get(editFile)?.id);
const backTarget = computed(() => `/channels/${get(channelId)}/content`);
const boxFilled = computed(() => !!get(editFile)?.id || !!get(file));

const contentSchema = yup.object({
  name: yup
    .string()
    .required('File name is required')
    .max(50, 'File name must be less than 50 characters')
    .matches(/^[a-zA-Z0-9 \-.]*$/, 'The file name contains invalid characters'),
});

const goBack = () => router.push(get(backTarget));

const onSubmit = async () => {
  const existingMeta = get(editFile);
  const newFile = get(file);

  // New content requires a file; existing content can rename-only
  if (!existingMeta?.id && !newFile) {
    toaster.error('No File Selected', 'Choose a file to upload before saving.');
    return;
  }

  // Replacing an existing file needs confirmation
  if (existingMeta?.id && newFile) {
    const { isCanceled } = await confirm({
      title: 'Overwrite File?',
      message: 'Are you sure you want to overwrite the file? This action cannot be undone.',
    });
    if (isCanceled) return;
  }

  if (!(await validate(metaBuffer, contentSchema))) return;

  const onUploadProgress = (e: { loaded: number; total?: number }) => {
    if (e.total) set(uploadProgress, Math.min(99, Math.round((e.loaded / e.total) * 100)));
  };

  await apiCall(async () => {
    if (newFile) {
      // Set upload progress > 0 to show indicator
      set(uploadProgress, 1);
      // If existing file is set, then update it's content (overwrite)
      if (existingMeta?.id) {
        await contentApi.updateContent(metaBuffer, newFile, { onUploadProgress });
        toaster.success('File Updated', `"${metaBuffer.name}" has been updated successfully.`);
      } else {
        await contentApi.uploadContent(newFile, metaBuffer.name, { onUploadProgress });
        toaster.success('File Uploaded', `"${metaBuffer.name}" has been uploaded successfully.`);
      }
    } else {
      await contentApi.updateContentName(metaBuffer, metaBuffer.name);
      toaster.success('File Updated', `"${metaBuffer.name}" has been updated successfully.`);
    }

    goBack();
  });

  // clear progress indicator
  set(uploadProgress, 0);
};

const onDelete = async () => {
  const target = get(editFile);
  if (!target?.id) return;

  const { isCanceled } = await confirm({
    title: 'Delete File?',
    message: `Are you sure you want to delete the file "${target.name}"? This action cannot be undone.`,
  });
  if (isCanceled) return;

  await apiCall(async () => {
    await contentApi.delete(target);
    toaster.success('File Deleted', `File "${target.name}" has been deleted.`);
    await goBack();
  });
};

watchEffect(() => {
  if (get(id) && get(id) !== 'new') contentApi.refresh();
});
</script>

<template>
  <div id="content-editor-page" class="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-4 min-w-0">
        <router-link :to="backTarget" class="btn btn-ghost btn-sm shrink-0">
          <fa-icon icon="arrow-left" class="mr-2" />
          Back
        </router-link>
        <div class="divider divider-horizontal mx-0" />
        <div class="min-w-0">
          <h1 class="text-2xl md:text-3xl font-bold text-base-content truncate">
            {{ isNew ? 'Upload Content' : 'Edit File' }}
          </h1>
          <p class="text-base-content/70 mt-1">
            {{ isNew ? 'Upload a file to this channel' : 'Rename or replace the stored file' }}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:flex gap-2 shrink-0">
        <button
          type="submit"
          form="content-upload-form"
          :disabled="waiting || (!isNew && !editFile?.id)"
          class="btn btn-primary"
        >
          <span v-if="waiting" class="loading loading-spinner loading-sm" />
          <fa-icon v-else :icon="isNew ? 'file-upload' : 'save'" class="mr-2" />
          <span>{{
            waiting ? (isNew ? 'Uploading...' : 'Saving...') : isNew ? 'Upload' : 'Save'
          }}</span>
        </button>
        <button type="button" class="btn btn-outline" @click="goBack">Cancel</button>
      </div>
    </div>

    <form id="content-upload-form" class="space-y-5" @submit.prevent="onSubmit">
      <!-- File box -->
      <div
        id="file-drop-zone"
        ref="dropZoneEl"
        role="button"
        tabindex="0"
        :aria-label="isNew ? 'Select file to upload' : 'Replace file'"
        class="transition-all duration-150 ease-linear rounded-xl cursor-pointer border-2 hover:border-primary/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
        :class="[
          boxFilled
            ? 'border-base-300 bg-base-100 shadow-sm px-5 py-4'
            : 'border-dashed border-base-300 bg-linear-to-b from-primary/[0.07] to-transparent px-6 py-14',
          { 'border-primary bg-primary/10 shadow-lg': isOverDropZone },
        ]"
        @click="open()"
        @keydown.enter.prevent="open()"
        @keydown.space.prevent="open()"
      >
        <!-- Empty state -->
        <div v-if="!boxFilled" class="text-center">
          <span class="inline-flex rounded-full bg-primary/10 p-5">
            <fa-icon icon="file-upload" class="text-3xl text-primary" />
          </span>
          <p class="mt-4 font-semibold text-lg">Drag & drop your file here</p>
          <p class="text-sm opacity-70 mt-1">or click to browse your device</p>
        </div>

        <!-- Stored or selected file -->
        <div v-else class="flex items-center gap-4 min-w-0">
          <img
            v-if="isImage && previewUrl"
            :src="previewUrl"
            :alt="file?.name"
            class="w-14 h-14 rounded-lg object-cover ring-2 ring-base-300 shrink-0"
          />
          <span v-else class="inline-flex rounded-lg bg-primary/10 p-3.5 shrink-0">
            <fa-icon icon="file-alt" class="text-2xl text-primary" />
          </span>
          <div class="min-w-0 flex-1 text-sm">
            <div class="font-medium truncate" :title="file?.name || editFile?.name">
              {{ file?.name || editFile?.name }}
            </div>
            <div class="mt-0.5 opacity-70">
              {{ file?.size != null ? formatBytes(file.size) : formatBytes(editFile?.length ?? 0) }}
              ·
              {{ file?.type || editFile?.content_type || 'Unknown type' }}
            </div>
            <div v-if="editFile?.id && !file" class="mt-0.5 text-xs opacity-60">
              Click or drop a file to replace it
            </div>
          </div>
          <button
            v-if="file"
            type="button"
            class="btn btn-sm btn-ghost btn-square shrink-0"
            title="Remove File"
            aria-label="Remove selected file"
            @click.stop="clear"
          >
            <fa-icon icon="trash" />
          </button>
        </div>
      </div>

      <!-- Upload progress -->
      <div v-if="uploadProgress > 0" class="space-y-1.5" aria-live="polite">
        <div class="flex items-center justify-between text-xs opacity-70">
          <span>Uploading…</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <progress
          class="progress progress-primary w-full"
          :value="uploadProgress"
          max="100"
        ></progress>
      </div>

      <p v-if="file && !isNew" class="text-sm text-warning flex items-center gap-2">
        <fa-icon icon="triangle-exclamation" class="shrink-0" />
        This file will overwrite the existing one.
      </p>

      <!-- File name -->
      <div class="form-control w-full">
        <label class="label" for="content-name-input">
          <span class="label-text">File Name</span>
        </label>
        <input
          id="content-name-input"
          v-model="metaBuffer.name"
          type="text"
          class="input input-bordered w-full"
          placeholder="my-file.png"
          :disabled="waiting"
        />
      </div>

      <!-- Stored file info -->
      <div v-if="!isNew" class="mt-6">
        <h3 class="text-lg font-semibold">Reference</h3>
        <div class="text-sm opacity-70 space-y-1 mt-2">
          <div class="flex justify-between gap-2">
            <span>Size</span>
            <span class="font-mono">{{ formatBytes(editFile?.length ?? 0) }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span>Modified</span>
            <span>{{ formatDate(editFile?.date) }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span>Type</span>
            <span class="badge badge-sm badge-ghost font-mono">{{ editFile?.content_type }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span>Path</span>
            <span class="font-mono truncate" :title="editFile?.path">{{ editFile?.path }}</span>
          </div>
        </div>
      </div>

      <!-- Delete -->
      <div v-if="!isNew" class="flex justify-end">
        <button
          type="button"
          class="btn btn-ghost btn-sm text-error"
          :disabled="waiting"
          @click="onDelete"
        >
          <fa-icon icon="trash" class="mr-2" />
          Delete File
        </button>
      </div>
    </form>

    <!-- Footer spacing -->
    <div class="h-8" />
  </div>
</template>
