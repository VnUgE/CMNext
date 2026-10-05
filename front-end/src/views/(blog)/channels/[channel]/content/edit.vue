<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { reactiveComputed, useFileDialog, useDropZone } from '@vueuse/core';
import { useRouteParams, useRouteQuery } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { type ContentMeta } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { clone, defaultTo, first, isEmpty, round } from 'lodash-es';
import * as yup from 'yup';
import { cmnext, toaster } from '../../../../../main';
import { useFormValidation } from '../../../../../lib/forms';
import { confirm } from '../../../../../lib/confirm';
import { useStore } from '../../../../../store';

const store = useStore();
const router = useRouter();
const { waiting, invoke: apiCall } = useApiCall({ toaster });

// Set page title
store.setPageTitle('Edit Content');

// Get route parameters - id from query string, channel from the route path
const id = useRouteQuery<string>('id', '');
const channelId = useRouteParams<string>('channel', '');

// Create scoped stores based on route parameters
const contentApi = cmnext.createContentStore(channelId);
const selectedContent = contentApi.single(id);

const newFileDropZone = ref<HTMLElement>();

// Check if this is a new content item (id === 'new')
const isNew = computed(() => isEmpty(selectedContent.value?.id));

// Reactive content buffer that updates when store changes
const metaBuffer = reactiveComputed<Required<ContentMeta>>(
  () => clone(selectedContent.value || ({} as ContentMeta)) as Required<ContentMeta>
);

const { validate: validateForm } = useFormValidation({ toaster });

const contentSchema = yup.object({
  name: yup
    .string()
    .required('File name is required')
    .max(50, 'File name must be less than 50 characters')
    .matches(/^[a-zA-Z0-9 \-.]*$/, 'The file name contains invalid characters'),
});

const validate = async () => {
  return await validateForm(metaBuffer, contentSchema);
};

const file = ref<File | undefined>();
const { open, reset, onChange: onFileChanged } = useFileDialog({ accept: '*' });
const { isOverDropZone } = useDropZone(newFileDropZone, {
  onDrop: (files) => onFileUploaded(first(files)),
});

// Update the file buffer when a user selects a file to upload
onFileChanged((f) => onFileUploaded(first(f)));

// Set the file name when a file is selected
watch(file, (f) => (metaBuffer.name = f?.name || ''));

// Watch for changes in content ID and load the content
watch(
  id,
  async (newId) => {
    if (newId && newId !== 'new') {
      await contentApi.refresh();
    }
  },
  { immediate: true }
);

// Watch for channel changes and update the content store
watch(
  channelId,
  () => {
    if (channelId.value) {
      contentApi.refresh();
    }
  },
  { immediate: true }
);

const editFile = computed<ContentMeta | undefined>(() => selectedContent.value ?? undefined);
const uploadedFile = computed<File>(() => defaultTo(file.value, {} as File));

const getFileSize = (file: File) => {
  const size = round(file.size > 1024 ? file.size / 1024 : file.size, 2);
  return `${size} ${file.size > 1024 ? 'KB' : 'B'}`;
};

const getContentType = (file: File) => file.type;

const getSizeinKb = (value: number | undefined) => {
  value = defaultTo(value, 0);
  const size = round(value > 1024 ? value / 1024 : value, 2);
  return `${size} ${value > 1024 ? 'KB' : 'B'}`;
};

const onFileUploaded = (f: File | undefined) => (file.value = f);

const onSubmit = async () => {
  const hasFile = !isEmpty(file.value?.name);

  // Validate the form
  if (!(await validate())) {
    return;
  }

  apiCall(async () => {
    // Check if in edit mode
    if (isNew.value) {
      // New file upload
      if (!hasFile) {
        toaster.error('No file selected');
        return;
      }
      await contentApi.uploadContent(file.value!, metaBuffer.name!);
      toaster.success('Content uploaded successfully');
    } else {
      // Edit mode
      if (hasFile) {
        // Confirm overwrite
        const { isCanceled } = await confirm({
          title: 'Overwrite file?',
          message: 'Are you sure you want to overwrite the file? This action cannot be undone.',
        });
        if (isCanceled) {
          return;
        }
        await contentApi.updateContent(metaBuffer, file.value!);
      } else {
        await contentApi.updateContentName(metaBuffer, metaBuffer.name!);
      }
      toaster.success('Content updated successfully');
    }

    // Navigate back to the blog
    await router.push(`/channels/${channelId.value}`);
  });
};

const onClose = () => {
  router.push(`/channels/${channelId.value}`);
};

const onDelete = async () => {
  if (!selectedContent.value?.id) return;

  const { isCanceled } = await confirm({
    title: 'Delete File?',
    message: `Are you sure you want to delete the file "${selectedContent.value.name}"? This action cannot be undone.`,
  });

  if (isCanceled) return;

  apiCall(async () => {
    await contentApi.delete(selectedContent.value!);
    toaster.success('Content deleted successfully');
    await router.push(`/channels/${channelId.value}`);
  });
};

