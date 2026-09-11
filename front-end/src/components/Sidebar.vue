<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { filter, includes, get as lodashGet } from 'lodash-es';
import { useStore, themeNames } from '../store';
import { storeToRefs } from 'pinia';
import { get } from '@vueuse/core';
import { BlogChannel } from '@vnuge/cmnext-admin';
import { cmnext } from '../main';

const route = useRoute();
const store = useStore();
const { userName, theme, loggedIn } = storeToRefs(store);
const { all: channels } = cmnext.channels;

// Get user profile data from store
const userProfileData = computed(() => store.user.profile || {});

const userEmail = computed(
  () => userProfileData.value.email || userName.value || 'user@example.com'
);

const userDisplayName = computed(() => {
  const profile = userProfileData.value;
  const firstName = lodashGet(profile, 'first_name', '');
  const lastName = lodashGet(profile, 'last_name', '');

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return firstName || lastName || userEmail.value.split('@')[0];
});

const { pinnedChannels } = store.preferences;

const pinned = computed<BlogChannel[]>(() => {
  const pinnedIds = get(pinnedChannels.current);
  return filter(get(channels), (channel: BlogChannel) => includes(pinnedIds, channel.id));
});

const logout = () => {
  store.account.logout();
};
</script>

<template>
  <div class="p-4 w-64 md:w-80 min-h-full bg-base-200 text-base-content flex flex-col">
    <!-- CMNext Branding -->
    <div class="flex items-center gap-3 mb-6 pb-4 border-b border-base-300">
      <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <span class="text-primary-content font-bold text-lg">CM</span>
      </div>
      <div>
        <h1 class="text-lg font-bold">CMNext</h1>
        <p class="text-xs opacity-70">Admin Dashboard</p>
      </div>
    </div>
    <!-- Navigation Menu -->
    <div class="grow overflow-y-auto">
      <ul class="menu w-full">
        <!-- Theme Section -->
        <li class="menu-title">
          <span>Appearance</span>
        </li>
        <li>
          <details>
            <summary>
              <fa-icon icon="palette" class="mr-2" />
              Theme
              <span class="badge badge-sm badge-ghost ml-auto">
                {{ theme }}
              </span>
            </summary>
            <ul class="max-h-60 overflow-y-auto">
              <li v-for="av in themeNames" :key="av">
                <a :class="{ active: theme === av }" @click="theme = av">
                  {{ av }}
                </a>
              </li>
            </ul>
          </details>
        </li>
        <li class="menu-title">
          <span>Navigation</span>
        </li>
        <li>
          <router-link to="/" :class="{ active: route.path === '/' }">
            <fa-icon icon="blog" class="mr-2" />
            Dashboard
          </router-link>
          <router-link to="/channels" :class="{ active: route.path === '/channels' }">
            <fa-icon icon="folder" class="mr-2" />
            Channels
          </router-link>
          <router-link to="/login" :class="{ active: route.path === '/login' }">
            <fa-icon icon="sign-in-alt" class="mr-2" />
            Login
          </router-link>
        </li>
        <li class="menu-title mt-4">
          <span>Pinned Channels</span>
        </li>
        <li v-for="channel in pinned" :key="channel.id">
          <router-link :to="`/channels/${channel.id}`">
            <fa-icon icon="bullhorn" class="mr-2" />
            {{ channel.name }}
            <span>
              <button
                class="btn btn-xs btn-ghost text-error/30 hover:text-error ml-2"
                @click.prevent="pinnedChannels.remove(channel.id)"
              >
                <fa-icon icon="thumbtack-slash" />
              </button>
            </span>
          </router-link>
        </li>
        <li class="mt-2">
          <router-link to="/channels" class="text-sm opacity-70 hover:opacity-100">
            <fa-icon icon="eye" class="mr-2" />
            View All Channels
          </router-link>
        </li>
      </ul>
    </div>

    <!-- User Profile Menu -->
    <div class="mt-auto pt-4 border-t border-base-300">
      <!-- User Avatar/Name Section with Popover -->
      <div v-show="loggedIn" class="relative">
        <div class="dropdown dropdown-top dropdown-end w-full">
          <div
            tabindex="0"
            role="button"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 cursor-pointer w-full transition-colors"
          >
            <div class="avatar placeholder">
              <div
                class="bg-neutral text-neutral-content w-10 rounded-full flex items-center justify-center"
              >
                <fa-icon icon="user" class="text-sm" />
              </div>
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-semibold truncate">{{ userDisplayName }}</div>
              <div class="text-xs opacity-70 truncate">{{ userEmail }}</div>
            </div>
            <fa-icon icon="ellipsis-h" class="text-xs opacity-50" />
          </div>

          <ul
            tabindex="0"
            class="dropdown-content menu bg-base-100 rounded-box z-1 w-64 p-2 shadow-lg border border-base-300"
          >
            <!-- Account Section -->
            <li class="menu-title"><span>Account</span></li>
            <li>
              <router-link :to="{ path: '/account', hash: '#profile' }">
                <fa-icon icon="user" class="mr-2" />
                Profile
              </router-link>
            </li>
            <li>
              <router-link :to="{ path: '/account', hash: '#security' }">
                <fa-icon icon="lock" class="mr-2" />
                Security
              </router-link>
            </li>
            <li>
              <a class="text-error" @click="logout()">
                <fa-icon icon="sign-out-alt" class="mr-2" />
                Logout
              </a>
            </li>

            <li class="divider-sm" />

            <!-- Resources Section -->
            <li class="menu-title"><span>Resources</span></li>
            <li>
              <a
                href="https://www.vaughnnugent.com/resources/software/articles?tags=_cmnext"
                target="_blank"
              >
                <fa-icon icon="book" class="mr-2" />
                Documentation
              </a>
            </li>
            <li>
              <a href="https://github.com/VnUgE/CMNext" target="_blank">
                <fa-icon icon="code" class="mr-2" />
                Source Code
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="mt-4 pt-3 border-t border-base-300">
        <p class="text-xs opacity-70 text-center mb-2">CMNext - AGPL3 licensed</p>
        <div class="flex justify-center gap-2">
          <a
            href="https://github.com/VnUgE/CMNext"
            target="_blank"
            class="text-xs opacity-50 hover:opacity-100"
            title="GitHub"
          >
            <fa-icon :icon="['fab', 'github']" />
          </a>
          <a
            href="https://www.vaughnnugent.com"
            target="_blank"
            class="text-xs opacity-50 hover:opacity-100"
            title="Website"
          >
            <fa-icon icon="globe" />
          </a>
          <!-- Nostr icon placeholder - to be added later -->
          <span class="text-xs opacity-30" title="Nostr (coming soon)"> ₦ </span>
        </div>
        <p class="text-xs opacity-50 text-center mt-2">© 2025 Vaughn Nugent</p>
      </div>
    </div>
  </div>
</template>
