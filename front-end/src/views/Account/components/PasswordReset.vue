<script setup lang="ts">
import { toSafeInteger } from 'lodash-es';
import { useAccount } from '@vnuge/vnlib.browser';
import { computed, reactive } from 'vue';
import { useToggle } from '@vueuse/core';
import { useStore } from '../../../store';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { vnlib, toaster } from '../../../main';
import { useFormValidation } from '../../../lib/forms';
import * as yup from 'yup';
import SettingsCard from './SettingsCard.vue';

const store = useStore();
const totpEnabled = store.mfa.isEnabled('totp');

const { resetPassword } = useAccount(vnlib);
const { validate } = useFormValidation({ toaster });
const apiCall = useApiCall({ toaster });
const waiting = computed(() => apiCall.waiting.value);

const [pwResetShow, showForm] = useToggle(false);

const vState = reactive({
  newPassword: '',
  repeatPassword: '',
  current: '',
  totpCode: '',
});

const validationSchema = computed(() => {
  const baseSchema = {
    current: yup
      .string()
      .required('Current password cannot be empty')
      .min(8, 'Current password must be at least 8 characters')
      .max(128, 'Current password must have less than 128 characters'),
    newPassword: yup
      .string()
      .required('New password cannot be empty')
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password must have less than 128 characters')
      .test(
        'not-same-as-current',
        'New password cannot be the same as your current password',
        function (value) {
          return value !== this.parent.current;
        }
      ),
    repeatPassword: yup
      .string()
      .required('Repeat password cannot be empty')
      .min(8, 'Repeat password must be at least 8 characters')
      .max(128, 'Repeat password must have less than 128 characters')
      .oneOf([yup.ref('newPassword')], 'Your new passwords do not match'),
    totpCode: totpEnabled.value
      ? yup
          .string()
          .required('TOTP code cannot be empty')
          .min(6, 'TOTP code must be at least 6 characters')
          .max(12, 'TOTP code must have less than 12 characters')
      : yup.string(),
  };

  return yup.object(baseSchema);
});

const onSubmit = async () => {
  if (!(await validate(vState, validationSchema.value))) {
    return;
  }

  interface IResetPasswordArgs {
    totp_code?: number;
  }

  await apiCall(async () => {
    const args: IResetPasswordArgs = {};

    if (totpEnabled.value) {
      args.totp_code = toSafeInteger(vState.totpCode);
    }

    const { getResultOrThrow } = await resetPassword(vState.current, vState.newPassword, args);

    const result = getResultOrThrow() as string;

    resetForm();

    toaster.success('Success', result);
  });
};

const resetForm = () => {
  vState.current = '';
  vState.newPassword = '';
  vState.repeatPassword = '';
  vState.totpCode = '';
  showForm(false);
};
</script>

<template>
  <SettingsCard
    title="Password"
    :description="
      pwResetShow ? 'Enter your current and new password' : 'Change your account password'
    "
  >
    <template #actions>
      <button v-if="!pwResetShow" class="btn btn-sm btn-ghost" @click="showForm(true)">
        <fa-icon icon="sync" class="text-sm" />
        Change
      </button>
    </template>

    <!-- Default state -->
    <p v-if="!pwResetShow" class="text-sm text-base-content/70">
      Only available for internal accounts. External auth providers require password reset through
      their service.
    </p>

    <!-- Password reset form -->
    <form v-else class="space-y-3" @submit.prevent="onSubmit">
      <div class="form-control">
        <label class="label py-1">
          <span class="label-text text-sm">Current Password</span>
        </label>
        <input
          v-model="vState.current"
          type="password"
          class="input input-bordered input-sm w-full"
          :disabled="waiting"
          autocomplete="current-password"
        />
      </div>

      <div class="form-control">
        <label class="label py-1">
          <span class="label-text text-sm">New Password</span>
        </label>
        <input
          v-model="vState.newPassword"
          type="password"
          class="input input-bordered input-sm w-full"
          :disabled="waiting"
          autocomplete="new-password"
        />
      </div>

      <div class="form-control">
        <label class="label py-1">
          <span class="label-text text-sm">Confirm Password</span>
        </label>
        <input
          v-model="vState.repeatPassword"
          type="password"
          class="input input-bordered input-sm w-full"
          :disabled="waiting"
          autocomplete="new-password"
        />
      </div>

      <div v-if="totpEnabled" class="form-control">
        <label class="label py-1">
          <span class="label-text text-sm">TOTP Code</span>
        </label>
        <input
          v-model="vState.totpCode"
          type="text"
          class="input input-bordered input-sm w-full"
          :disabled="waiting"
          autocomplete="one-time-code"
        />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="btn btn-sm btn-ghost" :disabled="waiting" @click="resetForm">
          Cancel
        </button>
        <button type="submit" class="btn btn-sm btn-primary" :disabled="waiting">
          <span v-if="waiting" class="loading loading-spinner loading-sm" />
          <fa-icon v-else icon="check" />
          Update
        </button>
      </div>
    </form>
  </SettingsCard>
</template>
