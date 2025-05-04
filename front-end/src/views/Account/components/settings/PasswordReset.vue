<script setup lang="ts">
import { isEmpty, toSafeInteger } from 'lodash-es';
import { useVuelidate } from '@vuelidate/core'
import { required, maxLength, minLength, helpers } from '@vuelidate/validators'
import { useAccount, apiCall, useMessage, useWait, useVuelidateWrapper, type VuelidateInstance } from '@vnuge/vnlib.browser'
import { MaybeRef, computed, reactive, ref } from 'vue'
import { set } from '@vueuse/core';
import { useStore } from '../../../../store';

const store = useStore()
const totpEnabled = store.mfa.isEnabled('totp')
const fidoEnabled = store.mfa.isEnabled('fido')

const formSchema = computed(() =>{

  const fields = {
    fields: [
      {
        label: 'Current Password',
        name: 'current',
        type: 'password',
        id: 'current-password'
      },
      {
        label: 'New Password',
        name: 'newPassword',
        type: 'password',
        id: 'new-password'
      },
      {
        label: 'Confirm Password',
        name: 'repeatPassword',
        type: 'password',
        id: 'confirm-password'
      }
    ]
  }

  if(totpEnabled.value){
    //Add totp code field
    fields.fields.push({
      label: 'TOTP Code',
      name: 'totpCode',
      type: 'text',
      id: 'totp-code'
    })
  }

  return fields
})

const { waiting } = useWait()
const { onInput } = useMessage()
const { resetPassword } = useAccount()

const pwResetShow = ref(false)

const vState = reactive({
  newPassword: '',
  repeatPassword: '',
  current: '',
  totpCode:''
})

const rules = computed(() =>{
  return {
    current: {
      required: helpers.withMessage('Current password cannot be empty', required),
      minLength: helpers.withMessage('Current password must be at least 8 characters', minLength(8)),
      maxLength: helpers.withMessage('Current password must have less than 128 characters', maxLength(128))
    },
    newPassword: {
      notOld: helpers.withMessage('New password cannot be the same as your current password', (value : string) => value != vState.current),
      required: helpers.withMessage('New password cannot be empty', required),
      minLength: helpers.withMessage('New password must be at least 8 characters', minLength(8)),
      maxLength: helpers.withMessage('New password must have less than 128 characters', maxLength(128))
    },
    repeatPassword: {
      sameAs: helpers.withMessage('Your new passwords do not match', (value : string) => value == vState.newPassword),
      required: helpers.withMessage('Repeast password cannot be empty', required),
      minLength: helpers.withMessage('Repeast password must be at least 8 characters', minLength(8)),
      maxLength: helpers.withMessage('Repeast password must have less than 128 characters', maxLength(128))
    },
    totpCode:{
      required: helpers.withMessage('TOTP code cannot be empty', (value: string) => totpEnabled.value ? !isEmpty(value) : true),
      minLength: helpers.withMessage('TOTP code must be at least 6 characters', minLength(6)),
      maxLength: helpers.withMessage('TOTP code must have less than 12 characters', maxLength(12))
    }
  }
})

const v$ = useVuelidate(rules, vState, { $lazy: true })
const { validate } = useVuelidateWrapper(v$ as MaybeRef<VuelidateInstance>)

const showForm = () => set(pwResetShow, true)

const onSubmit = async () => {

  // validate
  if (! await validate()) {
    return
  }

  interface IResetPasswordArgs {
    totp_code?: number
  }

  await apiCall(async ({ toaster }) => {
    const args : IResetPasswordArgs = {}

    //Add totp code if enabled
    if(totpEnabled.value){
      args.totp_code = toSafeInteger(v$.value.totpCode.$model)
    }

    //Exec pw reset
    const { getResultOrThrow } = await resetPassword(
        v$.value.current.$model, 
        v$.value.newPassword.$model, 
        args
    )

    //Get result or raise exception to handler
    const result = getResultOrThrow()

    // success
    resetForm()

    // Push a success toast
    toaster.general.success({
      title: 'Success',
      text: result
    })

  })
}

const resetForm = () => {
  v$.value.current.$model = ''
  v$.value.newPassword.$model = ''
  v$.value.repeatPassword.$model = ''
  v$.value.totpCode.$model = ''
  v$.value.$reset()
  pwResetShow.value = false
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
            <button class="btn xs" @click="showForm">
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

        <dynamic-form id="password-reset-form" class="pwreset-form primary" :form="formSchema" :disabled="waiting"
          :validator="v$" @submit="onSubmit" @input="onInput" />

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