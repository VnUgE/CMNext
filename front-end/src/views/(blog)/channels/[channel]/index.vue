<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from '../../../../store';
import { useRouteParams } from '@vueuse/router';
import { useTimeAgo, useArrayReduce, useSorted } from '@vueuse/core';
import { compact, defaultTo, map, maxBy, take, uniq } from 'lodash-es';
import { formatBytes, formatDate } from '../../../../lib/helpers';
import { cmnext } from '../../../../main';

type ChannelTab = 'posts' | 'files' | 'about';

const store = useStore();

// Get channel ID from route params
const channelId = useRouteParams<string>('channel', '');

// Set page title
store.setPageTitle('Channel Details');

const activeTab = ref<ChannelTab>('posts');

const channel = cmnext.channels.single(channelId);
const { all: posts, isLoading: postsLoading } = cmnext.createPostStore(channelId);
const { all: content, isLoading: contentLoading } = cmnext.createContentStore(channelId);
const totalBytes = useArrayReduce(content, (total, item) => total + defaultTo(item.length, 0), 0);

const isLoading = computed(() => postsLoading.value || contentLoading.value);

// Stats from data already loaded for the page
const postCount = computed(() => posts.value.length);
const contentCount = computed(() => content.value.length);
const authorCount = computed(() => uniq(compact(map(posts.value, 'author'))).length);
const latestPost = computed(() => maxBy(posts.value, (post) => defaultTo(post.date, 0)));
// Post dates are unix timestamps in seconds; useTimeAgo wants milliseconds
const lastModifiedAgo = useTimeAgo(computed(() => defaultTo(latestPost.value?.date, 0) * 1000));
const largestFile = computed(() => maxBy(content.value, (file) => defaultTo(file.length, 0)));

const contentSize = computed(() => formatBytes(totalBytes.value));

// Panels
const recentPosts = computed(() => take(posts.value, 5));
const sortedFiles = useSorted(content, (a, b) => defaultTo(b.length, 0) - defaultTo(a.length, 0));

