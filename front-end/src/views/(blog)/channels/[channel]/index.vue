<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '../../../../store';
import { useRouteParams } from '@vueuse/router';
import { reduce, take } from 'lodash-es';
import { formatBytes, formatDate } from '../../../../lib/helpers';
import { cmnext } from '../../../../main';

const store = useStore();

// Get channel ID from route params
const channelId = useRouteParams<string>('channel', '');

// Set page title
store.setPageTitle('Channel Details');

const channel = cmnext.channels.single(channelId);
const { all: posts, isLoading: postsLoading } = cmnext.createPostStore(channelId);
const { all: content, isLoading: contentLoading } = cmnext.createContentStore(channelId);

const isLoading = computed(() => postsLoading.value || contentLoading.value);

// Computed properties
const postCount = computed(() => posts.value.length);
const contentCount = computed(() => content.value.length);
const recentPosts = computed(() => take(posts.value, 5));

const contentSize = computed(() => {
  const totalSize = reduce(content.value, (total, item) => total + (item.length || 0), 0);
  return formatBytes(totalSize);
});

const getChannelFeedUrl = (): string | undefined => channel.value?.feed?.url || undefined;
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
          <router-link :to="`/channels/${channelId}/posts`" class="btn btn-primary">
            <fa-icon icon="edit" class="mr-2" />
            Manage Posts
          </router-link>
        </div>
      </div>

      <!-- Channel Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-figure text-primary">
            <fa-icon icon="comment" size="2x" />
          </div>
          <div class="stat-title">Total Posts</div>
          <div class="stat-value text-primary">{{ postCount }}</div>
        </div>

        <div class="stat bg-base-100 rounded-lg shadow">
          <div class="stat-figure text-info">
            <fa-icon icon="folder-open" size="2x" />
          </div>
          <div class="stat-title">Storage Used</div>
          <div class="stat-value text-info text-lg">{{ contentSize }}</div>
          <div class="stat-desc">{{ contentCount || 0 }} files</div>
        </div>
      </div>

      <!-- Channel Management -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
        <!-- Recent Posts -->
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title">
              <fa-icon icon="comment" class="mr-2" />
              Recent Posts
            </h2>
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
                class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
              >
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ post.title }}</div>
                  <div class="text-sm text-base-content/70">
                    {{ formatDate(post.date) }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <router-link
                    :to="`/channels/${channelId}/posts/${post.id}`"
                    class="btn btn-xs btn-ghost"
                  >
                    <fa-icon icon="edit" />
                  </router-link>
                </div>
              </div>
            </div>
            <div class="card-actions justify-end mt-4">
              <router-link :to="`/channels/${channelId}/posts`" class="btn btn-sm btn-outline">
                View All Posts
              </router-link>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title">
              <fa-icon icon="bolt" class="mr-2" />
              Quick Actions
            </h2>
            <div class="grid grid-cols-1 gap-3">
              <router-link
                :to="`/channels/${channelId}/posts/new`"
                class="btn btn-outline btn-lg justify-start gap-3"
              >
                <fa-icon icon="plus" />
                New Post
              </router-link>
              <router-link
                :to="`/channels/${channelId}/content`"
                class="btn btn-outline btn-lg justify-start gap-3"
              >
                <fa-icon icon="folder-open" />
                Manage Content
              </router-link>
              <router-link
                :to="`/channels/${channelId}/edit`"
                class="btn btn-outline btn-lg justify-start gap-3"
              >
                <fa-icon icon="cog" />
                Channel Settings
              </router-link>
              <a
                v-if="getChannelFeedUrl()"
                :href="getChannelFeedUrl()"
                target="_blank"
                class="btn btn-outline btn-lg justify-start gap-3"
              >
                <fa-icon icon="rss" />
                View RSS Feed
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Channel Settings Preview -->
      <div class="card bg-base-100 shadow py-2">
        <div class="card-body">
          <h2 class="card-title">
            <fa-icon icon="cog" class="mr-2" />
            Channel Information
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-base-content/70">Channel Name</label>
                  <div class="text-base font-medium">{{ channel.name }}</div>
                </div>
                <div>
                  <label class="text-sm font-medium text-base-content/70">Storage Path</label>
                  <div class="text-base">{{ channel.path || 'Not found' }}</div>
                </div>
              </div>
            </div>
            <div>
              <div class="space-y-4">
                <div v-if="getChannelFeedUrl()">
                  <label class="text-sm font-medium text-base-content/70">Feed URL</label>
                  <div class="text-sm font-mono break-all">
                    {{ getChannelFeedUrl() }}
                  </div>
                </div>
                <div>
                  <label class="text-sm font-medium text-base-content/70">Channel ID</label>
                  <div class="text-sm font-mono">{{ channel.id }}</div>
                </div>
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
