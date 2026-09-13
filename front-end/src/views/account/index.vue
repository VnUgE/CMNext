<script setup lang="ts">
import { useStore } from '../../store';
import ProfileSection from './sections/ProfileSection.vue';
import PreferencesSection from './sections/PreferencesSection.vue';
import PasswordReset from './sections/PasswordReset.vue';
import TotpSettings from './sections/TotpSettings.vue';
import Fido from './sections/Fido.vue';
import Pki from './sections/Pki.vue';

const store = useStore();
store.setPageTitle('Account Settings');

// Prime MFA state for the security section below
store.mfa.refresh();
</script>

<template>
  <div class="p-6 space-y-6 max-w-6xl mx-auto">
    <div>
      <h1 class="text-3xl font-bold text-base-content">Account Settings</h1>
      <p class="text-base-content/70 mt-1">Identity, security, and preferences for this operator</p>
    </div>

    <!-- Two-column on wide screens: forms left, credentials right.
      Single column on mobile, both columns scroll as one page. -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      <div class="lg:col-span-3 space-y-6 min-w-0">
        <section id="profile" class="scroll-mt-6">
          <ProfileSection />
        </section>

        <section id="preferences" class="scroll-mt-6">
          <PreferencesSection />
        </section>
      </div>

      <div class="lg:col-span-2 space-y-6 min-w-0">
        <section id="security" class="scroll-mt-6 space-y-4">
          <PasswordReset />
          <!-- Unsupported methods never mount their templates at all -->
          <TotpSettings v-if="store.mfa.isSupported('totp')" />
          <Fido v-if="store.mfa.isSupported('fido')" />
          <Pki v-if="store.mfa.isSupported('pkotp')" />
        </section>
      </div>
    </div>
  </div>
</template>
