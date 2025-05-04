
<script setup lang="ts">
import { defaultTo } from 'lodash-es'
import { useVuelidate } from '@vuelidate/core'
import { ref, computed, watch, type Ref } from 'vue'
import { Rules, FormSchema } from './profile-schema.ts'
import { apiCall, useMessage, useWait, useVuelidateWrapper, type VuelidateInstance } from '@vnuge/vnlib.browser'
import { useStore } from '../../../../store'

const { waiting } = useWait()
const { onInput, clearMessage } = useMessage()

const store = useStore()
const editMode = ref(false)

// Create validator based on the profile buffer as a data model
const v$ = useVuelidate(Rules, store.userProfile.buffer as any, { $lazy: true })

// Setup the validator wrapper
const { validate } = useVuelidateWrapper(v$ as Ref<VuelidateInstance>);

//const modified = computed(() => profile.value.Modified)
const createdTime = computed(() => defaultTo(store.userProfile.data.created?.toLocaleString(), ''))

const revertProfile = () => {
  //Revert the buffer
  store.userProfile.revert()
  clearMessage()
  editMode.value = false
}

const onSubmit = async () => {
  if (waiting.value) {
    return;
  }
  // Validate the form
  if (!await validate()) {
    return
  }
  // Init the api call
  await apiCall(async ({ toaster }) => {
    const res = await store.userProfile.update();

    const successm = res.getResultOrThrow();

    //No longer in edit mode
    editMode.value = false

    //Show success message
    toaster.general.success({
      title: 'Update successful',
      text: successm,
    })
  })
}

watch(editMode, () => v$.value.$reset())

</script>
<template>
  <div id="account-profile" class="acnt-content-container panel-container">

    <div class="acnt-content profile-container panel-content">

      <div id="profile-control-container" class="flex flex-row" :modified="store.userProfile.modified">
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
            <button form="profile-edit-form" class="btn btn-primary join-item" :disabled="waiting"
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
            <span class="">{{ store.userProfile.data.email }}</span>
          </div>
          <div class="mx-auto my-1 sm:mx-0 sm:my-2">
            <span class="pr-2">Created:</span>
            <span>{{ createdTime }}</span>
          </div>
        </div>

        <dynamic-form 
          id="profile-edit-form" 
          :form="FormSchema" 
          :disabled="!editMode" 
          :validator="v$" 
          @submit="onSubmit"
          @input="onInput" 
        />
      </div>

    </div>
  </div>
</template>
