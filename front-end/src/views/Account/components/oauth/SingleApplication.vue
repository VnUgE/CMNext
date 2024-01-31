<script setup lang="ts">
import { toUpper } from 'lodash-es'
import { apiCall, useWait, useConfirm, usePassConfirm, useDataBuffer } from '@vnuge/vnlib.browser'
import { ref, computed, toRefs, watch } from 'vue'
import { get, set, useClipboard, useTimeAgo, useToggle } from '@vueuse/core'
import { getAppValidator } from './o2AppValidation'
import { OAuth2Application } from '../../../../store/oauthAppsPlugin'
import { useStore } from '../../../../store'

const props = defineProps<{
  application: OAuth2Application
  allowEdit: boolean
}>()

const store = useStore()
const { application, allowEdit } = toRefs(props)

//Init data buffer around application
const { data, revert, modified, buffer, update, apply } = useDataBuffer(get(application),
  async (adb) => {
    await store.oauth2.updateAppMeta(adb.buffer);
    store.oauth2.refresh();
  })

//Watch for store app changes and apply them to the buffer
watch(application, apply)

const { waiting } = useWait()
const { reveal } = useConfirm()
const { elevatedApiCall } = usePassConfirm()
const { copied, copy } = useClipboard()

const { v$, validate, reset } = getAppValidator(buffer)

const [showEdit, toggleEdit] = useToggle()
const newSecret = ref<string | null>(null);

const name = computed(() => data.name)
const clientId = computed(() => toUpper(data.client_id))
const createdTime = useTimeAgo(data.Created);
const formId = computed(() => `app-form-${data.client_id}`)

const onCancel = function () {
  revert()
  reset()
  toggleEdit(false)
}

const onSubmit = async function () {
  // Validate the new app form
  if (!await validate()) {
    return
  }
  // Create the new app
  await apiCall(async ({ toaster }) => {
    // Update does not return anything, if successful
    await update()

    toaster.general.success({
      text: 'Application successfully updated',
      title: 'Success'
    })
    reset()
    toggleEdit(false)
  })
}

const updateSecret = async function () {
  // Show a confrimation prompt
  const { isCanceled } = await reveal({
    title: 'Update Secret?',
    text: `Are you sure you want to update the secret? Any active sessions will be invalidated, and the old secret will be invalidated.`
  })
  if (isCanceled) {
    return
  }
  await elevatedApiCall(async ({ password }) => {
    // Submit the secret update with the new challenge
    newSecret.value = await store.oauth2.updateAppSecret(data, password)
    store.oauth2.refresh()
  })
}

const onDelete = async function () {
  // Show a confirmation prompt
  const { isCanceled } = await reveal({
    title: 'Delete?',
    text: 'You are about to permanently delete this application. This will invalidate any active sessions.',
    subtext: ''
  })
  if (isCanceled) {
    return
  }
  await elevatedApiCall(async ({ password, toaster }) => {
    await store.oauth2.deleteApp(data, password)
    toaster.general.success({
      text: 'Application deleted successfully',
      title: 'Success'
    })
    store.oauth2.refresh()
  })
}

const closeNewSecret = () => set(newSecret, null);

</script>

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
      <div v-if="allowEdit && showEdit" class="button-group">
        <button class="btn primary xs" :disabled="!modified" @click="onSubmit">Update</button>
        <button class="btn xs" @click="onCancel">Cancel</button>
      </div>
      <div v-else class="">
        <button class="btn no-border xs" @click="toggleEdit(true)">Edit</button>
      </div>
    </div>
    <div class="px-3 py-1 text-color-background">
      <div class="my-1">
        <span> Client ID: </span>
        <span class="font-mono text-color-foreground">{{ clientId }}</span>
      </div>
      <div class="text-sm">
        <span> Created: </span>
        <span>{{ createdTime }}</span>
      </div>
      <div v-if="!showEdit" class="text-sm">
        <span>{{ data.description }}</span>
      </div>
    </div>
    <div v-if="newSecret" class="flex">
      <div class="py-4 mx-auto">
        <div class="pl-1 mb-2">
          New secret
        </div>
        <div class="p-4 text-sm break-all border-2 rounded dark:border-dark-500 dark:bg-dark-700">
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
    <div v-else-if="showEdit" class="app-form-container">
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
        
        <div class="mx-auto w-fit">
          <div class="button-group">
            <button class="btn xs" @click.prevent="updateSecret">
              <fa-icon icon="sync" />
              <span class="pl-2">New Secret</span>
            </button>
            <button class="btn red xs" @click.prevent="onDelete">
              <fa-icon icon="minus-circle" />
              <span class="pl-2">Delete</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
