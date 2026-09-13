<script setup lang="ts">
import { isNil, chunk, defaultTo, map, join, toSafeInteger } from 'lodash-es';
import base32Encode from 'base32-encode';
import { computed, ref, shallowRef } from 'vue';
import { get } from '@vueuse/core';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useSession, useTotpApi, type TotpUpdateResponse } from '@vnuge/vnlib.browser';
import { useStore } from '../../../store';
import { confirm, withPassword } from '../../../lib/confirm';
import { vnlib, toaster } from '../../../main';
import { storeToRefs } from 'pinia';
import QrCodeVue from 'qrcode.vue';
import VOtpInput from 'vue3-otp-input';
import SettingsCard from './SettingsCard.vue';

const store = useStore();
const { isLocalAccount } = storeToRefs(store);

const session = useSession(vnlib);
const { invoke: apiCall } = useApiCall({ toaster });
const totpApi = useTotpApi(store.mfa);
const totpEnabled = store.mfa.isEnabled('totp');

const totpMessage = shallowRef<TotpUpdateResponse>();

// Setup flow stage: idle (nothing started), setup (scan + verify), done (verified)
type TotpStage = 'idle' | 'setup' | 'done';
const totpStage = ref<TotpStage>('idle');

const secretSegments = computed<string[]>(() => {
  const chunks = chunk(totpMessage.value?.secret, 6);
  return map(chunks, (chunk) => join(chunk, ''));
});

const qrCode = computed(() => {
  const message = get(totpMessage);
  if (!message || isNil(message.secret)) {
    return '';
  }

  const params = new URLSearchParams();
  params.append('secret', message.secret);
  params.append('issuer', message.issuer);
  params.append('algorithm', message.algorithm);
  params.append('digits', defaultTo(message.digits, 6).toString());
  params.append('period', defaultTo(message.period, 30).toString());
  return `otpauth://totp/${message.issuer}:${store.userName}?${params.toString()}`;
});

const processAddOrUpdate = async () => {
  await withPassword(async (password) => {
    await apiCall(async () => {
      const totp = await totpApi.enable({ password });

      // Decrypt the secret, then store a copy with the readable base32 value
      const secret = base32Encode(await session.decryptPayload(totp.secret), 'RFC3548', {
        padding: false,
      });
      totpMessage.value = { ...totp, secret };
      totpStage.value = 'setup';
    });
  });
};

const configTotp = async () => {
  const { isCanceled } = await confirm({
    title: 'Enable TOTP multi factor?',
    message: 'Are you sure you understand TOTP multi factor and wish to enable it?',
  });

  if (!isCanceled) {
    processAddOrUpdate();
  }
};

const regenTotp = async () => {
  if (!totpEnabled.value) {
    return;
  }

  const { isCanceled } = await confirm({
    title: 'Are you sure?',
    message:
      'If you continue your previous TOTP authenticator and recovery codes will no longer be valid.',
  });

  if (!isCanceled) {
    processAddOrUpdate();
  }
};

const disable = async () => {
  const { isCanceled } = await confirm({
    title: 'Disable TOTP',
    message: 'Are you sure you want to disable TOTP? You may re-enable TOTP later.',
    isWarning: true,
  });

  if (isCanceled) {
    return;
  }

  await withPassword(async (password) => {
    await apiCall(async () => {
      const result = await totpApi.disable({ password });
      toaster.success('Success', result.result);
      store.mfa.refresh();
    });
  });
};

const verifyTotp = (code: string) => {
  apiCall(async () => {
    try {
      await totpApi.verify(toSafeInteger(code));

      totpStage.value = 'done';

      toaster.success('Success', 'Your TOTP code is valid and is now enabled');
    } catch {
      toaster.error('Your TOTP code is not valid.');
    }
  });
};

const closeQrWindow = () => {
  totpStage.value = 'idle';
  totpMessage.value = undefined;

  //Fresh methods
  store.mfa.refresh();
};
</script>

<template>
  <SettingsCard
    title="TOTP Authenticator"
    :description="
      totpEnabled ? 'TOTP is enabled for your account' : 'Use an authenticator app for 2FA'
    "
    :external-auth-blocked="!isLocalAccount"
  >
    <template #actions>
      <div v-if="totpStage === 'idle' && isLocalAccount">
        <div v-if="totpEnabled" class="flex gap-2">
          <button class="btn btn-sm btn-outline" @click.prevent="regenTotp">
            <fa-icon icon="sync" />
            <span class="ml-1">Regenerate</span>
          </button>
          <button class="btn btn-sm btn-error btn-outline" @click.prevent="disable">
            <fa-icon icon="minus-circle" />
            <span class="ml-1">Disable</span>
          </button>
        </div>
        <button v-else class="btn btn-sm btn-primary" @click.prevent="configTotp">
          <fa-icon icon="plus" />
          <span class="ml-1">Setup</span>
        </button>
      </div>
    </template>

    <!-- QR Code Setup Flow -->
    <div v-if="totpStage !== 'idle'" class="text-center space-y-4">
      <p class="text-sm">Scan the QR code with your authenticator app.</p>

      <div class="flex justify-center">
        <QrCodeVue :size="160" render-as="svg" level="Q" :value="qrCode" />
      </div>

      <div>
        <p class="text-xs text-base-content/60 mb-2">Or enter manually:</p>
        <div class="flex flex-wrap justify-center gap-1 p-2 bg-base-200 rounded font-mono text-sm">
          <span v-for="code in secretSegments" :key="code">{{ code }}</span>
        </div>
      </div>

      <div>
        <p class="text-sm text-base-content/70 mb-2">Enter the code from your app to verify:</p>
        <div class="flex justify-center">
          <VOtpInput
            class="otp-input"
            input-type="letter-numeric"
            separator=""
            value=""
            :is-disabled="totpStage === 'done'"
            input-classes="input input-bordered w-10 h-10 text-center mx-0.5"
            :num-inputs="6"
            @on-complete="verifyTotp"
          />
        </div>
      </div>

      <div v-if="totpStage === 'done'" class="pt-2">
        <button class="btn btn-primary btn-sm" @click.prevent="closeQrWindow">
          Complete Setup
        </button>
      </div>
    </div>

    <!-- Info when not enabled -->
    <p v-else-if="!totpEnabled" class="text-sm text-base-content/70">
      TOTP is a time-based one-time password. Use apps like Google Authenticator, Authy, or Duo.
      <a
        class="link"
        href="https://en.wikipedia.org/wiki/Time-based_one-time_password"
        target="_blank"
      >
        Learn more
      </a>
    </p>
  </SettingsCard>
</template>
