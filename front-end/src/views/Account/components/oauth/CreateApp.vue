<template>
    <Dialog :open="isOpen" @close="close" class="relative z-10">
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div class="fixed inset-0 flex justify-center top-20">
            <DialogPanel class="new-o2-app-dialog">
                <DialogTitle>Create app</DialogTitle>
                <div class="flex">
                    <div class="m-auto mb-3 text-sm">
                        <p class="my-1">
                            Step 1: Enter a name for your app.
                        </p>
                        <p class="my-1">
                            Step 2: Submit the form.
                        </p>
                        <p class="my-1 text-red-500">
                            Step 3: Save your Client ID and Secret somewhere safe.
                        </p>
                    </div>
                </div>
                <!-- If secret is set, show the scret window -->
                <div v-if="newAppBuffer.secret" class="mt-2">
                    <div class="block mx-1 sm:inline">
                        Secret:
                    </div>
                    <div class="px-1 py-4 my-2 break-all border-2 border-gray-300 rounded-lg">
                        <div class="text-center secret">
                            <span class="block mx-1 sm:inline">
                            {{ newAppBuffer.secret }}
                            </span>
                        </div>
                    </div>
                    <div class="text-sm">
                        <p class="p-2">
                            This secret will only be displayed <strong>once</strong>, and you cannot request it again.
                            If you lose it, you will need to update the secret from the app edit pane.
                        </p>
                        <p class="p-2">
                            Please remember to keep this secret somewhere safe. If an attacker gains
                            access to it, they will be able to access any APIs on your behalf!
                        </p>
                    </div>
                    <div class="flex justify-end">
                    <button v-if="!copied" class="btn primary" @click="copy(newAppBuffer.secret)">
                        Copy
                    </button>
                    <button v-else class="btn primary" @click="close">
                        Done
                    </button>
                    </div>
                </div>
                <div v-else>
                    <form id="o2-app-creation" class="" @submit.prevent="onFormSubmit">
                        <fieldset class="flex flex-col gap-4">
                            <div class="input-container">
                                <label>App Name</label>
                                <input 
                                    class="w-full mt-1 input primary"
                                    :class="{'invalid':v$.name.$invalid, 'dirty': v$.name.$dirty}"
                                    name="name"
                                    type="text"
                                    v-model="v$.name.$model"
                                />
                            </div>
                            <div class="input-container">
                                <label>Description</label>
                                <textarea 
                                    class="w-full mt-1 input primary" 
                                    :class="{ 'invalid': v$.description.$invalid, 'dirty': v$.name.$dirty }" 
                                    name="description" 
                                    v-model="v$.description.$model" 
                                    rows="3" 
                                />
                            </div>
                            <div class="input-container">
                                <label>Permissions</label>
                                <div class="flex flex-col flex-wrap sm:flex-row">
                                    <div v-for="permission in appPermissions" :key="permission.type" class="my-2 sm:m-3">
                                        <label class="flex cursor-pointer">
                                            <input class="w-5 cursor-pointer" type="checkbox" :name="permission.type" @change="permissionChanged">
                                            <span class="pl-1">{{ permission.label }}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                        <div class="flex justify-end mt-4">
                            <div class="button-group">
                                <button type="submit" form="o2-app-creation" class="btn primary">Submit</button>
                                <button class="btn" @click.prevent="close">Cancel</button>
                            </div>
                        </div>
                    </form>
                </div>
            </DialogPanel>
        </div>
    </Dialog>
</template>

<script setup lang="ts">
import { indexOf, pull } from 'lodash-es'
import { ref, toRefs } from 'vue';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { apiCall } from '@vnuge/vnlib.browser'
import { useOAuth2Apps, getAppValidator, getAppPermissions } from './o2Api'
import { useClipboard } from '@vueuse/core'

const emit = defineEmits(['close'])

const props = defineProps<{
    isOpen: boolean
}>()

const { isOpen } = toRefs(props);

const { copied, copy } = useClipboard();
//Init the oauth2 app api
const { createApp } = useOAuth2Apps('/oauth/apps');
const appPermissions = getAppPermissions();

const newAppBuffer = ref({});
const newAppPermissions = ref([]);

const { v$, validate, reset } = getAppValidator(newAppBuffer);

const close = () => {
    newAppBuffer.value = {}
    reset()
    emit('close')
}

const onFormSubmit = async () =>{

    // Validate the new app form
    if (!await validate()) {
        return
    }

    // Create the new app
    await apiCall(async () => {

        const { secret } = await createApp(newAppBuffer.value)

        // Reset the new app buffer and pass the secret value
        newAppBuffer.value = { secret }
    })

    // reset the validator
    v$.value.$reset()
}

const permissionChanged = (e : any) => {
    if (e.target.checked) {
        // Make sure the permission is not already in the list
        if (indexOf(newAppPermissions.value, e.target.name) > -1) {
            return
        }
        // Add the permission to the list
        newAppPermissions.value.push(e.target.name)
    } else {
        // Remove the permission from the list
        pull(newAppPermissions.value, e.target.name)
    }
    // Update the permissions model
    v$.value.permissions.$model = newAppPermissions.value.join(',')
}

</script>

<style lang="scss">

.new-o2-app-dialog{
    @apply w-full max-w-lg p-8 pt-4 m-auto mt-0 shadow-md sm:rounded-md;
    @apply bg-white dark:bg-dark-600 dark:text-gray-200;

    #o2-app-creation{
        input.dirty.invalid,
        textarea.dirty.invalid{
            @apply border-red-500 focus:border-red-500;
        }
    }
}

</style>