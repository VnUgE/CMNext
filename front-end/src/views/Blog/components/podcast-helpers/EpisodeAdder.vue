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
                        <DialogTitle>Set feed enclosure</DialogTitle>
                        <DialogDescription>
                            You may set a podcast episode or other rss enclosure from 
                            content stored in the cms.
                        </DialogDescription>
                        <div class="my-3 ml-auto w-fit">
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
                                        <ContentSearch :blog="$props.blog" @selected="onContentSelected"/>
                                    </div>
                                </PopoverPanel>
                            </Popover>
                        </div>
                        <dynamic-form
                            class=""
                            id="enclosure-form"
                            :form="schema"
                            :validator="v$"
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

import { ref, reactive } from 'vue';
import { BlogState } from '../../blog-api';
import { PodcastEntity, getPodcastForm } from './podcast-form'
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    DialogDescription,
    PopoverButton,
    PopoverPanel,
    Popover,
} from '@headlessui/vue'
import ContentSearch from '../ContentSearch.vue'
import { apiCall, debugLog } from '@vnuge/vnlib.browser';
import { ContentMeta } from '@vnuge/cmnext-admin';

const emit = defineEmits(['submit'])

const props = defineProps<{
    blog: BlogState,
}>()

const isOpen = ref(false)
const { getPublicUrl } = props.blog.content;
const { schema, setEnclosureContent, getValidator, exportProperties } = getPodcastForm()

const buffer = reactive<PodcastEntity>({} as PodcastEntity)

const { v$, validate } = getValidator(buffer)

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

const onCancel = () =>{
    setIsOpen(false)
}

const onContentSelected = (content: ContentMeta) =>{
    apiCall(async () =>{
        //Get the content link from the server
        const url = await getPublicUrl(content)

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
            @apply bg-gray-100 dark:bg-transparent dark:border-transparent;
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