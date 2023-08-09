<template>
  <div id="account-profile" class="acnt-content-container panel-container">
    <div class="acnt-content profile-container panel-content">

      <div id="profile-control-container" class="flex flex-row" :modified="modified">
        <div class="m-0">
          <div class="flex rounded-full w-14 h-14 bg-primary-500 dark:bg-primary-600">
            <div class="m-auto text-white dark:text-dark-400">
              <fa-icon :icon="['fas', 'user']" size="2xl" />
            </div>
          </div>
        </div>

        <div class="my-auto ml-6">
          <h3 class="m-0">Profile</h3>
        </div>

        <div class="gap-3 ml-auto">
          <div v-if="editMode" class="button-group">
             <button form="profile-edit-form" class="btn primary sm" :disabled="waiting" @click="onSubmit">Submit</button>
             <button class="btn sm" @click="revertProfile">Cancel</button>
          </div>
          <div v-else class="">
            <button class="btn no-border" @click="editMode = true">Edit</button>
          </div>
        </div>
      </div>

      <div>
        
        <p class="profile-text">
          You may set or change your profile information here. All fields are optional,
          but some features may not work without some information.
        </p>

        <div class="locked-info">
          <div class="mx-auto my-1 sm:mx-0 sm:my-2">
            <span class="pr-2">Email:</span>
            <span class="">{{ data.email }}</span>
          </div>
          <div class="mx-auto my-1 sm:mx-0 sm:my-2">
            <span class="pr-2">Created:</span>
            <span>{{ createdTime }}</span>
          </div>
        </div>

        <dynamic-form id="profile-edit-form"
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

<script setup lang="ts">
import { defaultTo } from 'lodash-es'
import useVuelidate  from '@vuelidate/core'
import { ref, computed, watch } from 'vue'
import { Rules, FormSchema } from './profile-schema.ts'
import { apiCall, useMessage, useWait, useDataBuffer, useUser, useVuelidateWrapper } from '@vnuge/vnlib.browser'
import { IUserProfile } from '@vnuge/vnlib.browser/dist/user'

const ACCOUNT_URL = '/account/profile'

interface UserProfile extends IUserProfile{
  created : string | Date
}

const { waiting } = useWait()
const { getProfile } = useUser()
const { onInput, clearMessage } = useMessage()
const { data, buffer, apply, revert, modified } = useDataBuffer<UserProfile>({} as UserProfile)

const editMode = ref(false)

// Create validator based on the profile buffer as a data model
const v$ = useVuelidate(Rules, buffer, { $lazy:true, $autoDirty:false })

// Setup the validator wrapper
const { validate } = useVuelidateWrapper(v$);

//const modified = computed(() => profile.value.Modified)
const createdTime = computed(() => defaultTo(data.created?.toLocaleString(), ''))

const loadProfileData = async () => {
  await apiCall(async () => {
    // Get the user's profile
    const profile = await getProfile<UserProfile>()
    profile.created = new Date(profile.created)
    //Apply the profile to the buffer
    apply(profile)
  })
}

const revertProfile = () => {
  //Revert the buffer
  revert()
  clearMessage()
  editMode.value = false
}

const onSubmit = async () => {
  if(waiting.value){
    return;
  }
  // Validate the form
  if (!await validate()) {
    return
  }
  // Init the api call
  await apiCall(async ({ axios, toaster }) => {
    // Apply the buffer to the profile
    const response = await axios.post(ACCOUNT_URL, buffer)

    if(!response.data.success){
      throw { response }
    }

    //No longer in edit mode
    editMode.value = false

    //Show success message
    toaster.general.success({
      title: 'Update successful',
      text: response.data.result,
    })

    //reload the profile data
    loadProfileData()
  })
}

watch(editMode, () => v$.value.$reset())

//Inital profile data load, dont await
loadProfileData()

</script>

<style lang="scss">

#account-profile {

  p.profile-text{
    @apply p-2 md:py-3 md:my-1 text-sm;
  }
  
  .locked-info{
    @apply w-full flex flex-col sm:flex-row sm:justify-evenly pt-3 sm:pb-1;
  }

  #profile-edit-form .input-group {
    @apply pt-4;

    .input-container{
      @apply p-2 rounded-md flex sm:flex-row flex-col sm:gap-4;

      &.dirty.data-invalid.dynamic-form .dynamic-input{
        @apply border-red-600;
      }

      &.dirty.data-invalid.dynamic-form label.dynamic-form{
        @apply text-red-500;
      }

      &.dirty.dynamic-form label.dynamic-form{
        @apply text-primary-500;
      }

      select:disabled{
        @apply appearance-none;
      }
    }

    .input-container:nth-child(odd) {
      @apply bg-slate-50 dark:bg-dark-700;
    }

    .dynamic-form.dynamic-input{
      @apply py-2 w-full bg-transparent border-x-0 border-t-0 border-b border-gray-300 dark:border-dark-300 pl-2;
      @apply focus:bg-gray-200 focus:dark:bg-transparent;

      &:disabled{
        @apply py-1 border-transparent; 
      }
    }

    label.dynamic-form{
      flex-basis: 15%;
      @apply sm:text-right my-auto;
    }
  }
}
</style>
