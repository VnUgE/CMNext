<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRouteParams, useRouteQuery } from '@vueuse/router';
import { get, useArrayReduce, useClipboard, useOffsetPagination } from '@vueuse/core';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { defaultTo, filter, find, includes, isNil, min, orderBy, slice, toLower } from 'lodash-es';
import type { ContentMeta } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useStore } from '../../../../../store';
import { cmnext, toaster } from '../../../../../main';
import { confirm } from '../../../../../lib/confirm';
import { formatBytes, formatDate } from '../../../../../lib/helpers';

type SortType = 'modified' | 'name' | 'size' | 'type';

const sortOptions: { value: SortType; label: string }[] = [
  { value: 'modified', label: 'Last Modified' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' },
];

const store = useStore();
const { invoke: apiCall } = useApiCall({ toaster });

// Set page title
store.setPageTitle('Channel Content');

// Get channel ID from route parameters
const channelId = useRouteParams<string>('channel', '');

// Get optional query parameters for filtering/searching
const search = useRouteQuery<string>('search', '', { mode: 'push' });
const sortMode = useRouteQuery<SortType>('sort', 'modified', { mode: 'push' });

// Create scoped stores for this channel
const content = cmnext.createContentStore(channelId);
const channel = cmnext.channels.single(channelId);

// Computed values
const hasChannel = computed(() => !isNil(channel.value));
const hasContent = computed(() => content.all.value.length > 0);
const fileCount = computed(() => content.all.value.length);
const totalSize = useArrayReduce(content.all, (sum, file) => sum + defaultTo(file.length, 0), 0);
const sortLabel = computed(
  () => find(sortOptions, (opt) => opt.value === sortMode.value)?.label ?? 'Sort'
);

const sortedContent = computed(() => {
  if (!hasContent.value) return [];

  // orderBy returns a new array (never mutates shared store state) and its
  // iteratees are null-friendly, so missing names/types sort safely
  const all = get(content.all) as ContentMeta[];

  let sorted: ContentMeta[];
  switch (sortMode.value) {
    case 'modified':
      sorted = orderBy(all, ['date'], ['desc']);
      break;
    case 'name':
      sorted = orderBy(all, [(file) => toLower(file.name)], ['asc']);
      break;
    case 'size':
      sorted = orderBy(all, [(file) => defaultTo(file.length, 0)], ['desc']);
      break;
    case 'type':
      sorted = orderBy(all, [(file) => toLower(file.content_type)], ['asc']);
      break;
    default:
      // Unknown ?sort= values (hand-edited URLs) fall back to the default order
      sorted = orderBy(all, ['date'], ['desc']);
      break;
  }

  // Filter by search term (toLower coerces missing values to '')
  if (search.value) {
    const term = toLower(search.value);
    sorted = filter(sorted, (file) => {
      return includes(toLower(file.name), term) || includes(toLower(file.path), term);
    });
  }

  return sorted;
});

const { currentPage, currentPageSize, pageCount, isFirstPage, isLastPage, prev, next } =
  useOffsetPagination({
    total: computed(() => sortedContent.value.length),
    pageSize: 15,
  });

const pagedContent = computed(() => {
  const start = (currentPage.value - 1) * currentPageSize.value;
  return slice(sortedContent.value, start, start + currentPageSize.value);
});

// Display range for the current page, e.g. "1–15 of 42"
const rangeStart = computed(() =>
  sortedContent.value.length === 0 ? 0 : (currentPage.value - 1) * currentPageSize.value + 1
);
const rangeEnd = computed(
  () => min([currentPage.value * currentPageSize.value, sortedContent.value.length]) ?? 0
);

// Clipboard
const { copy, isSupported: clipboardSupported } = useClipboard();

const copyFileField = (file: ContentMeta, field: 'id' | 'path', label: string) => {
  const value = file[field];
  if (!value) return;
  copy(value);
  toaster.success('Copied', `${label} "${value}" copied to clipboard.`);
};

// Content operations
const onDeleteFile = async (file: ContentMeta) => {
  const { isCanceled } = await confirm({
    title: 'Delete File?',
    message: `Are you sure you want to delete the file "${file.name}"? This action cannot be undone.`,
  });

  if (isCanceled) return;

  await apiCall(async () => {
    await content.delete(file);

    toaster.success('File Deleted', `File "${file.name}" has been deleted successfully.`);
  });

  await content.refresh();
};

// Reset to page 1 when search/sort changes
watch([search, sortMode], () => {
  if (currentPage.value > 1) currentPage.value = 1;
});
</script>

<template>
  <div id="channel-content-page" class="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="flex items-center gap-4">
        <router-link :to="`/channels/${channelId}`" class="btn btn-ghost btn-sm shrink-0">
          <fa-icon icon="arrow-left" class="mr-2" />
          Back
        </router-link>
        <div class="divider divider-horizontal mx-0" />
        <div class="min-w-0">
          <h1 class="text-2xl md:text-3xl font-bold text-base-content truncate">Manage Content</h1>
          <p class="text-base-content/70 mt-1 md:block hidden">
            Manage uploads and attachments for this channel
          </p>
        </div>
      </div>
      <div class="grid grid-cols-2 md:flex gap-2">
        <router-link :to="`/channels/${channelId}/content/new`" class="btn btn-primary">
          <fa-icon icon="plus" class="mr-2" />
          Upload
        </router-link>
        <router-link :to="`/channels/${channelId}/edit`" class="btn btn-outline">
          <fa-icon icon="cog" class="mr-2" />
          Settings
        </router-link>
      </div>
    </div>

    <!-- Stats strip, ahead of the main section -->
    <div
      v-if="hasChannel"
      class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-base-content/60"
    >
      <span class="inline-flex items-center gap-1.5">
        <fa-icon icon="file-alt" />
        {{ fileCount }} {{ fileCount === 1 ? 'file' : 'files' }}
      </span>
      <span>{{ formatBytes(totalSize) }} Total</span>
    </div>

    <!-- Search filter bar, sort control rides along on desktop, popover on mobile -->
    <div class="flex gap-2">
      <div class="form-control flex-1 min-w-0">
        <input
          v-model="search"
          type="text"
          class="input input-bordered w-full"
          placeholder="Search files..."
          aria-label="Search files"
        />
      </div>
      <select
        v-model="sortMode"
        class="hidden md:block select select-bordered w-auto"
        aria-label="Sort files"
      >
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
          Sort by {{ opt.label }}
        </option>
      </select>
      <Menu as="div" class="relative md:hidden shrink-0">
        <MenuButton class="btn btn-outline" aria-label="Sort files">
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

    <!-- Content List -->
    <!-- Loading indicator -->
    <div v-if="content.isLoading.value" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- No channel selected -->
    <div v-else-if="!hasChannel" class="text-center py-12">
      <fa-icon icon="triangle-exclamation" class="text-6xl text-warning mb-4" />
      <h3 class="text-2xl font-bold mb-2">No Channel Selected</h3>
      <p class="text-lg opacity-75 mb-4">Please select a channel to view its content.</p>
      <router-link to="/channels" class="btn btn-primary"> Back to Channels </router-link>
    </div>

    <!-- No content found -->
    <div v-else-if="!hasContent" class="text-center py-12">
      <fa-icon icon="folder-open" class="text-6xl text-base-300 mb-4" />
      <h3 class="text-2xl font-bold mb-2">No Files Yet</h3>
      <p class="text-lg opacity-75 mb-4">
        This channel doesn&apos;t have any uploaded content yet.
      </p>
      <router-link class="btn btn-primary" :to="`/channels/${channelId}/content/new`">
        <fa-icon icon="plus" />
        Upload First File
      </router-link>
    </div>

    <!-- No search results -->
    <div v-else-if="sortedContent.length === 0" class="text-center py-12">
      <fa-icon icon="folder-open" class="text-6xl text-base-300 mb-4" />
      <h3 class="text-2xl font-bold mb-2">No Matches</h3>
      <p class="text-lg opacity-75 mb-4">No files match &quot;{{ search }}&quot;.</p>
      <button class="btn btn-outline" @click="search = ''">Clear Search</button>
    </div>

    <!-- Content table -->
    <div v-else class="card bg-base-100 shadow overflow-hidden z-0">
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>File</th>
              <th class="hidden sm:table-cell">Type</th>
              <th class="hidden md:table-cell">Modified</th>
              <th class="text-right">Size</th>
              <th><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="overflow-x-auto relative">
            <tr v-for="file in pagedContent" :key="file.id">
              <td>
                <div class="flex items-center gap-2 min-w-0">
                  <fa-icon icon="file-alt" class="text-base-content/40 shrink-0" />
                  <span class="font-mono text-sm truncate" :title="file.name">
                    {{ file.name || 'Unnamed File' }}
                  </span>
                </div>
              </td>
              <td class="hidden sm:table-cell">
                <span class="badge badge-sm badge-ghost max-w-full truncate">
                  {{ file.content_type }}
                </span>
              </td>
              <td class="hidden md:table-cell whitespace-nowrap">{{ formatDate(file.date) }}</td>
              <td class="text-right whitespace-nowrap">{{ formatBytes(file.length) }}</td>
              <td class="text-right whitespace-nowrap w-14">
                <div class="dropdown dropdown-left shrink-0">
                  <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                    <fa-icon icon="ellipsis-h" />
                  </div>
                  <ul
                    tabindex="0"
                    class="dropdown-content menu bg-base-100 rounded-box z-30 w-52 p-2 shadow"
                  >
                    <li>
                      <router-link :to="`/channels/${channelId}/content/${file.id}`">
                        <fa-icon icon="edit" />
                        Edit
                      </router-link>
                    </li>
                    <li v-if="clipboardSupported">
                      <button @click="copyFileField(file, 'id', 'ID')">
                        <fa-icon icon="copy" />
                        Copy ID
                      </button>
                    </li>
                    <li v-if="clipboardSupported">
                      <button @click="copyFileField(file, 'path', 'Path')">
                        <fa-icon icon="link" />
                        Copy Path
                      </button>
                    </li>
                    <li class="divider-sm" />
                    <li>
                      <button class="text-error" @click="onDeleteFile(file)">
                        <fa-icon icon="trash" />
                        Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        class="flex flex-row items-center justify-between gap-3 px-4 py-3 border-t border-base-300"
      >
        <p class="text-sm text-base-content/60">
          Showing <span class="font-medium text-base-content">{{ rangeStart }}</span
          >–<span class="font-medium text-base-content">{{ rangeEnd }}</span> of
          <span class="font-medium text-base-content">{{ sortedContent.length }}</span>
        </p>
        <div class="join">
          <button
            class="btn btn-sm join-item"
            :disabled="isFirstPage"
            aria-label="Previous page"
            @click="prev"
          >
            <fa-icon icon="chevron-left" />
          </button>
          <button class="btn btn-sm join-item pointer-events-none" disabled>
            {{ currentPage }} / {{ pageCount }}
          </button>
          <button
            class="btn btn-sm join-item"
            :disabled="isLastPage"
            aria-label="Next page"
            @click="next"
          >
            <fa-icon icon="chevron-right" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
