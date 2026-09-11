<script setup lang="ts">
import { assign, defaultTo, defer } from 'lodash-es';
import { computed, reactive, watch } from 'vue';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { toaster } from '../../../main';
import { useStore } from '../../../store';
import { useFormValidation } from '../../../lib/forms';
import * as yup from 'yup';
import { UserProfile } from '@vnuge/vnlib.browser';
import { useToggle } from '@vueuse/core';
import SettingsCard from './SettingsCard.vue';

interface Profile extends UserProfile {
  first: string;
  last: string;
}

const store = useStore();
const [editMode, toggleEditMode] = useToggle(false);
const profileBuffer = reactive<Profile>({} as Profile);

const apiCall = useApiCall({ toaster });
const { validate } = useFormValidation({ toaster });

const profileSchema = yup.object({
  first: yup
    .string()
    .matches(/^[a-zA-Z]*$/, 'First name must contain only letters')
    .max(50, 'First name must be less than 50 characters'),
  last: yup
    .string()
    .matches(/^[a-zA-Z]*$/, 'Last name must contain only letters')
    .max(50, 'Last name must be less than 50 characters'),
});

const createdTime = computed(() => defaultTo(store.user.profile.created?.toLocaleString(), ''));

const revertProfile = () => {
  assign(profileBuffer, store.user.profile);
  toaster.close();
  toggleEditMode(false);
};

const onSubmit = async () => {
  if (apiCall.waiting.value) {
    return;
  }

  if (!(await validate(profileBuffer, profileSchema))) {
    return;
  }

  await apiCall(async () => {
    await store.user.update(profileBuffer);

    toggleEditMode(false);

    toaster.success('Your profile has been updated successfully.');
  });
};

// Whenever the source profile changes, update the buffer
watch(store.user.profile, (p) => assign(profileBuffer, p), { immediate: true });

// Begin loading the profile
defer(store.user.refresh);
</script>

<template>
  <div class="space-y-4">
    <!-- User Info Card -->
    <SettingsCard
      title="Profile Information"
      description="Your account details and profile settings"
    >
      <template #actions>
        <div v-if="editMode" class="join">
          <button
            class="btn btn-primary btn-sm join-item"
            :disabled="apiCall.waiting.value"
            @click="onSubmit"
          >
            <span v-if="apiCall.waiting.value" class="loading loading-spinner loading-sm" />
            <fa-icon v-else icon="check" />
            Save
          </button>
          <button class="btn btn-sm join-item" @click="revertProfile">Cancel</button>
        </div>
        <button v-else class="btn btn-sm btn-ghost" @click="toggleEditMode(true)">
          <fa-icon icon="edit" class="text-sm" />
          Edit
        </button>
      </template>

      <!-- Avatar and basic info -->
      <div class="flex items-start gap-4 mb-4">
        <div class="avatar placeholder">
          <div class="bg-primary text-primary-content w-16 rounded-full">
            <fa-icon icon="user" class="text-2xl" />
          </div>
        </div>
        <div class="flex-1">
          <div class="text-sm text-base-content/70">Email</div>
          <div class="font-medium">{{ store.user.profile.email }}</div>
          <div class="text-sm text-base-content/70 mt-2">Member since</div>
          <div class="text-sm">{{ createdTime }}</div>
        </div>
      </div>

      <div class="divider my-2" />

      <!-- Editable fields -->
      <form class="space-y-3" @submit.prevent="onSubmit">
        <fieldset :disabled="!editMode" class="space-y-3">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text text-sm">First Name</span>
            </label>
            <input
              v-model="profileBuffer.first"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="First name"
              :class="{ 'input-ghost': !editMode }"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text text-sm">Last Name</span>
            </label>
            <input
              v-model="profileBuffer.last"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="Last name"
              :class="{ 'input-ghost': !editMode }"
            />
          </div>
        </fieldset>
      </form>
    </SettingsCard>
  </div>
</template>
