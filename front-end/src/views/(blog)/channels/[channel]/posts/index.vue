<script setup lang="ts">
import { computed } from 'vue';
import { useRouteParams, useRouteQuery } from '@vueuse/router';
import { get } from '@vueuse/core';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { defaultTo, isNil, filter, find, toLower, includes, orderBy } from 'lodash-es';
import type { PostMeta } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useStore } from '../../../../../store';
import { cmnext, toaster } from '../../../../../main';
import { confirm } from '../../../../../lib/confirm';
import { formatDate, truncateText } from '../../../../../lib/helpers';

type SortType = 'created' | 'title' | 'author' | 'lastUpdated';

const sortOptions: { value: SortType; label: string }[] = [
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'lastUpdated', label: 'Last Modified' },
];

const store = useStore();
const { invoke: apiCall } = useApiCall({ toaster });

// Set page title
store.setPageTitle('Channel Posts');

// Get channel ID from route parameters
const channelId = useRouteParams<string>('channel', '');

// Get optional query parameters for filtering/searching
const search = useRouteQuery<string>('search', '', { mode: 'push' });
const sortMode = useRouteQuery<SortType>('sort', 'created', { mode: 'push' });

// Create scoped stores for this channel
const posts = cmnext.createPostStore(channelId);
const channel = cmnext.channels.single(channelId);

// Computed values
const hasChannel = computed(() => !isNil(channel.value));
const hasPosts = computed(() => posts.all.value.length > 0);
const postCount = computed(() => posts.all.value.length);
const sortLabel = computed(
  () => find(sortOptions, (opt) => opt.value === sortMode.value)?.label ?? 'Sort'
);

const sortedPosts = computed(() => {
  if (!hasPosts.value) return [];

  // orderBy returns a new array (never mutates shared store state) and its
  // iteratees are null-friendly, so missing titles/authors sort safely
  const all = get(posts.all) as PostMeta[];

  let sorted: PostMeta[];
  switch (sortMode.value) {
    case 'created':
      sorted = orderBy(all, ['date'], ['desc']);
      break;
    case 'title':
      sorted = orderBy(all, [(post) => toLower(post.title)], ['asc']);
      break;
    case 'author':
      sorted = orderBy(all, [(post) => toLower(post.author)], ['asc']);
      break;
    case 'lastUpdated':
      sorted = orderBy(all, [(post) => defaultTo(post.created, post.date)], ['desc']);
      break;
    default:
      // Unknown ?sort= values (hand-edited URLs) fall back to the default order
      sorted = orderBy(all, ['date'], ['desc']);
      break;
  }

  // Filter by search term (toLower coerces missing values to '')
  if (search.value) {
    const term = toLower(search.value);
    sorted = filter(sorted, (post) => {
      return includes(toLower(post.title), term) || includes(toLower(post.summary), term);
    });
  }

  return sorted;
});

// Post operations
const onDeletePost = async (post: PostMeta) => {
  const { isCanceled } = await confirm({
    title: 'Delete Post?',
    message: `Are you sure you want to delete the post "${post.title}"? This action cannot be undone.`,
  });

  if (isCanceled) return;

  await apiCall(async () => {
    await posts.delete(post);

    toaster.success('Post Deleted', `Post "${post.title}" has been deleted successfully.`);
  });

  await posts.refresh();
};
</script>

