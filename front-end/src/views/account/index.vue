<script setup lang="ts">
import { computed } from 'vue';
import { useRouteQuery } from '@vueuse/router';
import { useStore } from '../../store';
import ProfileSection from './components/ProfileSection.vue';
import SecuritySection from './components/SecuritySection.vue';
import AuthenticationSection from './components/AuthenticationSection.vue';

const store = useStore();
store.setPageTitle('Account');

type TabId = 'profile' | 'security' | 'authentication';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'authentication', label: 'Authentication', icon: 'key' },
];

const validTabs: readonly TabId[] = ['profile', 'security', 'authentication'];

const activeTab = useRouteQuery<TabId>('tab', 'profile', {
  transform: (value) => validTabs.find((tab) => tab === value) ?? 'profile',
});

const currentTabComponent = computed(() => {
  switch (activeTab.value) {
    case 'profile':
      return ProfileSection;
    case 'security':
      return SecuritySection;
    case 'authentication':
      return AuthenticationSection;
    default:
      return ProfileSection;
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 max-w-4xl mx-auto">
    <!-- Page Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-base-content">Account Settings</h2>
      <p class="text-base-content/70 mt-1">
        Manage your profile, security, and authentication options
      </p>
    </div>

    <!-- Desktop: Horizontal Tabs -->
    <div class="hidden sm:block">
      <div class="tabs tabs-border mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab gap-2"
          :class="{ 'tab-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <fa-icon :icon="tab.icon" class="text-sm" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Mobile: Compact Horizontal Menu -->
    <div class="sm:hidden mb-4">
      <ul class="menu menu-horizontal bg-base-200 rounded-box w-full justify-center">
        <li v-for="tab in tabs" :key="tab.id">
          <a
            class="gap-1 px-3"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <fa-icon :icon="tab.icon" class="text-xs" />
            <span class="text-sm">{{ tab.label }}</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Tab Content -->
    <div class="space-y-4">
      <component :is="currentTabComponent" />
    </div>
  </div>
</template>
