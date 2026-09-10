<script setup lang="ts">
import { computed } from 'vue';
import { useRouteParams, useRouteQuery } from '@vueuse/router';
import { get } from '@vueuse/core';
import { isNil, filter, toLower, includes } from 'lodash-es';
import { PostMeta } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useStore } from '../../../../../store';
import { cmnext, toaster } from '../../../../../main';
import { confirm } from '../../../../../lib/confirm';
import { formatDate, truncateText } from '../../../../../lib/helpers';

type SortType = 'created' | 'title' | 'author' | 'lastUpdated';

const store = useStore();
const apiCall = useApiCall({ toaster });

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
const pageTitle = computed(() => `Posts in ${channel.value?.name}`);
const hasChannel = computed(() => !isNil(channel.value));
const hasPosts = computed(() => posts.all.value.length > 0);
const postCount = computed(() => posts.all.value.length);

const sortedPosts = computed(() => {
  if (!hasPosts.value) return [];

  let sorted = get(posts.all) as PostMeta[];

  switch (sortMode.value) {
    case 'created':
      sorted = sorted.sort((a, b) => b.date - a.date);
      break;
    case 'title':
      sorted = sorted.sort((a, b) => a.title!.localeCompare(b.title!));
      break;
    case 'author':
      sorted = sorted.sort((a, b) => a.author?.localeCompare(b.author!));
      break;
    case 'lastUpdated':
      sorted = sorted.sort((a, b) => (b.lastUpdated || b.date) - (a.lastUpdated || a.date));
      break;
  }

  // Filter by search term
  if (search.value) {
    sorted = filter(sorted, (post) => {
      return (
        includes(toLower(post.title), toLower(search.value)) ||
        includes(toLower(post.summary), toLower(search.value))
      );
    });
  }

  return sorted;
});

// Post operations
const onDeletePost = async (post: PostMeta) => {
  const { isCanceled } = await confirm({
    title: 'Delete Post?',
    message: `Are you sure you want to delete post "${post.title}"? This action cannot be undone.`,
  });

  if (isCanceled) return;

  await apiCall(async () => {
    await posts.delete(post);

    toaster.success('Post Deleted', `Post "${post.title}" has been deleted successfully.`);
  });

  posts.refresh();
};
</script>

<template>
  <div id="channel-posts-page" class="p-6 space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div class="flex items-center gap-4">
        <router-link :to="`/channels/${channelId}`" class="btn btn-ghost btn-sm">
          <fa-icon icon="arrow-left" class="mr-2" />
          Back
        </router-link>
        <div class="divider divider-horizontal mx-0" />
        <div>
          <h1 class="text-3xl font-bold text-base-content">{{ pageTitle }}</h1>
          <p class="text-base-content/70 mt-1">Manage and create posts for this channel</p>
        </div>
      </div>
      <div class="flex gap-2">
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

    <div v-else>
      <div v-if="channel" class="card bg-base-100 shadow mb-6">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">{{ channel.name }}</h2>
              <p class="text-sm opacity-75">{{ channel.path }}</p>
              <p v-if="channel.feed" class="text-sm text-success">
                <fa-icon icon="rss" /> RSS Feed Enabled
              </p>
            </div>
            <div class="stats shadow">
              <div class="stat">
                <div class="stat-value text-primary">{{ postCount }}</div>
                <div class="stat-title">Total Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and filter controls -->
      <div class="card bg-base-100 shadow mb-6">
        <div class="card-body py-4">
          <div class="flex gap-4 items-center">
            <div class="form-control flex-1">
              <input
                v-model="search"
                type="text"
                class="input input-bordered w-full"
                placeholder="Search posts..."
              />
            </div>
            <div class="form-control">
              <select v-model="sortMode" class="select select-bordered">
                <option value="created">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="author">Sort by Author</option>
                <option value="lastUpdated">Sort by Last Updated</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Posts List -->
    <!-- Loading indicator -->
    <div v-if="posts.isLoading.value" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- No channel selected -->
    <div v-else-if="!hasChannel" class="text-center py-12">
      <fa-icon icon="exclamation-triangle" class="text-6xl text-warning mb-4" />
      <h3 class="text-2xl font-bold mb-2">No Channel Selected</h3>
      <p class="text-lg opacity-75 mb-4">Please select a channel to view its posts.</p>
      <router-link to="/channels" class="btn btn-primary"> Go to Blog Dashboard </router-link>
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
              <router-link
                class="btn btn-sm btn-secondary join-item"
                :to="`/channels/${channelId}/content`"
                title="Copy Link"
              >
                <fa-icon icon="link" />
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

<style scoped>
.stats .stat {
  place-items: center;
}

.card:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease-in-out;
}

.btn-group .btn:first-child {
  border-top-left-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
}

.btn-group .btn:last-child {
  border-top-right-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}
</style>
