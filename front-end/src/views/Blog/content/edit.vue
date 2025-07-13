<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { reactiveComputed, useFileDialog, useDropZone } from '@vueuse/core';
import { useRouteQuery } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { ContentMeta } from '@vnuge/cmnext-admin';
import { useConfirm, useFormToaster, useWait } from '@vnuge/vnlib.browser';
import { clone, defaultTo, first, isEmpty, round } from 'lodash-es';
import { required, helpers, maxLength } from '@vuelidate/validators';
import { useVuelidate } from '@vuelidate/core';
import { useStore } from '../../../store';

const store = useStore();
const router = useRouter();
const { reveal } = useConfirm();
const { waiting } = useWait();
const { success, error } = useFormToaster();

// Set page title
store.setPageTitle('Edit Content');

// Get route parameters - id from route path, channel from query
const id = useRouteQuery<string>('id', '');
const channelIdQ = useRouteQuery<string>('channel', '', { mode: 'push' });

// Create scoped stores based on route parameters
const content = store.createContentStore(channelIdQ);

const newFileDropZone = ref<HTMLElement>();

// Find the selected content item by ID
const selectedContent = computed(() => {
    if (!id.value || id.value === 'new') return null;
    return content.all.value.find(c => c.id === id.value) || null;
});

// Check if this is a new content item (id === 'new')
const isNew = computed(() => id.value === 'new' || isEmpty(selectedContent.value?.id));

// Reactive content buffer that updates when store changes
const metaBuffer = reactiveComputed<Required<ContentMeta>>(() => 
    clone(selectedContent.value || {} as ContentMeta) as Required<ContentMeta>
);

const validationArgs = {
    name: {
        required,
        maxLen: maxLength(50),
        reg: helpers.withMessage('The file name contains invalid characters', helpers.regex(/^[a-zA-Z0-9 \-\.]*$/))
    },
};

const v$ = useVuelidate(validationArgs, metaBuffer);

const validate = async () => {
    const result = await v$.value.$validate();
    return result;
};

const file = ref<File | undefined>();

// Set the file name when a file is selected
watch(file, f => v$.value.name.$model = f?.name || '');

const { open, reset, onChange } = useFileDialog({ accept: '*' });

// Update the file buffer when a user selects a file to upload
onChange((f) => onFileUploaded(first(f)));

const { isOverDropZone } = useDropZone(newFileDropZone, {
    onDrop: (files) => onFileUploaded(first(files))
});

// Watch for changes in content ID and load the content
watch(id, async (newId) => {
    if (newId && newId !== 'new') {
        await content.refresh();
    }
}, { immediate: true });

// Watch for channel changes and update the content store
watch(channelIdQ, () => {
    if (channelIdQ.value) {
        content.refresh();
    }
}, { immediate: true });

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

const onFileUploaded = (f: File | undefined) => file.value = f;

const onSubmit = async () => {
    const hasFile = !isEmpty(file.value?.name);

    // Validate the form
    if (!await validate()) {
        return;
    }

    try {
        // Check if in edit mode
        if (isNew.value) {
            // New file upload
            if (!hasFile) {
                error({ title: 'No file selected' });
                return;
            }
              await content.uploadContent(file.value!, metaBuffer.name!);
            success({ title: 'Content uploaded successfully' });
        } else {
            // Edit mode
            if (hasFile) {
                // Confirm overwrite
                const { isCanceled } = await reveal({
                    title: 'Overwrite file?',
                    text: 'Are you sure you want to overwrite the file? This action cannot be undone.',
                });
                if (isCanceled) {
                    return;
                }
                await content.updateContent(metaBuffer, file.value!);
            } else {
                await content.updateContentName(metaBuffer, metaBuffer.name!);
            }
            success({ title: 'Content updated successfully' });
        }

        // Navigate back to the blog
        await router.push(`/blog?channel=${channelIdQ.value}`);
    } catch (err) {
        error({ title: 'Failed to save content', text: err instanceof Error ? err.message : 'Unknown error' });
    }
};

const onClose = () => {
    router.push(`/blog?channel=${channelIdQ.value}`);
};

const onDelete = async () => {
    if (!selectedContent.value?.id) return;

    try {
        await content.delete(selectedContent.value);
        success({ title: 'Content deleted successfully' });
        await router.push(`/blog?channel=${channelIdQ.value}`);
    } catch (err) {
        error({ title: 'Failed to delete content', text: err instanceof Error ? err.message : 'Unknown error' });
    }
};

const removeNewFile = () => {
    file.value = undefined;
    v$.value.name.$model = editFile.value?.name ?? '';
    reset();
};

// Page title
const pageTitle = computed(() => {
    if (isNew.value) return 'Upload New Content';
    return editFile.value?.name ? `Edit: ${editFile.value.name}` : 'Edit Content';
});

// Check if we have a valid channel selected
const isChannelSelected = computed(() => !isEmpty(channelIdQ.value));
</script>

