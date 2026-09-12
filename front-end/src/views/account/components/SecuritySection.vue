<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { capitalize } from 'lodash-es';
import { computed } from 'vue';
import { useStore, themeNames } from '../../../store';
import SettingsCard from './SettingsCard.vue';
import PasswordReset from './PasswordReset.vue';

const store = useStore();
const { autoHeartbeat, theme } = storeToRefs(store);

const isThemeSyncEnabled = computed(() => !!store.preferences.state.theme);

const toggleThemeSync = () => {
  const prefs = store.preferences.state;
  if (prefs.theme) {
    store.preferences.update({ theme: false });
  } else {
    store.preferences.update({ theme: theme.value });
  }
};
</script>

<template>
  <div class="space-y-4">
    <!-- Session Settings -->
    <SettingsCard title="Session" description="Control how your login session behaves">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-medium text-sm">Keep me logged in</div>
          <p class="text-xs text-base-content/60 mt-0.5 max-w-md">
            Continuously regenerates credentials to keep you logged in. Recommended to leave
            <strong>off</strong> for security.
          </p>
        </div>
        <input
          v-model="autoHeartbeat"
          type="checkbox"
          class="toggle toggle-primary"
          aria-label="Keep me logged in"
        />
      </div>
    </SettingsCard>

    <!-- Password Reset -->
    <PasswordReset />

    <!-- Appearance Settings -->
    <SettingsCard title="Appearance" description="Customize the look and feel of the application">
      <!-- Theme Selection -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Theme</div>
            <p class="text-xs text-base-content/60 mt-0.5">Choose your preferred color scheme</p>
          </div>
          <select v-model="theme" class="select select-bordered select-sm w-40" aria-label="Theme">
            <option v-for="t in themeNames" :key="t" :value="t">
              {{ capitalize(t) }}
            </option>
          </select>
        </div>

        <div class="divider my-1" />

        <!-- Theme Sync Toggle -->
        <div class="flex items-center justify-between opacity-50">
          <div>
            <div class="font-medium text-sm">Sync theme across devices</div>
            <p class="text-xs text-base-content/60 mt-0.5">
              Save theme preference to your account (coming soon)
            </p>
          </div>
          <input
            :checked="isThemeSyncEnabled"
            type="checkbox"
            class="toggle toggle-sm"
            aria-label="Sync theme across devices"
            @change="toggleThemeSync"
          />
        </div>
      </div>
    </SettingsCard>
  </div>
</template>
