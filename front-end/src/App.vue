<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useStore } from './store';
import { storeToRefs } from 'pinia';
import { useTitle, whenever } from '@vueuse/core';
import { cmnext, toaster } from './main';
import Sidebar from './components/Sidebar.vue';
const ConfirmPrompt = defineAsyncComponent(() => import('./components/ConfirmPrompt.vue'));
const PasswordPrompt = defineAsyncComponent(() => import('./components/PasswordPrompt.vue'));

const store = useStore();
const { pageTitle, loggedIn } = storeToRefs(store);

store.setPageTitle('Home');

useTitle(computed(() => `${pageTitle.value} | CMNext Admin`));

// Refresh channels whenever the user logs in
whenever(loggedIn, () => cmnext.channels.refresh());
// Surfaces load errors
whenever(
  () => store.account.error,
  (err) => {
    toaster.error('Load error', err instanceof Error ? err.message : 'Unknown error');
  }
);
</script>

<template>
  <!-- The drawer chrome only exists for authenticated users; logged-out
    visitors get a full-width centered auth layout instead of a dead shell -->
  <div class="drawer" :class="{ 'lg:drawer-open': loggedIn }">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />
    <div ref="content" class="drawer-content flex flex-col min-h-screen">
      <!-- Toasts render in a centered, width-capped stack (see style block) -->
      <notifications
        class="toast-stack"
        group="general"
        position="top center"
        classes="cmnext-toast"
        :max="3"
        :duration="5000"
      />

      <!-- Main body for router-view -->
      <div id="env-body" class="grow w-full">
        <router-view />
      </div>

      <!-- Hamburger button for mobile to open drawer -->
      <div v-if="loggedIn" class="lg:hidden fixed top-4 left-4 z-50">
        <label for="main-drawer" class="btn btn-primary drawer-button">
          <fa-icon icon="bars" />
        </label>
      </div>
    </div>

    <div v-if="loggedIn" class="drawer-side z-50">
      <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay" />
      <Sidebar />
    </div>
  </div>

  <PasswordPrompt />
  <ConfirmPrompt />
</template>
