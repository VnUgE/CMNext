<script setup lang="ts">
import { useStore } from '../../../store';
import TotpSettings from './TotpSettings.vue';
import Fido from './Fido.vue';
import Pki from './Pki.vue';

const store = useStore();

// Refresh MFA methods on mount
store.mfa.refresh();
</script>

<template>
  <div class="space-y-4">
    <!-- Section Header -->
    <div class="pb-2">
      <p class="text-sm text-base-content/70">
        Add extra security layers to protect your account with multi-factor authentication.
      </p>
    </div>

    <!-- TOTP Authenticator -->
    <TotpSettings />

    <!-- Security Keys (FIDO/WebAuthn) -->
    <Fido />

    <!-- OTP Public Keys -->
    <Pki />
  </div>
</template>