<template>
  <div id="channel-posts-page" class="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div class="flex items-center gap-4">
        <router-link :to="`/channels/${channelId}`" class="btn btn-ghost btn-sm shrink-0">
          <fa-icon icon="arrow-left" class="mr-2" />
          Back
        </router-link>
        <div class="divider divider-horizontal mx-0" />
        <div class="min-w-0">
          <h1 class="text-2xl md:text-3xl font-bold text-base-content truncate">Manage Posts</h1>
          <p class="text-base-content/70 mt-1">Manage and create posts for this channel</p>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:flex gap-2">
        <router-link :to="`/channels/${channelId}/posts/new`" class="btn btn-primary">
          <fa-icon icon="plus" class="mr-2" />
          New Post
        </router-link>
        <router-link :to="`/channels/${channelId}/edit`" class="btn btn-outline">
          <fa-icon icon="cog" class="mr-2" />
          Settings
        </router-link>
      </div>
    </div>

    <!-- Channel info and search -->
    <div v-if="cmnext.channels.isLoading.value" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div v-else class="space-y-6">
      <!-- Stats strip, ahead of the main section -->
      <div
        v-if="hasChannel"
        class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-base-content/60"
      >
        <span class="inline-flex items-center gap-1.5">
          <fa-icon icon="comment" />
          {{ postCount }} {{ postCount === 1 ? 'post' : 'posts' }}
        </span>
        <span v-if="channel?.feed" class="inline-flex items-center gap-1.5">
          <fa-icon icon="rss" />
          RSS Enabled
        </span>
      </div>

      <!-- Search filter bar, sort control rides along on desktop, popover on mobile -->
      <div class="flex gap-2">
        <div class="form-control flex-1 min-w-0">
          <input
            v-model="search"
            type="text"
            class="input input-bordered w-full"
            placeholder="Search posts..."
            aria-label="Search posts"
          />
        </div>
        <select
          v-model="sortMode"
          class="hidden md:block select select-bordered w-auto"
          aria-label="Sort posts"
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            Sort by {{ opt.label }}
          </option>
        </select>
        <Menu as="div" class="relative md:hidden shrink-0">
          <MenuButton class="btn btn-outline" aria-label="Sort posts">
            <fa-icon icon="chevron-down" class="mr-2" />
            {{ sortLabel }}
          </MenuButton>
          <MenuItems
            as="ul"
            class="absolute right-0 z-30 mt-2 w-48 menu bg-base-100 rounded-box p-2 shadow-lg border border-base-300"
          >
            <MenuItem v-for="opt in sortOptions" :key="opt.value" v-slot="{ active }" as="li">
              <button :class="{ 'bg-base-200': active }" @click="sortMode = opt.value">
                <fa-icon icon="check" class="mr-2" :class="{ invisible: sortMode !== opt.value }" />
                Sort by {{ opt.label }}
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>
    </div>

    <!-- Posts List -->
    <!-- Loading indicator -->
    <div v-if="posts.isLoading.value" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- No channel selected -->
    <div v-else-if="!hasChannel" class="text-center py-12">
      <fa-icon icon="triangle-exclamation" class="text-6xl text-warning mb-4" />
      <h3 class="text-2xl font-bold mb-2">No Channel Selected</h3>
      <p class="text-lg opacity-75 mb-4">Please select a channel to view its posts.</p>
      <router-link to="/channels" class="btn btn-primary"> Back to Channels </router-link>
    </div>

    <!-- No posts found -->
    <div v-else-if="!hasPosts" class="text-center py-12">
      <fa-icon icon="file-alt" class="text-6xl text-base-300 mb-4" />
      <h3 class="text-2xl font-bold mb-2">No Posts Yet</h3>
      <p class="text-lg opacity-75 mb-4">This channel doesn't have any posts yet.</p>
      <router-link class="btn btn-primary" :to="`/channels/${channelId}/posts/new`">
        <fa-icon icon="plus" />
        Create First Post
      </router-link>
    </div>

    <!-- No search results -->
    <div v-else-if="sortedPosts.length === 0" class="text-center py-12">
      <fa-icon icon="file-alt" class="text-6xl text-base-300 mb-4" />
      <h3 class="text-2xl font-bold mb-2">No Matches</h3>
      <p class="text-lg opacity-75 mb-4">No posts match &quot;{{ search }}&quot;.</p>
      <button class="btn btn-outline" @click="search = ''">Clear Search</button>
    </div>

    <!-- Posts grid -->
    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="post in sortedPosts"
        :key="post.id"
        class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
      >
        <div class="card-body">
          <h3 class="card-title">
            {{ post.title || 'Untitled Post' }}
          </h3>

          <p v-if="post.summary" class="text-sm opacity-75">
            {{ truncateText(post.summary, 120) }}
          </p>

          <div class="text-xs opacity-60 mt-2">
            <p v-if="post.author">By {{ post.author }}</p>
            <p v-if="post.date">{{ formatDate(post.date) }}</p>
            <p v-if="post.tags && post.tags.length > 0">
              Tags: {{ post.tags.slice(0, 3).join(', ') }}
              <span v-if="post.tags.length > 3">...</span>
            </p>
          </div>

          <div class="card-actions justify-end mt-4">
            <div class="join">
              <router-link
                class="btn btn-sm btn-primary join-item"
                :to="`/channels/${channelId}/posts/${post.id}`"
                title="Edit Post"
              >
                <fa-icon icon="edit" />
              </router-link>
              <button
                class="btn btn-sm btn-error join-item"
                title="Delete Post"
                @click="onDeletePost(post)"
              >
                <fa-icon icon="trash" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer spacing -->
    <div class="h-8" />
  </div>
</template>
