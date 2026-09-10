<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useStore } from './store';
import { storeToRefs } from 'pinia';
import { whenever } from '@vueuse/core';
import { cmnext, toaster } from './main';
import Sidebar from './components/Sidebar.vue';
const ConfirmPrompt = defineAsyncComponent(() => import('./components/ConfirmPrompt.vue'));
const PasswordPrompt = defineAsyncComponent(() => import('./components/PasswordPrompt.vue'));

const store = useStore();
const { pageTitle, loggedIn } = storeToRefs(store);

store.setPageTitle('Home');

// Refresh channels whenever the user logs in
whenever(loggedIn, () => cmnext.channels.refresh());
whenever(
  () => store.account.error,
  (err) => {
    toaster.error('Load error', err);
  }
);
</script>

<template>
  <head>
    <title>{{ pageTitle }} | CMNext Admin</title>
  </head>

  <div class="drawer lg:drawer-open">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />
    <div ref="content" class="drawer-content flex flex-col min-h-screen">
      <!-- Notifications - positioned at top of content -->
      <div class="relative w-full">
        <notifications class="general-toast top-4" group="general" position="top" />
        <notifications class="form-toast top-4" group="form" position="top" />
      </div>

      <!-- Main body for router-view -->
      <div id="env-body" class="grow w-full">
        <router-view />
      </div>

      <!-- Hamburger button for mobile to open drawer -->
      <div class="lg:hidden fixed top-4 left-4 z-50">
        <label for="main-drawer" class="btn btn-primary drawer-button">
          <fa-icon icon="bars" />
        </label>
      </div>
    </div>

    <div class="drawer-side z-50">
      <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay" />
      <Sidebar />
    </div>
  </div>

  <PasswordPrompt />
  <ConfirmPrompt />
</template>
