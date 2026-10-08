<script setup lang="ts">
import { computed, defineAsyncComponent, ref, toRef } from 'vue';
import { useRouteParams } from '@vueuse/router';
import { useStore } from '../../../../../store';
import { usePostEditor } from '../../../../../lib/usePostEditor';
import { formatDate } from '../../../../../lib/helpers';
import { cmnext } from '../../../../../main';
import { get, set, words, find } from 'lodash-es';
import PostEditorToolbar from './components/PostEditorToolbar.vue';
const FeedFields = defineAsyncComponent(() => import('../../../../../components/FeedFields.vue'));
const ContentEditor = defineAsyncComponent(
  () => import('../../../../../components/TextEditor.vue')
);
const MarkdownDialog = defineAsyncComponent(
  () => import('../../../../../components/MarkdownConverter.vue')
);

// Store
const store = useStore();
store.setPageTitle('Post Editor');

// Route parameters
const channelId = useRouteParams<string>('channel', '');
const postId = useRouteParams<string>('post', '');

// Initialize post editor composable with all state and actions
const editor = usePostEditor(cmnext, channelId, postId);
const { errors, buffer, raw } = editor.post;
const isNew = toRef(editor.isNew);

const imageLoadError = ref(false);

const strippedContent = computed(() => (buffer.content || '').replace(/<[^>]*>/g, ' '));
const wordCount = computed(() => words(strippedContent.value).length);
const charCount = computed(() => strippedContent.value.replace(/\s+/g, ' ').trim().length);

const channel = computed(() => find(editor.channels.value, (c) => c.id === channelId.value));

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
    <div class="max-w-7xl mx-auto p-4 md:p-6">
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <!-- Main Column -->
        <div class="xl:col-span-2 space-y-6">
          <!-- Title Hero -->
          <div class="text-center pt-4 pb-2">
            <div class="group relative mx-auto max-w-3xl">
              <input
                v-model="buffer.title"
                type="text"
                aria-label="Post title"
                placeholder="Post title…"
                class="w-full rounded-xl bg-base-200/50 px-4 py-3 pr-14 text-center text-4xl md:text-5xl font-bold text-base-content placeholder-base-content/30 transition-colors hover:bg-base-200/60 focus:bg-base-100 focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
              <!-- Persistent edit affordance: always faint, brightens on hover/focus -->
              <fa-icon
                icon="edit"
                class="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/25 transition-colors group-hover:text-primary/70 group-focus-within:text-primary/70"
              />
            </div>

            <p v-if="errors.title.isError" class="mt-2 text-error text-sm">
              {{ errors.title.message }}
            </p>

            <!-- Meta line -->
            <div
              v-if="buffer.author || !isNew || channel?.id"
              class="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-base-content/60"
            >
              <span v-if="buffer.author">By {{ buffer.author }}</span>
              <span v-if="buffer.author && !isNew">·</span>
              <span v-if="!isNew">{{ formatDate(raw.created) }}</span>
              <span v-if="(buffer.author || !isNew) && channel?.id">·</span>
              <span v-if="channel?.id">{{ channel.name }}</span>
            </div>
          </div>

          <!-- Content Editor Card (centerpiece) -->
          <div class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-header px-6 py-3 border-b border-base-200">
              <h2 class="card-title text-base">
                <fa-icon icon="file-alt" class="w-5 h-5" />
                Content
              </h2>

              <div class="ml-auto">
                <!-- Markdown Import/Export Button -->
                <button
                  class="btn btn-ghost btn-sm"
                  title="Import or export Markdown"
                  @click="editor.md.toggle(true)"
                >
                  <fa-icon :icon="['fab', 'markdown']" class="w-4 h-4" />
                  Markdown
                </button>
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
                <p class="text-error text-sm">{{ errors.content.message }}</p>
              </div>

              <!-- Stats Footer -->
              <div
                class="flex items-center gap-4 px-6 py-3 border-t border-base-200 text-xs text-base-content/60"
              >
                <span>{{ wordCount }} words</span>
                <span>{{ charCount }} chars</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Column -->
        <div class="space-y-6">
          <!-- Content Settings Card -->
          <div class="card bg-base-100 shadow-xl border border-base-200">
            <div class="flex items-center gap-2 px-4 py-3 border-b border-base-200">
              <fa-icon icon="align-left" class="w-4 h-4" />
              <h3 class="card-title text-base">Content</h3>
            </div>
            <div class="card-body p-4 space-y-4">
              <!-- Author -->
              <div class="form-control">
                <label class="label" for="post-author">
                  <span class="label-text font-medium">Author</span>
                  <span v-if="errors.author?.isError" class="label-text-alt text-error">
                    {{ errors.author?.message }}
                  </span>
                </label>
                <input
                  id="post-author"
                  v-model="buffer.author"
                  type="text"
                  placeholder="Author name..."
                  class="input input-bordered w-full"
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

              <!-- Image URL -->
              <div class="form-control">
                <label class="label" for="post-image">
                  <span class="label-text font-medium">Featured Image</span>
                </label>
                <input
                  id="post-image"
                  v-model="buffer.image"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  class="input input-bordered input-sm w-full"
                  @input="imageLoadError = false"
                />
                <div v-if="buffer.image" class="mt-2">
                  <img
                    :src="buffer.image"
                    alt="Featured image preview"
                    class="w-full h-32 object-cover rounded border"
                    @error="imageLoadError = true"
                    @load="imageLoadError = false"
                  />
                  <div v-if="imageLoadError" class="text-error text-xs mt-1">
                    Failed to load image
                  </div>
                </div>
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

              <!-- Podcast Mode -->
              <div class="form-control">
                <label class="label cursor-pointer gap-2">
                  <span class="label-text">Podcast Mode</span>
                  <input
                    v-model="editor.podcast.mode.value"
                    type="checkbox"
                    class="toggle toggle-primary toggle-sm"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Feed Properties Card -->
          <div class="card bg-base-100 shadow-xl border border-base-200">
            <div class="flex items-center gap-2 px-4 py-3 border-b border-base-200">
              <fa-icon icon="rss" class="w-4 h-4" />
              <h3 class="card-title text-base">Feed Properties</h3>
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
        </div>
      </div>

      <!-- Footer spacing -->
      <div class="h-8" />
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div class="fixed bottom-4 right-4 z-50">
      <div class="tooltip tooltip-left" data-tip="Keyboard shortcuts available in toolbar">
        <button class="btn btn-circle btn-sm btn-outline">
          <fa-icon icon="question-circle" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Markdown Import/Export Dialog (async chunk, code-split from the main bundle) -->
    <Suspense>
      <template #default>
        <MarkdownDialog
          v-model:visible="mdEditorVisible"
          v-model:content="buffer.content"
          :title="buffer.title"
        />
      </template>
    </Suspense>
  </div>
</template>
