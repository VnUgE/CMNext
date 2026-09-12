<script setup lang="ts">
import { defaultTo, get, set } from 'lodash-es';
import { computed } from 'vue';
import type { ChannelEditorState } from '../../../../../../lib/useChannelEditor';
import type { ErrorObject } from '../../../../../../lib/editBuffer';
import FeedFields from '../../../../../../components/FeedFields.vue';

const props = defineProps<{
  editor: ChannelEditorState;
}>();

const { isNew } = props.editor;
const { raw, buffer, errors } = props.editor.channel;

// Use the editable value for feed status
const feedStatus = computed({
  get: () => !!buffer.feed,
  set: (val: boolean) =>
    val
      ? (buffer.feed = defaultTo(raw.value.feed, {
          url: '',
          path: '',
          description: '',
          maxItems: 20,
        }))
      : (buffer.feed = undefined),
});

const feedProps = computed({
  get: () => get(buffer, 'feed.properties') ?? [],
  set: (val) => set(buffer, 'feed.properties', val),
});

// The toggle guarantees feed exists while these inputs render, but the type
// stays optional so the disabled state validates cleanly
const feedUrl = computed({
  get: () => defaultTo(buffer.feed?.url, ''),
  set: (val: string) => {
    if (buffer.feed) buffer.feed.url = val;
  },
});

const feedPath = computed({
  get: () => defaultTo(buffer.feed?.path, ''),
  set: (val: string) => {
    if (buffer.feed) buffer.feed.path = val;
  },
});

const feedDescription = computed({
  get: () => defaultTo(buffer.feed?.description, ''),
  set: (val: string) => {
    if (buffer.feed) buffer.feed.description = val;
  },
});

const feedMaxItems = computed({
  get: () => defaultTo(buffer.feed?.maxItems, 20),
  set: (val: number) => {
    if (buffer.feed) buffer.feed.maxItems = val;
  },
});

// Nested schema errors are stored under dotted keys (feed.url); the proxy
// already returns a safe default for unknown keys
const fieldError = (
  path: 'feed.url' | 'feed.path' | 'feed.description' | 'feed.maxItems'
): ErrorObject => get(errors.value, [path]) ?? { isError: false, message: undefined };

const storageRoot = computed(() => buffer.path?.replace(/\/+$/, '') || 'channel-dir');
</script>

