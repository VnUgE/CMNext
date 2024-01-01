<template>
    <div id="podcast-upload-form">

        <div class="ml-auto w-fit">
            <div class="">
                <button class="btn sm" @click="setIsOpen(true)">Add enclosure</button>
            </div>
        </div>

        <Dialog id="enclosure-dialog" :open="isOpen" @close="setIsOpen" class="relative z-50">
            <div class="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div class="fixed inset-0 flex justify-center pt-[8rem]">
                <DialogPanel class="dialog">
                    <div class="">
                        <DialogTitle class="text-2xl font-bold">Add Media Enclosure</DialogTitle>
                        <DialogDescription class="text-xs">
                            You may set a podcast episode or other rss enclosure from 
                            content stored in the cms.
                        </DialogDescription>
                        <div class="flex flex-row gap-3 my-3 ml-auto w-fit">
                            <div class="flex flex-row gap-2 my-auto">
                                <div class="text-sm">
                                    Explicit
                                </div>
                                <div class="">
                                    <Switch v-model="isExplicit"
                                        :class="isExplicit ? 'bg-red-500' : 'bg-gray-300 dark:bg-dark-500'"
                                        class="relative inline-flex items-center w-10 h-5 my-auto duration-75 rounded-full">
                                        <span class="sr-only">Podcast Mode</span>
                                        <span :class="isExplicit ? 'translate-x-6' : 'translate-x-1'"
                                            class="inline-block w-3 h-3 transition transform bg-white rounded-full" />
                                    </Switch>
                                </div>
                            </div>
                            <Popover class="relative">
                                <PopoverButton class="btn">
                                    Add media
                                    <fa-icon class="ml-2" icon="photo-film" />
                                </PopoverButton>
                                <PopoverPanel class="absolute right-0 z-10 top-10">
                                    <div class="md-pannel">
                                        <div class="">
                                            Search for content by its id or file name.
                                        </div>
                                        <ContentSearch @selected="onContentSelected"/>
                                    </div>
                                </PopoverPanel>
                            </Popover>
                        </div>
                        <dynamic-form
                            class=""
                            id="enclosure-form"
                            :form="schema"
                            :validator="v$"
                            :disabled="false"
                            @submit="onFormSubmit"
                            @cancel="onCancel"
                        />
                        <div class="mt-4 ml-auto w-fit">
                            <div class="button-group">
                                <button class="btn sm primary" @click="onFormSubmit">Submit</button>
                                <button class="btn sm" @click="onCancel">Cancel</button>
                            </div>
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    </div>
</template>
<script setup lang="ts">

import { ref, reactive, computed, defineAsyncComponent } from 'vue';
import { PodcastEntity, getPodcastForm } from './podcast-form'
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    DialogDescription,
    PopoverButton,
    PopoverPanel,
    Popover,
    Switch
} from '@headlessui/vue'
import { apiCall, debugLog } from '@vnuge/vnlib.browser';
import { ContentMeta } from '@vnuge/cmnext-admin';
import { useStore } from '../../../../store';
const ContentSearch = defineAsyncComponent(() => import('../ContentSearch.vue'));

const emit = defineEmits(['submit'])
const store = useStore()

const isOpen = ref(false)
const { schema, setEnclosureContent, getValidator, exportProperties } = getPodcastForm()

const buffer = reactive<PodcastEntity>({} as PodcastEntity)

const { v$, validate } = getValidator(buffer)

const isExplicit = computed({
    get : () => buffer.explicit,
    set : (v: boolean) => buffer.explicit = v
});

const setIsOpen = (value: boolean) => isOpen.value = value

const onFormSubmit = async () =>{
    //Validate the form
    if(! await validate()){
        return
    }

    //get the enclosure properties to add to the xml
    const props = exportProperties(buffer)
    debugLog(props);
    emit('submit', props)
    setIsOpen(false)
}

const onCancel = () => setIsOpen(false)

const onContentSelected = (content: ContentMeta) =>{
    apiCall(async () =>{
        //Get the content link from the server
        const url = await store.content.getPublicUrl(content)
        
        //set the form content
        setEnclosureContent(buffer, content, `/${url}`)
    })
}

</script>

<style lang="scss">

#enclosure-dialog{

    .dialog{
        @apply w-full max-w-3xl px-8 pb-8 pt-4 mx-auto mb-auto border rounded shadow-md;
        @apply bg-white dark:bg-dark-700 dark:text-gray-300 dark:border-dark-500;
    }
    
    .dynamic-form.input-group{
        @apply grid grid-cols-2 gap-4;
    }

    .dynamic-form.input-container{
        @apply flex flex-col;
    }

    .dynamic-form.field-description{
        @apply text-sm text-gray-500 dark:text-gray-400 px-2;
    }

    .dynamic-form.input-label{
        @apply text-sm font-semibold text-gray-700 dark:text-gray-100 ml-1 mb-1;
    }

    .dynamic-form.dynamic-input.input{
        @apply py-1.5 bg-transparent;

        &:disabled{
            @apply bg-gray-100 py-0.5 bg-transparent disabled:text-sm disabled:border-0 dark:text-gray-400 text-black;
        }

        &:focus{
            @apply border-primary-500;
        }
    }

    .dirty.dynamic-form.input-container{
        &.data-invalid .dynamic-form.dynamic-input.input{
            @apply border-red-500;
        }
    }
}

</style>