const feedUrl = computed(() => channel.value?.feed?.url || undefined);
</script>
<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Channel Not Found -->
    <div v-else-if="!channel" class="text-center py-12">
      <fa-icon icon="bullhorn" size="3x" class="text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold text-base-content/70 mb-2">Channel not found</h3>
      <p class="text-base-content/50 mb-6">
        The requested channel could not be found or you don't have access to it.
      </p>
      <router-link to="/channels" class="btn btn-primary">
        <fa-icon icon="arrow-left" class="mr-2" />
        Back to Channels
      </router-link>
    </div>

    <!-- Channel Content -->
    <div v-else>
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="flex items-center gap-4">
          <router-link to="/channels" class="btn btn-ghost btn-sm">
            <fa-icon icon="arrow-left" class="mr-2" />
            Back
          </router-link>
          <div class="divider divider-horizontal mx-0" />
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <fa-icon icon="blog" class="text-primary text-xl" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-base-content">{{ channel.name }}</h1>
              <p class="text-base-content/70 mt-1">
                {{ channel.path || 'No path provided' }}
              </p>
            </div>
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

      <!-- Channel Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-figure text-primary">
            <fa-icon icon="comment" size="2x" />
          </div>
          <div class="stat-title">Total Posts</div>
          <div class="stat-value text-primary">{{ postCount }}</div>
          <div v-if="authorCount > 0" class="stat-desc">
            {{ authorCount }} {{ authorCount === 1 ? 'author' : 'authors' }}
          </div>
        </div>

        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-figure text-secondary">
            <fa-icon icon="clock" size="2x" />
          </div>
          <div class="stat-title">Last Modified</div>
          <template v-if="latestPost">
            <div class="stat-value text-secondary text-lg">
              {{ lastModifiedAgo }}
            </div>
            <div class="stat-desc truncate">{{ latestPost.title }}</div>
          </template>
          <template v-else>
            <div class="stat-value text-secondary text-lg">Never</div>
            <div class="stat-desc">No posts yet</div>
          </template>
        </div>

        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-figure text-info">
            <fa-icon icon="folder-open" size="2x" />
          </div>
          <div class="stat-title">Storage Used</div>
          <div class="stat-value text-info text-lg">{{ contentSize }}</div>
          <div class="stat-desc">{{ contentCount || 0 }} files</div>
        </div>

        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-figure text-accent">
            <fa-icon icon="file-alt" size="2x" />
          </div>
          <div class="stat-title">Largest File</div>
          <template v-if="largestFile">
            <div class="stat-value text-accent text-lg">
              {{ formatBytes(largestFile.length) }}
            </div>
            <div class="stat-desc truncate">{{ largestFile.path }}</div>
          </template>
          <template v-else>
            <div class="stat-value text-accent text-lg">—</div>
            <div class="stat-desc">No files</div>
          </template>
        </div>
      </div>

      <!-- Section switcher -->
      <nav
        aria-label="Channel sections"
        class="flex gap-1 border-b border-base-300 overflow-x-auto"
      >
        <button
          :aria-pressed="activeTab === 'posts'"
          class="px-4 py-2 -mb-px border-b-2 font-medium whitespace-nowrap"
          :class="
            activeTab === 'posts'
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/60 hover:text-base-content'
          "
          @click="activeTab = 'posts'"
        >
          Posts
          <span class="badge badge-sm badge-ghost ml-1">{{ postCount }}</span>
        </button>
        <button
          :aria-pressed="activeTab === 'files'"
          class="px-4 py-2 -mb-px border-b-2 font-medium whitespace-nowrap"
          :class="
            activeTab === 'files'
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/60 hover:text-base-content'
          "
          @click="activeTab = 'files'"
        >
          Files
          <span class="badge badge-sm badge-ghost ml-1">{{ contentCount }}</span>
        </button>
        <button
          :aria-pressed="activeTab === 'about'"
          class="px-4 py-2 -mb-px border-b-2 font-medium whitespace-nowrap"
          :class="
            activeTab === 'about'
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/60 hover:text-base-content'
          "
          @click="activeTab = 'about'"
        >
          About
        </button>
      </nav>

      <!-- Posts Panel -->
      <div v-if="activeTab === 'posts'" class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold text-base-content/70">Recent Posts</h3>
            <div class="flex items-center gap-2">
              <router-link
                :to="`/channels/${channelId}/posts/new`"
                class="btn btn-sm btn-ghost btn-square"
                aria-label="Create new post"
                title="Create new post"
              >
                <fa-icon icon="plus" />
              </router-link>
              <router-link :to="`/channels/${channelId}/posts`" class="btn btn-sm btn-outline">
                View All Posts
              </router-link>
            </div>
          </div>
          <div v-if="recentPosts.length === 0" class="text-center py-8">
            <fa-icon icon="comment" size="2x" class="text-base-content/30 mb-4" />
            <p class="text-base-content/50">No posts yet</p>
            <router-link
              :to="`/channels/${channelId}/posts/new`"
              class="btn btn-sm btn-primary mt-2"
            >
              Create First Post
            </router-link>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="post in recentPosts"
              :key="post.id"
              class="flex items-start justify-between gap-3 p-3 bg-base-200 rounded-lg"
            >
              <div class="flex-1 min-w-0">
                <router-link
                  :to="`/channels/${channelId}/posts/${post.id}`"
                  class="font-medium truncate block link link-hover"
                >
                  {{ post.title }}
                </router-link>
                <div class="text-sm text-base-content/70">
                  Modified {{ formatDate(post.date) }}
                  <span v-if="post.created"> · Created {{ formatDate(post.created) }}</span>
                  <span v-if="post.author"> · {{ post.author }}</span>
                </div>
                <p v-if="post.summary" class="text-sm text-base-content/60 truncate mt-1">
                  {{ post.summary }}
                </p>
                <div v-if="post.tags?.length" class="hidden sm:flex flex-wrap gap-1 mt-2">
                  <span
                    v-for="tag in post.tags.slice(0, 4)"
                    :key="tag"
                    class="badge badge-xs badge-ghost"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="post.tags.length > 4" class="badge badge-xs badge-ghost">
                    +{{ post.tags.length - 4 }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <router-link
                  :to="`/channels/${channelId}/posts/${post.id}`"
                  class="btn btn-xs btn-ghost"
                  :aria-label="`Edit ${post.title}`"
                >
                  <fa-icon icon="edit" />
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Files Panel -->
      <div v-if="activeTab === 'files'" class="card bg-base-100 shadow">
        <div class="card-body">
          <div v-if="sortedFiles.length === 0" class="text-center py-8">
            <fa-icon icon="folder-open" size="2x" class="text-base-content/30 mb-4" />
            <p class="text-base-content/50">No files yet</p>
            <p class="text-sm text-base-content/40 mt-1">
              Uploaded content and attachments will appear here
            </p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th class="hidden sm:table-cell">Type</th>
                  <th class="hidden md:table-cell">Modified</th>
                  <th class="text-right">Size</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="file in sortedFiles" :key="file.id">
                  <td>
                    <div class="flex items-center gap-2 min-w-0">
                      <fa-icon icon="file-alt" class="text-base-content/40 shrink-0" />
                      <span class="font-mono text-sm truncate">{{ file.path }}</span>
                    </div>
                  </td>
                  <td class="hidden sm:table-cell">
                    <span class="badge badge-sm badge-ghost whitespace-nowrap">
                      {{ file.content_type }}
                    </span>
                  </td>
                  <td class="hidden md:table-cell whitespace-nowrap">
                    {{ formatDate(file.date) }}
                  </td>
                  <td class="text-right whitespace-nowrap">{{ formatBytes(file.length) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="card-actions justify-end mt-4">
            <router-link :to="`/channels/${channelId}/content`" class="btn btn-sm btn-outline">
              Manage Content
            </router-link>
          </div>
        </div>
      </div>

      <!-- About Panel -->
      <div v-if="activeTab === 'about'" class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <div class="text-sm font-medium text-base-content/70">Channel Name</div>
                <div class="text-base font-medium">{{ channel.name }}</div>
              </div>
              <div>
                <div class="text-sm font-medium text-base-content/70">Storage Path</div>
                <div class="text-base">{{ channel.path || 'Not found' }}</div>
              </div>
              <div>
                <div class="text-sm font-medium text-base-content/70">Index File</div>
                <div class="text-base font-mono">{{ channel.index }}</div>
              </div>
            </div>
            <div class="space-y-4">
              <div v-if="channel.content">
                <div class="text-sm font-medium text-base-content/70">Content Directory</div>
                <div class="text-base font-mono">{{ channel.content }}</div>
              </div>
              <div>
                <div class="text-sm font-medium text-base-content/70">RSS Feed</div>
                <div class="badge" :class="channel.feed ? 'badge-success' : 'badge-ghost'">
                  {{ channel.feed ? 'Enabled' : 'Disabled' }}
                </div>
              </div>
              <div v-if="feedUrl">
                <div class="text-sm font-medium text-base-content/70">Feed URL</div>
                <div class="text-sm font-mono break-all">{{ feedUrl }}</div>
              </div>
              <div v-if="channel.feed?.description">
                <div class="text-sm font-medium text-base-content/70">Feed Description</div>
                <div class="text-base">{{ channel.feed.description }}</div>
              </div>
              <div v-if="channel.feed?.maxItems">
                <div class="text-sm font-medium text-base-content/70">Max Feed Items</div>
                <div class="text-base">{{ channel.feed.maxItems }}</div>
              </div>
              <div>
                <div class="text-sm font-medium text-base-content/70">Channel ID</div>
                <div class="text-sm font-mono">{{ channel.id }}</div>
              </div>
            </div>
          </div>
          <div class="card-actions justify-end mt-6">
            <router-link :to="`/channels/${channelId}/edit`" class="btn btn-primary">
              <fa-icon icon="cog" class="mr-2" />
              Edit Settings
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
