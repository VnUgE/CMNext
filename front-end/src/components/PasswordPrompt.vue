<script setup lang="ts">
import { reactive, computed, ref } from 'vue';
import { passConfirm as dialog, type ConfirmMessage } from '../lib/confirm';
import { useFormValidation } from '../lib/forms';
import { toaster } from '../main';
import * as yup from 'yup';

const { validate } = useFormValidation({ toaster });

// Yup validation schema
const passwordSchema = yup.object({
  password: yup
    .string()
    .required('Please enter your password')
    .max(100, 'Password must be less than 100 characters'),
});

const pwState = reactive({ password: '' });
const message = ref<ConfirmMessage>({ title: '', message: '' });
const revealed = computed(() => dialog.isRevealed.value);

// Compute title and description from message
const title = computed(() => message.value?.title || 'Enter your password');
const description = computed(
  () => message.value?.message || 'To confirm your identity, please enter your password.'
);

const formSubmitted = async () => {
  // Validate the password
  if (!(await validate(pwState, passwordSchema))) {
    return;
  }

  // Store password copy
  const password = pwState.password;

  // Clear the password form
  pwState.password = '';

  // Pass the password to the confirm function
  dialog.confirm({ password });
};

const close = () => {
  // Clear the password form
  pwState.password = '';

  // Close prompt using base cancel
  dialog.cancel();
};

// When revealed, set the message
dialog.onReveal((m) => (message.value = m || { title: '', message: '' }));
</script>

<template>
  <div id="password-prompt" class="z-40">
    <Dialog :open="revealed" @close="close()">
      <template #title>
        {{ title }}
      </template>

      <template #description>
        <div class="w-full text-center">
          <p class="my-1 text-sm">
            {{ description }}
          </p>

          <form id="password-form" class="my-2 w-full" @submit.prevent="formSubmitted()">
            <fieldset>
              <div class="input-container">
                <label class="label" for="password-prompt-input">
                  <span class="label-text">Password</span>
                </label>
                <input
                  id="password-prompt-input"
                  v-model="pwState.password"
                  type="password"
                  class="input input-primary w-full"
                  placeholder="Password"
                  autocomplete="current-password"
                  autofocus
                />
                <div class="join mt-4 w-fit float-right">
                  <button class="btn btn-primary join-item" form="password-form">Submit</button>
                  <button type="button" class="btn join-item" @click.prevent="close()">
                    Close
                  </button>
                </div>
              </div>
            </fieldset>
          </form>
        </div>
      </template>
    </Dialog>
  </div>
</template>
