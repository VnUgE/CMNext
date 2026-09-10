<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useRouteParams } from '@vueuse/router';
import { useStore } from '../../../../../store';
import { usePostEditor } from '../../../../../lib/usePostEditor';
import { cmnext } from '../../../../../main';
import { get, set } from 'lodash-es';
import PostEditorToolbar from './components/PostEditorToolbar.vue';
import PostQuickActions from './components/PostQuickActions.vue';
import PostPublishSettings from './components/PostPublishSettings.vue';
import MarkdownConverter from '../../../../../components/MarkdownConverter.vue';
const FeedFields = defineAsyncComponent(() => import('../../../../../components/FeedFields.vue'));
const ContentEditor = defineAsyncComponent(
  () => import('../../../../../components/TextEditor.vue')
);

// Store
const store = useStore();
store.setPageTitle('Post Editor');

// Route parameters
const channelId = useRouteParams<string>('channel', '');
const postId = useRouteParams<string>('post', '');

// Initialize post editor composable with all state and actions
const editor = usePostEditor(cmnext, channelId, postId);
const { errors, buffer } = editor.post;

const properties = computed({
  get: () => get(buffer, 'properties') || [],
  set: (val) => set(buffer, 'properties', val),
});

const mdEditorVisible = computed({
  get: () => editor.md.visible.value,
  set: (val: boolean) => (editor.md.visible.value = val),
});
</script>
<template>
  <div class="post-editor bg-base-100 min-h-screen">
    <!-- Header Section -->
    <PostEditorToolbar :editor="editor" />

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 py-6">
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
                <input
                  v-model="buffer.title"
                  type="text"
                  placeholder="Enter post title..."
                  class="input input-bordered w-full"
                  :class="{ 'input-error': errors.title.isError }"
                />
              </div>

              <!-- Summary -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Summary</span>
                  <span v-if="errors.summary.isError" class="label-text-alt text-error">
                    {{ errors.summary.message }}
                  </span>
                </label>
                <textarea
                  v-model="buffer.summary"
                  placeholder="Enter post summary..."
                  class="textarea textarea-bordered w-full h-20"
                  :class="{ 'textarea-error': errors.summary.isError }"
                />
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
                <input
                  v-model="buffer.tags"
                  type="text"
                  placeholder="tag1, tag2, tag3..."
                  class="input input-bordered w-full"
                />
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
                <button
                  class="btn btn-ghost btn-sm"
                  title="Convert Markdown"
                  @click="editor.md.toggle(true)"
                >
                  <fa-icon icon="markdown" class="w-4 h-4" />
                  Markdown
                </button>

                <div class="divider divider-horizontal" />

                <div class="form-control">
                  <label class="label cursor-pointer gap-2">
                    <span class="label-text">Podcast Mode</span>
                    <input
                      v-model="editor.podcast.mode"
                      type="checkbox"
                      class="toggle toggle-primary toggle-sm"
                    />
                  </label>
                </div>
              </div>
            </div>
            <div class="card-body p-0">
              <!-- Content Editor -->
              <div class="min-h-100">
                <Suspense>
                  <template #default>
                    <ContentEditor @load="(se) => (editor.sunEditor.value = se)" />
                  </template>
                  <template #fallback>
                    <div class="flex items-center justify-center h-64">
                      <div class="loading loading-spinner loading-lg" />
                      <span class="ml-2">Loading editor...</span>
                    </div>
                  </template>
                </Suspense>
              </div>

              <!-- Content Validation Error -->
              <div
                v-if="errors.content.isError"
                class="px-6 py-2 bg-error/10 border-t border-error/20"
              >
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
          <PostPublishSettings :editor="editor" />

          <!-- Feed Properties Card -->
          <div class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-header px-4 py-3 border-b border-base-200">
              <h3 class="card-title text-base">
                <fa-icon icon="rss" class="w-4 h-4" />
                Feed Properties
              </h3>
            </div>
            <div class="card-body p-4">
              <Suspense>
                <template #default>
                  <FeedFields
                    v-model:properties="properties"
                    :show-ep-adder="editor.podcast.mode.value"
                    class="space-y-3"
                  />
                </template>
                <template #fallback>
                  <div class="skeleton h-32 w-full" />
                </template>
              </Suspense>
            </div>
          </div>

          <!-- Quick Actions Card -->
          <PostQuickActions :editor="editor" />
        </div>
      </div>
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div class="fixed bottom-4 right-4 z-50">
      <div class="tooltip tooltip-left" data-tip="Keyboard shortcuts available in toolbar">
        <button class="btn btn-circle btn-sm btn-outline">
          <fa-icon icon="question-circle" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Markdown Converter Dialog -->
    <MarkdownConverter v-model:visible="mdEditorVisible" v-model:content="buffer.content" />
  </div>
</template>
