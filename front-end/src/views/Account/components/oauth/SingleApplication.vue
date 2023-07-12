<template>
  <div :id="data.Id">
    <div class="flex flex-row">
      <div class="flex ml-0 mr-auto">
        <div class="flex w-8 h-8 rounded-full bg-primary-500">
          <div class="m-auto text-white dark:text-dark-500">
            <fa-icon icon="key"></fa-icon>
          </div>
        </div>
        <div class="inline my-auto ml-2">
          <h5 class="m-0">{{ name }}</h5>
        </div>
      </div>
      <div v-if="allowEdit && editMode" class="button-group">
        <button class="btn primary xs" :disabled="modified" @click="onSubmit">Update</button>
        <button class="btn xs" @click="onCancel">Cancel</button>
      </div>
      <div v-else class="">
        <button class="btn no-border xs" @click="editMode = true">Edit</button>
      </div>
    </div>
    <div class="px-3 py-1 text-gray-500">
      <div class="my-1">
        <span> Client ID: </span>
        <span class="font-mono text-black dark:text-white">{{ clientId }}</span>
      </div>
      <div class="text-sm">
        <span> Created: </span>
        <span>{{ createdTime }}</span>
      </div>
      <div v-if="!editMode" class="text-sm">
        <span>{{ data.description }}</span>
      </div>
    </div>
    <div v-if="newSecret" class="flex">
      <div class="max-w-md py-4 mx-auto">
        <div class="pl-1 mb-2">
          New secret
        </div>
        <div class="p-4 text-sm break-all border-2 rounded-lg dark:border-dark-400">
            {{ newSecret }}
        </div>
        <div class="flex justify-end my-3">
          <button v-if="!copied" class="rounded btn" @click="copy(newSecret)">
            Copy
          </button>
          <button v-else class="rounded btn" @click="closeNewSecret">
            Done
          </button>
        </div>
      </div>
    </div>
    <div v-else-if="editMode" class="app-form-container">
      <div class="py-4">
        <form :id="formId" class="max-w-md mx-auto">
          <fieldset :disabled="waiting" class="">
            <div class="input-container">
              <div class="pl-1 mb-1">
                App name
              </div>
              <input class="w-full input primary" :class="{ 'invalid': v$.name.$invalid }" v-model="v$.name.$model" type="text" name="name" />
            </div>
            <div class="mt-3 input-container">
              <div class="pl-1 mb-1">
                App description
                <span class="text-sm">(optional)</span>
              </div>
              <textarea class="w-full input primary" :class="{ 'invalid': v$.description.$invalid }" v-model="v$.description.$model" name="description" rows="3" />
            </div>
          </fieldset>
        </form>
      </div>
      <div class="mt-3">
        <div class="flex flex-row justify-center gap-3 mx-auto">
           <div class="">
              <button class="w-full btn yellow" @click="updateSecret">
                Update Secret
              </button>
          </div>
          <div class="">
            <button class="w-full btn red" @click="onDelete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toUpper } from 'lodash'
import { apiCall, useWait,  useConfirm, usePassConfirm } from '@vnuge/vnlib.browser'
import { ref, computed, toRefs } from 'vue'
import { useClipboard, useTimeAgo } from '@vueuse/core'
import { useOAuth2Apps, getAppValidator, AppBuffer, OAuth2Application } from './o2Api'

const props = defineProps<{
  application: AppBuffer<OAuth2Application>
  allowEdit: boolean
}>()

const emit = defineEmits(['secretUpdated', 'AppDeleted'])

const { application, allowEdit } = toRefs(props)
const { data, buffer, revert, modified } = application.value;

const { waiting } = useWait()
const { reveal } = useConfirm()
const { elevatedApiCall } = usePassConfirm()
const { copied, copy } = useClipboard()
const { deleteApp, updateAppMeta, updateAppSecret } = useOAuth2Apps('/oauth/apps');

const { v$, validate, reset } = getAppValidator(buffer)

const editMode = ref(false)
const newSecret = ref<string | null>(null);

const name = computed(() => data.name)
const clientId = computed(() => toUpper(data.client_id))
const createdTime = useTimeAgo(data.Created);
const formId = computed(() => `app-form-${data.client_id}`)

const onCancel = function () {
  revert()
  reset()
  editMode.value = false
}

const onSubmit = async function () {
  // Validate the new app form
  if (!await validate()) {
    return
  }
  // Create the new app
  await apiCall(async ({ toaster }) => {
    // Update does not return anything, if successful
    await updateAppMeta(application.value)
    toaster.general.success({
      text: 'Application successfully updated',
      title: 'Success'
    })
    reset()
    editMode.value = false
  })
}

const updateSecret = async function () {
  // Show a confrimation prompt
  const { isCanceled } = await reveal({
    title: 'Update Secret',
    text: `Are you sure you want to update the secret? Any active sessions will be invalidated, and the old secret will be invalidated.`
  })
  if (isCanceled) {
    return
  }
  await elevatedApiCall(async ({ password }) => {
    // Submit the secret update with the new challenge
    newSecret.value = await updateAppSecret(application.value, password)
  })
}

const onDelete = async function () {
  // Show a confirmation prompt
  const { isCanceled } = await reveal({
    title: 'Delete Application',
    text: 'Are you sure you want to delete this application?',
    subtext: 'This action cannot be undone'
  })
  if (isCanceled) {
    return
  }
  await elevatedApiCall(async ({ password, toaster }) => {
    await deleteApp(application.value, password)
    toaster.general.success({
      text: 'Application deleted successfully',
      title: 'Success'
    })
    emit('AppDeleted')
  })
}

const closeNewSecret = () => newSecret.value = null;

</script>

<style lang="scss">


</style>
