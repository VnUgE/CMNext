<script setup lang="ts">
import { useStore } from '../../../store';
import { useRouteQuery } from '@vueuse/router';
import { get, useArrayFilter } from '@vueuse/core';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { toLower } from 'lodash-es';
import type { BlogChannel } from '@vnuge/cmnext-admin';
import { cmnext, toaster } from '../../../main';
import { confirm } from '../../../lib/confirm';
import { computed } from 'vue';

const store = useStore();
const { invoke: apiCall } = useApiCall({ toaster });

// Set page title
store.setPageTitle('Channels');

const { pinnedChannels } = store.preferences;

// State
const searchTerm = useRouteQuery<string>('search', '');

const searchFilter = useArrayFilter(cmnext.channels.all, (channel) => {
  const search = toLower(get(searchTerm));
  const name = toLower(channel.name || '');
  const path = toLower(channel.path || '');
  return !search || name.includes(search) || path.includes(search);
});

const isLoading = computed(() => cmnext.channels.isLoading.value);

const feedEnabled = (channel: BlogChannel) => channel.feed && channel.feed.path;
const isPinned = (channelId: string) => pinnedChannels.isPinned(channelId);

const deleteChannel = async (channel: BlogChannel) => {
  const { isCanceled } = await confirm({
    title: 'Delete Channel',
    message: `Are you sure you want to delete the channel "${channel.name}"? This action cannot be undone.`,
    isWarning: true,
  });

  if (isCanceled) return;

  apiCall(async () => {
    await cmnext.channels.delete(channel);

    toaster.success('Channel Deleted', `Channel "${channel.name}" has been deleted successfully.`);

    // The channels store is app-wide; refresh so the card disappears
    await cmnext.channels.refresh();
  });
};

const togglePin = (channelId: string) => {
  if (pinnedChannels.isPinned(channelId)) {
    pinnedChannels.remove(channelId);
  } else {
    pinnedChannels.add(channelId);
  }
};
</script>
<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-base-content">Channels</h1>
        <p class="text-base-content/70 mt-1">Manage your content channels</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-outline" :disabled="isLoading" @click="cmnext.channels.refresh()">
          <fa-icon icon="sync" :class="{ 'animate-spin': isLoading }" class="mr-2" />
          Refresh
        </button>
        <router-link to="/channels/new/edit" class="btn btn-primary">
          <fa-icon icon="plus" class="mr-2" />
          New Channel
        </router-link>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card bg-base-100 shadow">
      <div class="card-body py-4">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search channels..."
              class="input input-bordered w-full"
              aria-label="Search channels"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Channels Grid -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div v-else-if="searchFilter.length === 0" class="text-center py-12">
      <fa-icon icon="bullhorn" size="3x" class="text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold text-base-content/70 mb-2">No channels found</h3>
      <p v-if="searchTerm" class="text-base-content/50 mb-6">Try adjusting your search criteria</p>
      <p v-else class="text-base-content/50 mb-6">Create your first channel to get started</p>
      <router-link to="/channels/new/edit" class="btn btn-primary">
        <fa-icon icon="plus" class="mr-2" />
        Create Channel
      </router-link>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="channel in searchFilter"
        :key="channel.id"
        class="card bg-base-100 shadow hover:shadow-lg transition-shadow"
      >
        <div class="card-body">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <fa-icon icon="blog" class="text-primary text-xl" />
              </div>
              <div>
                <h3 class="card-title text-lg">{{ channel.name }}</h3>
              </div>
            </div>
            <div class="dropdown dropdown-left ml-auto">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                <fa-icon icon="ellipsis-h" />
              </div>
              <ul
                tabindex="0"
                class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow"
              >
                <li>
                  <router-link :to="`/channels/${channel.id}`">
                    <fa-icon icon="eye" class="mr-2" />
                    View Channel
                  </router-link>
                </li>
                <li>
                  <router-link :to="`/channels/${channel.id}/edit`">
                    <fa-icon icon="edit" class="mr-2" />
                    Edit Settings
                  </router-link>
                </li>
                <li>
                  <button class="text-primary" @click="togglePin(channel.id)">
                    <fa-icon
                      :icon="isPinned(channel.id) ? 'thumbtack-slash' : 'thumbtack'"
                      class="mr-2"
                    />
                    {{ isPinned(channel.id) ? 'Unpin Channel' : 'Pin Channel' }}
                  </button>
                </li>
                <li class="divider-sm" />
                <li>
                  <button class="text-error" @click="deleteChannel(channel)">
                    <fa-icon icon="trash" class="mr-2" />
                    Delete
                  </button>
                </li>
              </ul>
            </div>
            <div class="ml-1" />
          </div>

          <p v-if="channel.path" class="text-sm text-base-content/70 mb-4 line-clamp-2">
            {{ channel.path }}
          </p>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-base-content/50">RSS Feed</div>
              <div class="font-semibold">
                {{ feedEnabled(channel) ? 'Configured' : 'Not Configured' }}
              </div>
            </div>
          </div>

          <div class="card-actions justify-end mt-4">
            <router-link :to="`/channels/${channel.id}/posts`" class="btn btn-sm btn-outline">
              Manage Posts
            </router-link>
            <router-link :to="`/channels/${channel.id}`" class="btn btn-sm btn-primary">
              View Channel
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