const removeNewFile = () => {
  file.value = undefined;
  metaBuffer.name = editFile.value?.name ?? '';
  reset();
};

// Page title
const pageTitle = computed(() => {
  if (isNew.value) return 'Upload New Content';
  return editFile.value?.name ? `Edit: ${editFile.value.name}` : 'Edit Content';
});

// Check if we have a valid channel selected
const isChannelSelected = computed(() => !isEmpty(channelId.value));
</script>

<template>
  <div id="content-editor-page" class="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-base-content truncate" :title="pageTitle">
          {{ pageTitle }}
        </h1>
        <p v-if="isNew" class="text-base-content/70 mt-1">Upload new content to this channel</p>
        <p v-else class="text-base-content/70 mt-1">Edit content metadata and file</p>
      </div>
      <div class="grid grid-cols-2 sm:flex gap-2">
        <button
          :disabled="waiting.value || !isChannelSelected"
          class="btn btn-primary"
          form="content-upload-form"
        >
          <span v-if="waiting.value" class="loading loading-spinner loading-sm" />
          <span v-else>{{ isNew ? 'Upload' : 'Save' }}</span>
        </button>
        <button class="btn btn-outline" @click="onClose">Cancel</button>
      </div>
    </div>

    <!-- Channel info -->
    <div v-if="!isChannelSelected" class="alert alert-warning max-w-md mx-auto">
      <fa-icon icon="triangle-exclamation" />
      <span>Please select a channel to upload or edit content</span>
    </div>

    <!-- Content form -->
    <div id="content-edit-body" class="my-10">
      <form id="content-upload-form" class="flex" @submit.prevent="onSubmit">
        <fieldset
          class="mx-auto flex flex-col gap-6 w-full max-w-lg min-w-0"
          :disabled="!isChannelSelected"
        >
          <!-- File name input -->
          <div class="form-control">
            <label class="label" for="content-name">
              <span class="label-text">File name</span>
            </label>
            <input
              id="content-name"
              v-model="metaBuffer.name"
              type="text"
              class="input input-bordered w-full"
              placeholder="Enter file name"
            />
          </div>

          <!-- File drop zone for new uploads -->
          <div
            v-if="isNew"
            id="file-drop-zone"
            ref="newFileDropZone"
            class="py-16 transition-all duration-150 ease-linear border-2 border-dashed rounded cursor-pointer border-base-300"
            :class="{ 'border-primary': isOverDropZone }"
            @click.prevent="open()"
          >
            <div class="flex flex-col items-center justify-center">
              <fa-icon icon="file-upload" class="text-4xl" />
              <p class="mt-2 text-sm text-center">Drop file here or click to select file</p>
            </div>
          </div>

          <!-- Content ID for existing files -->
          <div v-if="editFile?.id" class="form-control">
            <label class="label" for="content-id">
              <span class="label-text">Content ID</span>
            </label>
            <input
              id="content-id"
              type="text"
              class="input input-bordered w-full"
              :value="editFile.id"
              readonly
            />
          </div>

          <!-- New file preview -->
          <div
            v-if="uploadedFile.name"
            class="border border-base-300 rounded-lg p-4 w-full max-w-md mx-auto"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 text-sm">
                <div class="truncate" :title="uploadedFile.name">{{ uploadedFile.name }}</div>
                <div class="mt-1 opacity-70">Size: {{ getFileSize(uploadedFile) }}</div>
                <div class="mt-1 opacity-70 break-all">
                  Content-Type: {{ getContentType(uploadedFile) }}
                </div>
              </div>
              <button
                class="btn btn-sm btn-error shrink-0"
                title="Remove File"
                @click.prevent="removeNewFile"
              >
                <fa-icon :icon="['fas', 'trash']" />
              </button>
            </div>
          </div>

          <!-- Existing file preview -->
          <div
            v-else-if="editFile?.id"
            class="border border-base-300 rounded-lg p-4 w-full max-w-md mx-auto"
          >
            <div class="text-sm">
              <div class="truncate" :title="editFile.name">Name: {{ editFile.name }}</div>
              <div class="mt-1 opacity-70">Size: {{ getSizeinKb(editFile?.length) }}</div>
              <div class="mt-1 opacity-70 break-all">File Path: {{ editFile.path }}</div>
              <div class="mt-1 opacity-70 break-all">Content-Type: {{ editFile.content_type }}</div>
            </div>
            <div class="mt-4 flex justify-center">
              <button class="btn btn-outline" @click.prevent="open()">Overwrite file</button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>

    <!-- Delete button for existing content -->
    <div v-if="!isNew" class="flex justify-center mt-6">
      <button class="btn btn-error" :disabled="waiting.value" @click="onDelete">
        <fa-icon icon="trash" class="mr-2" />
        Delete Content Forever
      </button>
    </div>

    <!-- Footer spacing -->
    <div class="h-8" />
  </div>
</template>
