<script setup lang="ts">
import { toSafeInteger } from 'lodash-es';
import { useAccount } from '@vnuge/vnlib.browser'
import { computed, reactive } from 'vue'
import { useToggle } from '@vueuse/core';
import { useStore } from '../../../../store';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { vnlib, toaster } from '../../../../main';
import { useFormValidation } from '../../../../lib/forms';
import * as yup from 'yup';

const store = useStore()
const totpEnabled = store.mfa.isEnabled('totp')

const { resetPassword } = useAccount(vnlib)
const { invoke: apiCall, waiting } = useApiCall({ toaster });
const { validate } = useFormValidation({ toaster });

const [pwResetShow, showForm] = useToggle(false)

const vState = reactive({
  newPassword: '',
  repeatPassword: '',
  current: '',
  totpCode: ''
})

// Create Yup validation schema
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
          return value !== this.parent.current
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
      : yup.string()
  }

  return yup.object(baseSchema)
})

const onSubmit = async () => {

  // Validate form data
  if (! await validate(vState, validationSchema.value)) {
    return
  }

  interface IResetPasswordArgs {
    totp_code?: number
  }

  await apiCall(async () => {
    const args: IResetPasswordArgs = {}

    //Add totp code if enabled
    if (totpEnabled.value) {
      args.totp_code = toSafeInteger(vState.totpCode)
    }

    //Exec pw reset
    const { getResultOrThrow } = await resetPassword(
      vState.current,
      vState.newPassword,
      args
    )

    //Get result or raise exception to handler
    const result = getResultOrThrow() as string

    // success
    resetForm()

    // Push a success toast
    toaster.success('Success', result)
  })
}

const resetForm = () => {
  vState.current = ''
  vState.newPassword = ''
  vState.repeatPassword = ''
  vState.totpCode = ''
  showForm(false)
}

</script>

<template>
  <div id="pwreset-settings" class="container">
    <div class="panel-content">

      <div v-if="!pwResetShow" class="">
        <div class="flex flex-wrap items-center justify-between">

          <div class="">
            <h5>Password Reset</h5>
          </div>

          <div class="flex justify-end">
            <button class="btn xs" @click="showForm(true)">
              <fa-icon icon="sync" />
              <span class="pl-2">Reset Password</span>
            </button>
          </div>
        </div>

        <p class="mt-3 text-sm text-bg">
          You may only reset your password if you have an internal user account. If you exclusivly use an external
          authentication provider (like GitHub or Discord), you will need to reset your password externally.
        </p>
      </div>

      <div v-else class="px-2 my-2">

        <p class="my-3 text-center">
          Enter your current password, new password, and confirm the new password.
        </p>

        <form id="password-reset-form" class="space-y-4" @submit.prevent="onSubmit">
          <div class="form-control">
            <label for="current-password" class="label">
              <span class="label-text">Current Password</span>
            </label>
            <input id="current-password" v-model="vState.current" type="password" class="input input-bordered w-full"
              :disabled="waiting" autocomplete="current-password" />
          </div>

          <div class="form-control">
            <label for="new-password" class="label">
              <span class="label-text">New Password</span>
            </label>
            <input id="new-password" v-model="vState.newPassword" type="password" class="input input-bordered w-full"
              :disabled="waiting" autocomplete="new-password" />
          </div>

          <div class="form-control">
            <label for="confirm-password" class="label">
              <span class="label-text">Confirm Password</span>
            </label>
            <input id="confirm-password" v-model="vState.repeatPassword" type="password"
              class="input input-bordered w-full" :disabled="waiting" autocomplete="new-password" />
          </div>

          <div v-if="totpEnabled" class="form-control">
            <label for="totp-code" class="label">
              <span class="label-text">TOTP Code</span>
            </label>
            <input id="totp-code" v-model="vState.totpCode" type="text" class="input input-bordered w-full"
              :disabled="waiting" autocomplete="one-time-code" />
          </div>
        </form>

        <div class="flex flex-row justify-end my-2">
          <div class="join">
            <button type="submit" form="password-reset-form" class="btn btn-primary join-item" :disabled="waiting">
              <fa-icon v-if="!waiting" icon="check" />
              <fa-icon v-else class="animate-spin" icon="spinner" />
              Update
            </button>
            <button class="btn join-item" :disabled="waiting" @click="resetForm">
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>