<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { get, refDefault, set, toRefs, tryOnUnmounted, until, useMagicKeys, useStorage, useToggle, whenever } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useRouteQuery } from '@vueuse/router';
import { isNil, isString, split, debounce, noop, find, extend, isEmpty } from 'lodash-es';
import { PostMeta, useXmlProperties } from '@vnuge/cmnext-admin';
import { apiCall, useWait, useConfirm } from '@vnuge/vnlib.browser';
import { getPostFormSchema } from '../form-helpers';
import { useStore } from '../../../store';
import { useEditBuffer } from '../helpers';
import { Converter } from 'showdown';
import FeedFields from '../components/FeedFields.vue';
const Editor = defineAsyncComponent(() => import('../ckeditor/Editor.vue'));

type ExtendedPostMeta = PostMeta & {
    content?: string; // Add content field for the editor
};

// Composables
const { channels, createPostStore, createContentStore, setPageTitle } = useStore();
const router = useRouter();
const mdConverter = new Converter();
const { waiting } = useWait();
const { reveal: confirm } = useConfirm();

setPageTitle('Post Editor');

// Route parameters
const channelId = useRouteQuery<string>('channel', '');
const postId = useRouteQuery<string>('post', '');

// Create scoped stores
const postApi = createPostStore(channelId);
const contentApi = createContentStore(channelId);

const post = refDefault<ExtendedPostMeta>(
    postApi.find(p => p.id === postId.value), 
    {
        id: '', 
        title: '', 
        summary: '', 
        tags: [],
        content: '', 
        author: '', 
        image: '', 
        created: 0,
        date: 0, 
        properties: undefined
    }
);

// Reactive post buffer
const { 
    editBuffer, raw, modified, revert, validate, errors 
} = useEditBuffer(post, getPostFormSchema());

const isNew = computed(() => isNil(raw.value?.id));
const postCreatedDate = computed(() => {
    if (!raw.value?.created) return undefined;
    return new Date(raw.value.created);
});

// Feed properties management
const feedPropertiesApi = useXmlProperties(computed(() => post.value || undefined));
const { getCurrentProperties } = feedPropertiesApi;

// UI state
const podcastMode = ref(false);
const imageLoadError = ref(false);
const mdBuffer = ref('');
const [mdVisible, toggleMdVisible] = useToggle(false);

// Content statistics
const contentLength = computed(() => editBuffer.content?.length || 0);

const wordCount = computed(() => {
    if (!editBuffer.content) return 0;
    return editBuffer.content
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0)
        .length;
});

// Auto-save functionality
const autoSaveEnabled = useStorage('post-editor-autosave', true);
const debouncedAutoSave = debounce(async () => {
    if (autoSaveEnabled.value && modified.value && !isNew.value) {
        await saveDraft();
    }
}, 5000);

// Methods
const onSubmit = async () => {
    if (!await validate()) {
        return;
    }

    const properties = getCurrentProperties();

    const postData: ExtendedPostMeta = {
        ...editBuffer,
        properties,
        content: undefined // Remove content from post object
    };

    // Remove the content from the post object
    delete postData.content;

    // Handle podcast mode
    if (podcastMode.value) {
        postData.html_description = editBuffer.content || '';
    } else {
        delete postData.html_description;
    }

    // Convert tags string to array
    postData.tags = isString(postData.tags) ? split(postData.tags, ',').map(tag => tag.trim()) : postData.tags;

    if (isNew.value) {
        await apiCall(async ({ toaster }) => {
            const newPost = await postApi.add(postData);
            toaster.general.success({
                title: 'Post created successfully',
                text: `Post '${newPost.title}' has been created.`,
            });

            // Navigate to edit mode with new post ID
            await router.push(`/blog/posts/edit?channel=${channelId.value}&post=${newPost.id}`);
        });
    } else {
        await apiCall(async ({ toaster }) => {
            await postApi.update(postData);
            toaster.general.success({
                title: 'Post updated successfully',
                text: `Post '${postData.title}' has been updated.`,
            });

            // Refresh the post data, should trigger all load events
            postApi.refresh();
        });
    }
}

const saveDraft = async () => {
    // Implementation for saving draft
    console.log('Saving draft...');
}

const resetForm = async () => {
    if (!modified.value) return;
    const { isCanceled } = await confirm({
        title: 'Reset Changes',
        text: 'Are you sure you want to reset all changes? This action cannot be undone.',
        isWarning: true
    });
    
    if (isCanceled) return;

    revert();
}