<template>
    <div id="content-editor-page" class="flex flex-col w-full min-h-screen">
        <!-- Header -->
        <div class="my-4 ml-auto">
            <div class="join">                <button 
                    :disabled="waiting.value || !isChannelSelected" 
                    class="btn btn-primary join-item" 
                    form="content-upload-form"
                >
                    <fa-icon icon="spinner" v-if="waiting.value" class="animate-spin" />
                    <span v-else>{{ isNew ? 'Upload' : 'Save' }}</span>
                </button>
                <button class="btn join-item" @click="onClose">Cancel</button>
            </div>
        </div>

        <!-- Title -->
        <div class="mx-auto sm:min-w-[20rem] text-center">
            <h4>{{ pageTitle }}</h4>
        </div>

        <!-- Channel info -->
        <div v-if="!isChannelSelected" class="alert alert-warning mx-auto max-w-md mb-4">
            <fa-icon icon="exclamation-triangle" />
            <span>Please select a channel to upload or edit content</span>
        </div>

        <!-- Content form -->
        <div id="content-edit-body" class="min-h-[24rem] my-10">
            <form id="content-upload-form" class="flex" @submit.prevent="onSubmit">
                <fieldset class="mx-auto flex flex-col gap-10 w-[32rem]" :disabled="!isChannelSelected">
                    <div class="flex flex-col">
                        <!-- File name input -->
                        <div class="p-3 py-0.5">
                            <label class="">File name</label>
                            <input
                                type="text" 
                                class="w-full input input-bordered"
                                placeholder="Enter file name"
                                v-model="v$.name.$model" 
                                :class="{'input-error': v$.name.$invalid && v$.name.$dirty}"
                            />
                            
                            <!-- File drop zone for new uploads -->
                            <div v-if="isNew"
                                id="file-drop-zone" 
                                ref="newFileDropZone" 
                                class="py-16 mt-3 transition-all duration-150 ease-linear border-2 border-dashed rounded cursor-pointer border-base-300"
                                :class="{'border-primary': isOverDropZone}"
                                @click.prevent="open()"
                            >
                                <div class="flex flex-col items-center justify-center">
                                    <fa-icon icon="file-upload" class="text-4xl" />
                                    <p class="mt-2 text-sm text-center">
                                        Drop file here or click to select file
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Content ID for existing files -->
                        <div v-if="editFile?.id" class="mt-3">
                            <div class="p-3 py-0.5">
                                <label>Content Id</label>
                                <input type="text" class="w-full input input-bordered" :value="editFile.id" readonly />
                            </div>
                        </div>
                         
                        <!-- New file preview -->
                        <div v-if="uploadedFile.name" class="border border-base-300 p-4 w-[24rem] mx-auto rounded-sm relative mt-5">
                            <div class="absolute top-0 text-right -right-12">
                                <button class="rounded-sm btn sm red" @click.prevent="removeNewFile">
                                    <fa-icon :icon="['fas', 'trash']" />
                                </button>
                            </div>
                            <div class="">
                                Name:
                                <span class="pr-4 truncate border-b border-coolGray-400">
                                    {{ uploadedFile.name }}
                                </span>
                            </div>
                            <div class="mt-3">
                                Size: {{ getFileSize(uploadedFile) }}
                            </div>
                            <div class="mt-3">
                                Content-Type: {{ getContentType(uploadedFile) }}
                            </div>
                        </div>

                        <!-- Existing file preview -->
                        <div v-else-if="editFile?.id">
                            <div class="border border-base-300 p-4 min-w-[24rem] mx-auto rounded-sm relative mt-5">
                                <div class="pr-4 truncate">
                                    Name: {{ editFile.name }}
                                </div>
                                <div class="mt-3">
                                    Size: {{ getSizeinKb(editFile?.length) }}
                                </div>
                                <div class="mt-3">
                                    File Path: {{ editFile.path }}
                                </div>
                                <div class="mt-3">
                                    Content-Type: {{ editFile.content_type }}
                                </div>
                            </div>
                            <div class="m-auto mt-5 w-fit">
                                <button class="btn" @click.prevent="open()">
                                    Overwrite file
                                </button>
                            </div>
                        </div>
                    </div>
                </fieldset>
            </form>
        </div>

        <!-- Delete button for existing content -->
        <div v-if="!isNew" class="mt-4">
            <div class="mx-auto w-fit">
                 <button 
                    class="btn btn-error" 
                    :disabled="waiting.value"
                    @click="onDelete"
                >
                    Delete Forever
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.btn.red {
    background-color: rgb(239 68 68);
    border-color: rgb(239 68 68);
    color: white;
}

.btn.red:hover {
    background-color: rgb(220 38 38);
    border-color: rgb(220 38 38);
}

.btn.sm {
    height: 2rem;
    min-height: 2rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    font-size: 0.875rem;
}
</style>