<template>
  <form id="channel-edit-form" class="flex" @submit.prevent="editor.saveChannel">
    <fieldset class="mx-auto flex flex-col gap-6 w-lg">
      <!-- Channel Fields -->
      <div class="space-y-4">
        <h5 class="text-lg font-semibold">Channel Settings</h5>

        <div v-if="isNew" class="alert alert-info">
          <span>
            Storage paths form the channel identity and cannot be changed after creation.
          </span>
        </div>

        <div class="form-control">
          <label class="label" for="channel-name">
            <span class="label-text">Channel Name <span class="text-error">*</span></span>
            <span v-if="errors.name.isError" class="label-text-alt text-error">
              {{ errors.name.message }}
            </span>
          </label>
          <input
            id="channel-name"
            v-model="buffer.name"
            type="text"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.name.isError }"
            placeholder="My Awesome Blog"
          />
        </div>

        <div v-if="isNew" class="form-control">
          <label class="label" for="channel-path">
            <span class="label-text">Channel Directory <span class="text-error">*</span></span>
            <span v-if="errors.path.isError" class="label-text-alt text-error">
              {{ errors.path.message }}
            </span>
          </label>
          <input
            id="channel-path"
            v-model="buffer.path"
            type="text"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.path.isError }"
            placeholder="my-channel"
          />
          <div class="label">
            <span class="label-text-alt">The parent directory for the entire channel</span>
          </div>
        </div>

        <div v-if="isNew" class="form-control">
          <label class="label" for="channel-index">
            <span class="label-text">Index File <span class="text-error">*</span></span>
            <span v-if="errors.index.isError" class="label-text-alt text-error">
              {{ errors.index.message }}
            </span>
          </label>
          <input
            id="channel-index"
            v-model="buffer.index"
            type="text"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.index.isError }"
            placeholder="index.json"
          />
          <div class="label">
            <span class="label-text-alt"> File name for the channel catalog </span>
          </div>
        </div>

        <div v-if="isNew" class="form-control">
          <label class="label" for="channel-content">
            <span class="label-text">Content Directory <span class="text-error">*</span></span>
            <span v-if="errors.content.isError" class="label-text-alt text-error">
              {{ errors.content.message }}
            </span>
          </label>
          <input
            id="channel-content"
            v-model="buffer.content"
            type="text"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.content.isError }"
            placeholder="content"
          />
          <div class="label">
            <span class="label-text-alt">
              Folder, under parent, that stores all channel content
            </span>
          </div>
        </div>

        <div class="form-control">
          <span class="label">
            <span class="label-text">Storage Layout</span>
            <span
              v-if="errors.index.isError || errors.content.isError"
              class="label-text-alt text-error"
            >
              {{ errors.index.message || errors.content.message }}
            </span>
          </span>
          <div class="rounded-lg bg-base-200 px-4 py-3 font-mono text-sm space-y-1 min-w-0">
            <div class="truncate" :title="storageRoot">{{ storageRoot }}/</div>
            <div class="pl-4 truncate" :title="buffer.index">├── {{ buffer.index }}</div>
            <div class="pl-4 truncate" :title="buffer.content">└── {{ buffer.content }}/</div>
          </div>
          <div v-if="isNew" class="label">
            <span class="label-text-alt">
              Everything the channel stores, derived from the fields above
            </span>
          </div>
        </div>
      </div>

      <!-- Feed Settings -->
      <div class="divider" />

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h5 class="text-lg font-semibold">RSS Feed Settings</h5>
          <div class="form-control">
            <label class="cursor-pointer label">
              <span class="label-text mr-2">Enable RSS Feed</span>
              <input v-model="feedStatus" type="checkbox" class="toggle toggle-primary" />
            </label>
          </div>
        </div>

        <div v-if="feedStatus" class="space-y-4">
          <div class="form-control">
            <label class="label" for="feed-url">
              <span class="label-text">Feed URL <span class="text-error">*</span></span>
              <span v-if="fieldError('feed.url').isError" class="label-text-alt text-error">
                {{ fieldError('feed.url').message }}
              </span>
            </label>
            <input
              id="feed-url"
              v-model="feedUrl"
              type="url"
              class="input input-bordered w-full"
              :class="{ 'input-error': fieldError('feed.url').isError }"
              placeholder="https://example.com/feed.xml"
            />
            <div class="label">
              <span class="label-text-alt">Public address where readers fetch this feed</span>
            </div>
          </div>

          <div class="form-control">
            <label class="label" for="feed-path">
              <span class="label-text">Feed File Name <span class="text-error">*</span></span>
              <span v-if="fieldError('feed.path').isError" class="label-text-alt text-error">
                {{ fieldError('feed.path').message }}
              </span>
            </label>
            <input
              id="feed-path"
              v-model="feedPath"
              type="text"
              class="input input-bordered w-full"
              :class="{ 'input-error': fieldError('feed.path').isError }"
              placeholder="feed.xml"
            />
            <div class="label">
              <span class="label-text-alt">The file name for the generated feed</span>
            </div>
          </div>

          <div class="form-control">
            <label class="label" for="feed-description">
              <span class="label-text">Feed Description <span class="text-error">*</span></span>
              <span v-if="fieldError('feed.description').isError" class="label-text-alt text-error">
                {{ fieldError('feed.description').message }}
              </span>
            </label>
            <input
              id="feed-description"
              v-model="feedDescription"
              type="text"
              class="input input-bordered w-full"
              :class="{ 'input-error': fieldError('feed.description').isError }"
              placeholder="A short description of this feed"
            />
            <div class="label">
              <span class="label-text-alt">Shown to readers alongside the feed title</span>
            </div>
          </div>

          <div class="form-control">
            <label class="label" for="feed-max-items">
              <span class="label-text">Max Feed Items <span class="text-error">*</span></span>
              <span v-if="fieldError('feed.maxItems').isError" class="label-text-alt text-error">
                {{ fieldError('feed.maxItems').message }}
              </span>
            </label>
            <input
              id="feed-max-items"
              v-model.number="feedMaxItems"
              type="number"
              min="1"
              max="100"
              class="input input-bordered w-full"
              :class="{ 'input-error': fieldError('feed.maxItems').isError }"
            />
            <div class="label">
              <span class="label-text-alt">How many posts the feed includes (1-100)</span>
            </div>
          </div>

          <FeedFields v-model:properties="feedProps" />
        </div>

        <div v-else class="alert alert-info">
          <fa-icon icon="info-circle" />
          <span>RSS feed is disabled for this channel</span>
        </div>
      </div>
    </fieldset>
  </form>
</template>

<style scoped>
.form-control {
  margin-bottom: 1rem;
}

.divider {
  margin: 2rem 0;
}
</style>