const onBack = async () => {
    if (!modified.value) {
        router.back();
    }

    const { isCanceled } = await confirm({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Are you sure you want to leave?',
        isWarning: true
    });

    if (isCanceled) {
        return;
    }

    router.push(`/blog/posts/${channelId.value}`);
}

const onPreview = () => {
    if (raw.value?.id) {
        window.open(`/blog/posts/${raw.value.id}`, '_blank');
    }
}

const onDelete = async () => {
    const post = get(raw);
    if (!post?.id) return;
    
    const { isCanceled } = await confirm({
        title: 'Delete Post',
        text: `Are you sure you want to delete the post "${post.title}"? This action cannot be undone.`,
        isWarning: true
    });

    if (isCanceled) return;

    await apiCall(async ({ toaster }) => {
        await postApi.delete(post);
        toaster.general.success({
            title: 'Post deleted',
            text: 'The post has been deleted successfully.',
        });

        await router.push(`/blog/posts/${channelId.value}`);
    });
}

const formatDate = (date: string | Date | number | undefined) => {
    if (!date) return 'Never';
    if (typeof date === 'number') {
        return new Date(date * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
}

const onConvertFromMd = () => {
    const mdValue = get(mdBuffer);
    if (isEmpty(mdValue)) {
        return;
    }
    // Convert Markdown to HTML and update the editor content
    editBuffer.content = mdConverter.makeHtml(mdValue);
    toggleMdVisible(false);
}

const onConvertToMd = () => {
    //Convert the current editor content to Markdown
    mdBuffer.value = mdConverter.makeMarkdown(editBuffer.content!);
}

const onEditorChanged = async (content: string) => {
    editBuffer.content = content;
    await debouncedAutoSave();

    console.log(content, modified.value);
};

// Watch for changes to trigger auto-save
watch(editBuffer, debouncedAutoSave, { deep: true });
// Automatically convert to Markdown when the dialog opens and clear buffer when closed
watch(mdVisible, (isVisible) => isVisible ? onConvertToMd() : set(mdBuffer, ''));

// Keyboard shortcuts
const { ctrl_s } = useMagicKeys({ passive: false });
whenever(ctrl_s, onSubmit);

//Runs to fetch the post content once the post is is available
whenever(post, async (post) => {
    if(!post?.id) return;
    post.content = await contentApi.getPostContent(post);
})
// Cleanup
tryOnUnmounted(() => {
    debouncedAutoSave.cancel();
});

</script>
<template>
    <div class="post-editor bg-base-100 min-h-screen">
        <!-- Header Section -->
        <div class="sticky top-0 z-40 bg-base-100 border-b border-base-200 shadow-sm">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button class="btn btn-ghost btn-sm" @click="onBack">
                            <fa-icon icon="arrow-left" class="w-4 h-4" />
                            Back
                        </button>
                        <div class="divider divider-horizontal"></div>
                        <h1 class="text-2xl font-bold">
                            {{ isNew ? 'Create New Post' : 'Edit Post' }}
                        </h1>
                        <div class="badge badge-primary badge-outline" v-if="!isNew">
                            ID: {{ post?.id }}
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <!-- Save Button -->
                        <button 
                            class="btn btn-primary" 
                            :class="{ 'loading': waiting }" 
                            :disabled="waiting || !modified"
                            @click="onSubmit"
                        >
                            <fa-icon v-if="!waiting" icon="save" class="w-4 h-4" />
                            {{ waiting ? 'Saving...' : 'Save Post' }}
                        </button>
                      

                        <!-- Preview Button -->
                        <button class="btn btn-outline btn-secondary" :disabled="!post?.id" @click="onPreview">
                            <fa-icon icon="eye" class="w-4 h-4" />
                            Preview
                        </button>

                        <!-- Delete Button (only for existing posts) -->
                        <button v-if="!isNew" class="btn btn-outline btn-error" @click="onDelete">
                            <fa-icon icon="trash" class="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="container mx-auto px-4 py-6">
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

                <!-- Left Column - Main Form -->
                <div class="xl:col-span-2 space-y-6">

                    <!-- Basic Information Card -->
                    <div class="card bg-base-100 shadow-xl border border-base-200">
                        <div class="card-header px-6 py-4 border-b border-base-200">
                            <h2 class="card-title text-lg">
                                <fa-icon icon="edit" class="w-5 h-5" />
                                Basic Information
                            </h2>
                        </div>
                        <div class="card-body p-6 space-y-4">

                            <!-- Title -->
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-medium">Title *</span>
                                    <span v-if="errors.title.isError" class="label-text-alt text-error">
                                        {{ errors.title.message }}
                                    </span>
                                </label>
                                <input v-model="editBuffer.title" type="text" placeholder="Enter post title..."
                                    class="input input-bordered w-full"
                                    :class="{ 'input-error': errors.title.isError }" />
                            </div>

                            <!-- Summary -->
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-medium">Summary</span>
                                    <span v-if="errors.summary.isError" class="label-text-alt text-error">
                                        {{ errors.summary.message }}
                                    </span>
                                </label>
                                <textarea v-model="editBuffer.summary" placeholder="Enter post summary..."
                                    class="textarea textarea-bordered w-full h-20"
                                    :class="{ 'textarea-error': errors.summary.isError }"></textarea>
                                <label class="label">
                                    <span class="label-text-alt">Brief description for search results and feeds</span>
                                </label>
                            </div>

                            <!-- Tags -->
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-medium">Tags</span>
                                    <span class="label-text-alt">Separate with commas</span>
                                    <span v-if="errors.tags.isError" class="label-text-alt text-error">
                                        {{ errors.tags.message }}
                                    </span>
                                </label>
                                <input v-model="editBuffer.tags" type="text" placeholder="tag1, tag2, tag3..."
                                    class="input input-bordered w-full" />
                            </div>
                        </div>
                    </div>

                    <!-- Content Editor Card -->
                    <div class="card bg-base-100 shadow-xl border border-base-200">
                        <div class="card-header px-6 py-4 border-b border-base-200">
                            <h2 class="card-title text-lg">
                                <fa-icon icon="file-alt" class="w-5 h-5" />
                                Content
                            </h2>


                            <div class="flex items-center gap-2 ml-auto">
                                <!-- Markdown Converter Button -->
                                <button @click="toggleMdVisible(true)" class="btn btn-ghost btn-sm"
                                    title="Convert Markdown">
                                    <fa-icon icon="markdown" class="w-4 h-4" />
                                    Markdown
                                </button>

                                <div class="divider divider-horizontal"></div>

                                <div class="form-control">
                                    <label class="label cursor-pointer gap-2">
                                        <span class="label-text">Podcast Mode</span>
                                        <input v-model="podcastMode" type="checkbox"
                                            class="toggle toggle-primary toggle-sm" />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">

                            <!-- Content Editor -->
                            <div class="min-h-[400px]">
                                <Suspense>
                                    <template #default>
                                        <Editor
                                            :initial-content="raw.content" 
                                            @change="onEditorChanged"
                                        >
                                        </Editor>
                                    </template>
                                    <template #fallback>
                                        <div class="flex items-center justify-center h-64">
                                            <div class="loading loading-spinner loading-lg"></div>
                                            <span class="ml-2">Loading editor...</span>
                                        </div>
                                    </template>
                                </Suspense>
                            </div>

                            <!-- Content Validation Error -->
                            <div v-if="errors.content.isError" class="px-6 py-2 bg-error/10 border-t border-error/20">
                                <p class="text-error text-sm">
                                    {{ errors.content.message }}
                                </p>
                            </div>

                        </div>
                    </div>

                </div>

                <!-- Right Column - Sidebar -->
                <div class="space-y-6">

                    <!-- Publish Settings Card -->
                    <div class="card bg-base-100 shadow-xl border border-base-200">
                        <div class="card-header px-4 py-3 border-b border-base-200">
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
                                <select v-model="channelId" class="select select-bordered select-sm w-full"
                                    :disabled="!isNew">
                                    <option value="">Select Channel</option>
                                    <option v-for="channel in channels.all" :key="channel.id" :value="channel.id">
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
                                <input :value="postCreatedDate" type="datetime-local" :disabled="!isNew"
                                    class="input input-bordered input-sm w-full" />
                            </div>

                             <!-- Author -->
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-medium">Author</span>
                                    <span v-if="errors.author.isError" class="label-text-alt text-error">
                                        {{ errors.author.message }}
                                    </span>
                                </label>
                                <input v-model="editBuffer.author" type="text" placeholder="Author name..."
                                    class="input input-bordered w-full" />
                            </div>

                            <!-- Image URL -->
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-medium">Featured Image</span>
                                </label>
                                <input v-model="raw.image" type="url" placeholder="https://example.com/image.jpg"
                                    class="input input-bordered input-sm w-full" />
                                <div v-if="raw.image" class="mt-2">
                                    <img :src="raw.image" alt="Featured image preview"
                                        class="w-full h-32 object-cover rounded border" @error="imageLoadError = true"
                                        @load="imageLoadError = false" />
                                    <div v-if="imageLoadError" class="text-error text-xs mt-1">
                                        Failed to load image
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <!-- Feed Properties Card -->
                    <div class="card bg-base-100 shadow-xl border border-base-200">
                        <div class="card-header px-4 py-3 border-b border-base-200">
                            <h3 class="card-title text-base">
                                <fa-icon icon="rss" class="w-4 h-4" />
                                Feed Properties
                            </h3>
                        </div>
                        <div class="card-body p-4">
                            <Suspense> <template #default>
                                    <FeedFields :properties="feedPropertiesApi" :showEpAdder="podcastMode"
                                        class="space-y-3" />
                                </template>
                                <template #fallback>
                                    <div class="skeleton h-32 w-full"></div>
                                </template>
                            </Suspense>
                        </div>
                    </div>

                    <!-- Quick Actions Card -->
                    <div class="card bg-base-100 shadow-xl border border-base-200">
                        <div class="card-header px-4 py-3 border-b border-base-200">
                            <h3 class="card-title text-base">
                                <fa-icon icon="bolt" class="w-4 h-4" />
                                Quick Actions
                            </h3>
                        </div>
                        <div class="card-body p-4 space-y-2">

                            <button class="btn btn-outline btn-sm w-full" @click="saveDraft" :disabled="waiting">
                                <fa-icon icon="copy" class="w-4 h-4" />
                                Save as Draft
                            </button>

                            <button class="btn btn-outline btn-sm w-full" @click="resetForm" :disabled="!modified">
                                <fa-icon icon="refresh" class="w-4 h-4" />
                                Reset Changes
                            </button>

                            <div class="divider my-2"></div>

                            <div class="text-xs text-base-content/60 space-y-1">
                                <div class="flex justify-between">
                                    <span>Characters:</span>
                                    <span>{{ contentLength }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Words:</span>
                                    <span>{{ wordCount }}</span>
                                </div>
                                <div class="flex justify-between" v-if="!isNew">
                                    <span>Last saved:</span>
                                    <span>{{ formatDate(post?.created) }}</span>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>

        <!-- Keyboard Shortcuts Help -->
        <div class="fixed bottom-4 right-4 z-50">
            <div class="tooltip tooltip-left" data-tip="Ctrl+S to save">
                <button class="btn btn-circle btn-sm btn-outline">
                    <fa-icon icon="question-circle" class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Loading Overlay -->
        <div v-if="waiting" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div class="card bg-base-100 shadow-xl">
                <div class="card-body text-center">
                    <div class="loading loading-spinner loading-lg mx-auto"></div>
                    <p class="mt-2">Saving post...</p>
                </div>
            </div>
        </div>

        <!-- Markdown Converter Dialog -->
        <Dialog :open="mdVisible" @close="toggleMdVisible(false)">
            <template #title>
                <fa-icon icon="markdown" class="w-5 h-5 mr-2" />
                Markdown Converter
            </template>

            <template #description>
                <div class="w-full">
                    <p class="text-sm text-gray-600 mb-4">
                        Convert between Markdown and HTML content for your post.
                    </p>

                    <!-- Markdown Textarea -->
                    <div class="mb-6 mx-auto w-full max-w-sm">
                        <label class="label block">
                            <span class="label-text font-medium">Markdown Content</span>
                        </label>
                        <textarea 
                        v-model="mdBuffer"
                            placeholder="Paste your markdown here or click 'Get Markdown' to convert current content..."
                            class="textarea w-full textarea-bordered h-64 font-mono text-sm">
                        </textarea>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-3 justify-center">
                        <button @click="toggleMdVisible(false)" class="btn btn-ghost">
                            Cancel
                        </button>
                        <button @click="onConvertToMd" class="btn btn-outline">
                            <fa-icon icon="arrow-down" class="w-4 h-4 mr-2" />
                            Get Markdown
                        </button>
                        <button @click="onConvertFromMd" :disabled="!mdBuffer.trim()" class="btn btn-primary">
                            <fa-icon icon="arrow-up" class="w-4 h-4 mr-2" />
                            Convert to HTML
                        </button>
                    </div>
                </div>
            </template>
        </Dialog>

    </div>
</template>
<style scoped>
@reference '../../../assets/main.css';

.post-editor {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.card-header {
    @apply flex items-center justify-between;
}

.prose {
    max-width: none;
}

/* Ensure proper spacing in cards */
.card-body>*:not(:last-child) {
    margin-bottom: 1rem;
}

/* Loading overlay animation */
@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.fixed.inset-0 {
    animation: fadeIn 0.2s ease-in-out;
}
</style>
  
