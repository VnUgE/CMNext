<script setup lang="ts">
import { defaultTo } from 'lodash-es'
import { ref, computed } from 'vue'
import { useApiCall } from '@vnuge/vnlib.browser/vue'
import { toaster } from '../../../../main'
import { useStore } from '../../../../store'
import { useFormValidation } from '../../../../lib/forms'
import * as yup from 'yup'
import { UserProfile } from '@vnuge/vnlib.browser'

interface Profile extends UserProfile {
  first: string
  last: string
}

const store = useStore()
const editMode = ref(false)

// Create API call handler with toaster
const apiCall = useApiCall({ toaster })
const { validate } = useFormValidation({ toaster })

// Yup validation schema matching profile-schema rules
const profileSchema = yup.object({
  first: yup
    .string()
    .matches(/^[a-zA-Z]*$/, 'First name must contain only letters')
    .max(50, 'First name must be less than 50 characters'),
  last: yup
    .string()
    .matches(/^[a-zA-Z]*$/, 'Last name must contain only letters')
    .max(50, 'Last name must be less than 50 characters'),
})

const createdTime = computed(() => defaultTo(store.user.profile.created?.toLocaleString(), ''))

// Type assertion to access profile fields (buffer has all fields at runtime)
const profileBuffer = store.user.edit.buffer as Profile

const revertProfile = () => {
  //Revert the buffer
  store.user.edit.revert()
  toaster.close();
  editMode.value = false
}

const onSubmit = async () => {
  if (apiCall.waiting.value) {
    return
  }

  // Validate the form (buffer has all fields at runtime even though type only shows email)
  if (!await validate(store.user.edit.buffer, profileSchema as any)) {
    return
  }

  // Make the API call
  await apiCall(async () => {
    await store.user.edit.save()

    //No longer in edit mode
    editMode.value = false

    //Show success message
    toaster.success('Your profile has been updated successfully.')
  })
}

</script>
<template>
  <div id="account-profile" class="acnt-content-container panel-container">

    <div class="acnt-content profile-container panel-content">

      <div id="profile-control-container" class="flex flex-row" :modified="store.user.edit.modified">
        <div class="m-0">
          <div class="flex rounded-full w-14 h-14 bg-primary">
            <div class="m-auto text-base-200">
              <fa-icon :icon="['fas', 'user']" size="2xl" />
            </div>
          </div>
        </div>

        <div class="my-auto ml-6">
          <h3 class="m-0">Profile</h3>
        </div>

        <div class="gap-3 ml-auto">
          <div v-if="editMode" class="join">
            <button form="profile-edit-form" class="btn btn-primary join-item" :disabled="apiCall.waiting.value"
              @click="onSubmit">Submit</button>
            <button class="btn join-item" @click="revertProfile">Cancel</button>
          </div>
          <div v-else class="tooltip max-sm:tooltip-left tooltip-bottom" data-tip="Edit your profile">
            <button class="btn" @click="editMode = true">Edit</button>
          </div>
        </div>
      </div>

      <div>

        <p class="profile-text text-bg">
          You may set or change your profile information here. All fields are optional,
          but some features may not work without some information.
        </p>

        <div class="locked-info">
          <div class="mx-auto my-1 sm:mx-0 sm:my-2">
            <span class="pr-2">Email:</span>
            <span class="">{{ store.user.profile.email }}</span>
          </div>
          <div class="mx-auto my-1 sm:mx-0 sm:my-2">
            <span class="pr-2">Created:</span>
            <span>{{ createdTime }}</span>
          </div>
        </div>

        <form id="profile-edit-form" @submit.prevent="onSubmit">
          <fieldset :disabled="!editMode">
            <div class="form-control">
              <label for="first-name" class="label">
                <span class="label-text">First</span>
              </label>
              <input id="first-name" v-model="profileBuffer.first" type="text" class="input input-bordered w-full"
                placeholder="First" />
            </div>

            <div class="form-control">
              <label for="last-name" class="label">
                <span class="label-text">Last</span>
              </label>
              <input id="last-name" v-model="profileBuffer.last" type="text" class="input input-bordered w-full"
                placeholder="Last" />
            </div>
          </fieldset>
        </form>
      </div>

    </div>
  </div>
</template>
