<script setup lang="ts">
import { indexOf, pull } from 'lodash-es'
import { Ref, ref, toRefs } from 'vue';
import { set, useClipboard } from '@vueuse/core'
import { apiCall } from '@vnuge/vnlib.browser'
import { getAppValidator } from './o2AppValidation'
import { useStore } from '../../../../store';
import { OAuth2Application } from '../../../../store/oauthAppsPlugin';

const emit = defineEmits(['close'])
const props = defineProps<{
    isOpen: boolean
}>()

const { isOpen } = toRefs(props);

//Init the oauth2 app api
const store = useStore()
const { createApp } = store.oauth2!
const { copied, copy } = useClipboard();

const newAppBuffer = ref<Partial<OAuth2Application & { secret: string }>>({});
const newAppPermissions = ref<string[]>([]);

const { v$, validate, reset } = getAppValidator(newAppBuffer as Ref<OAuth2Application>);

const close = () => {
    set(newAppBuffer, {});
    reset()
    emit('close')
}

const onFormSubmit = async () => {
    
    // Validate the new app form
    if (!await validate()) {
        return
    }

    // Create the new app
    await apiCall(async () => {

        const { secret } = await createApp(newAppBuffer.value as OAuth2Application)

        // Reset the new app buffer and pass the secret value
        set(newAppBuffer, { secret })
    })

    // reset the validator
    reset()
}

const permissionChanged = (e: any) => {
    if (e.target.checked) {
        // Make sure the permission is not already in the list
        if (indexOf(newAppPermissions.value, e.target.name) > -1) {
            return
        }
        // Add the permission to the list
        newAppPermissions.value.push(e.target.name as string)
    } else {
        // Remove the permission from the list
        pull(newAppPermissions.value, e.target.name)
    }
    // Update the permissions model
    v$.value.permissions.$model = newAppPermissions.value.join(',')
}

</script>
<template>
    <Dialog :open="isOpen" @close="close" id="create-oauth-app">

        <template v-slot:title>
            Create app
        </template>

        <template v-slot:description>
            <div class="w-screen max-w-lg">
                <!-- If secret is set, show the scret window -->
                <div v-if="newAppBuffer?.secret" class="mt-2">
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
                        <button v-if="!copied" class="btn btn-primary" @click="copy(newAppBuffer.secret)">
                            Copy
                        </button>
                        <button v-else class="btn btn-primary" @click="close">
                            Done
                        </button>
                    </div>
                </div>
                <div v-else>
                    <form id="o2-app-creation" class="" @submit.prevent="onFormSubmit">
                        <fieldset class="flex flex-col gap-2">
                            <div class="input-container">
                                <label>App Name</label>
                                <input class="grow mt-1 input input-bordered"
                                    :class="{ 'data-invalid': v$.name.$invalid, 'dirty': v$.name.$dirty }" name="name"
                                    type="text" v-model="v$.name.$model" />

                                <p v-if="v$.name.$errors.length > 0 && v$.name.$model?.length > 0"
                                    class="mt-1 ml-1 text-xs text-red-500">
                                    {{ v$.name.$errors[0].$message }}
                                </p>
                            </div>
                            <div class="input-container">
                                <label>Description</label>
                                <textarea class="w-full mt-1 input input-bordered min-h-32"
                                    :class="{ 'data-invalid': v$.description.$invalid, 'dirty': v$.description.$dirty }"
                                    name="description" v-model="v$.description.$model" rows="3" />

                                <p v-if="v$.description.$errors.length > 0 && v$.description.$model?.length > 0"
                                    class="mt-1 ml-1 text-xs text-red-500">
                                    {{ v$.description.$errors[0].$message }}
                                </p>
                            </div>
                            
                            <label>Permissions</label>
                            <div class="flex">
                                <ul class="flex flex-wrap gap-3 mr-auto text-sm">
                                    <li v-for="scope in store.oauth2!.scopes" :key="scope" class="my-1.5 mx-auto">
                                        <label class="flex cursor-pointer">
                                            <input class="cursor-pointer checkbox checkbox-primary" type="checkbox"
                                                :name="`02scope-${scope}`" @change="permissionChanged">
                                            <span class="my-auto ml-1.5">{{ scope }}</span>
                                        </label>
                                    </li>
                                </ul>
                            </div>
                        </fieldset>
                        <div class="flex justify-end mt-4">
                            <div class="join">
                                <button type="submit" form="o2-app-creation" class="btn btn-primary join-item">Submit</button>
                                <button class="btn join-item" @click.prevent="close">Cancel</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </template>

    </Dialog>
</template>