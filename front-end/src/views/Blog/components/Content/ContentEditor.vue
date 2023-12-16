<template>
    <div id="content-editor" class="flex flex-col w-full">
        <div class="my-4 ml-auto">
            <div class="button-group">
                <!-- Submit the post form -->
                <button :disabled="waiting || !isChannelSelected" class="btn primary" form="content-upload-form">
                    <fa-icon icon="spinner" v-if="waiting" class="animate-spin" />
                    <span v-else>Save</span>
                </button>
                <button class="btn" @click="onClose">Cancel</button>
            </div>
        </div>
        <div class="mx-auto sm:min-w-[20rem] text-center">
            <h4 >Edit Content</h4>
        </div>
        <div id="content-edit-body" class="min-h-[24rem] my-10">
            <form id="content-upload-form" class="flex" @submit.prevent="onSubmit">
                <fieldset class="mx-auto flex flex-col gap-10 w-[32rem]">
                    <div class="flex flex-col">
                        <div class="p-3 py-0.5">
                            <label class="">File name</label>
                            <input
                                type="text" 
                                class="w-full input primary"
                                placeholder="Title"
                                v-model="v$.name.$model" 
                                :class="{'invalid':v$.name.$invalid && v$.name.$dirty}"
                            />
                            <div v-if="isNewUpload"
                                id="file-drop-zone" 
                                ref="newFileDropZone" 
                                class="py-16 mt-3 transition-all duration-150 ease-linear border-2 border-dashed rounded cursor-pointer dark:border-dark-500"
                                :class="{'border-primary-500 dark:border-primary-500':isOverDropZone}"
                                @click.prevent="open()"
                            >
                                <div class="flex flex-col items-center justify-center">
                                    <fa-icon icon="file-upload" class="text-4xl" />
                                    <p class="mt-2 text-sm text-center">
                                        Drop file here or click to select file
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div v-if="editFile?.id" class="mt-3">
                            <div class="p-3 py-0.5">
                                <label>Content Id</label>
                                <input type="text" class="w-full input primary" :value="editFile.id" readonly />
                            </div>
                        </div>
                         
                        <div v-if="uploadedFile.name" class="border border-gray-300 dark:border-dark-500 p-4 w-[24rem] mx-auto rounded-sm relative mt-5">
                            <div class="absolute top-0 text-right -right-12">
                                <button class="rounded-sm btn sm red" @click.prevent="removeNewFile">
                                    <fa-icon :icon="['fas', 'trash']" />
                                </button>
                            </div>
                            <div class="">
                                Name:
                                <span class="pr-4 truncate border-b border-coolGray-400">
                                    {{ uploadedFile.name }}
                                </span>
                            </div>
                            <div class="mt-3">
                                Size: {{ getFileSize(uploadedFile) }}
                            </div>
                            <div class="mt-3">
                                Content-Type: {{ getContentType(uploadedFile) }}
                            </div>
                        </div>
                        <div v-else-if="editFile?.id" >
                            <div class="border border-gray-300 dark:border-dark-500 p-4 min-w-[24rem] mx-auto rounded-sm relative mt-5">
                                <div class="pr-4 truncate">
                                    Name: {{ editFile.name }}
                                </div>
                                <div class="mt-3">
                                    Size: {{ getSizeinKb(editFile?.length) }}
                                </div>
                                <div class="mt-3">
                                    File Path: {{ editFile.path }}
                                </div>
                                <div class="mt-3">
                                    Content-Type: {{ editFile.content_type }}
                                </div>
                            </div>
                            <div class="m-auto mt-5 w-fit">
                                <button class="btn" @click.prevent="open()">
                                    Overwrite file
                                </button>
                            </div>
                        </div>
                    </div>
                </fieldset>
            </form>
        </div>
        <div v-if="!isNewUpload" class="mt-4">
            <div class="mx-auto w-fit">
                <button class="btn red" @click="onDelete">Delete Forever</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { reactiveComputed, useFileDialog, useDropZone } from '@vueuse/core';
import { ContentMeta } from '@vnuge/cmnext-admin';
import { useConfirm, useVuelidateWrapper, useFormToaster, useWait } from '@vnuge/vnlib.browser';
import { clone, defaultTo, first, isEmpty, round } from 'lodash-es';
import { required, helpers, maxLength } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core';
import { useStore } from '../../../../store';

const emit = defineEmits(['close', 'submit', 'delete']);

const { reveal } = useConfirm();
const { waiting } = useWait();

const { content, channels } = useStore()
const newFileDropZone = ref<HTMLElement>();

const selectedId = computed(() => content.selectedId);
const selectedContent = computed<ContentMeta>(() => defaultTo(content.selected, {} as ContentMeta));
const metaBuffer = reactiveComputed<Required<ContentMeta>>(() => clone(selectedContent.value) as Required<ContentMeta>);
const isChannelSelected = computed(() => channels.selected?.id?.length ?? 0 > 0);
const isNewUpload = computed(() => selectedId.value === 'new');

const validationArgs = {
     name: {
        required,
        maxLen: maxLength(50),
        reg: helpers.withMessage('The file name contains invalid characters', helpers.regex(/^[a-zA-Z0-9 \-\.]*$/))
    },
}

const v$ = useVuelidate(validationArgs, metaBuffer)

const { validate } = useVuelidateWrapper(v$);

const file = ref<File | undefined>();
//set the file name when a file is selected
watch(file, f => v$.value.name.$model = f?.name);

const { open, reset, onChange } = useFileDialog({ accept: '*' })
//update the file buffer when a user selects a file to upload
onChange((f) => onFileUploaded(first(f)))

const { isOverDropZone } = useDropZone(newFileDropZone, {
   onDrop: (files) => onFileUploaded(first(files))
})

const editFile = computed<ContentMeta | undefined>(() => selectedContent.value);
const uploadedFile = computed<File>(() => defaultTo(file.value, {} as File));

const getFileSize = (file : File) => {
    const size = round(file.size > 1024 ? file.size / 1024 : file.size, 2);
    return `${size} ${file.size > 1024 ? 'KB' : 'B'}`;
}
const getContentType = (file : File) => file.type;
const getSizeinKb = (value : number | undefined) => {
    value = defaultTo(value, 0);
    const size = round(value > 1024 ? value / 1024 : value, 2);
    return `${size} ${value > 1024 ? 'KB' : 'B'}`;
}

const onFileUploaded = (f: File | undefined) => file.value = f

const onSubmit = async () => {

    const { error } = useFormToaster()
    const hasFile = !isEmpty(file.value?.name);

    //Validate the form
    if(!await validate()){
        return;
    }

    //Check if in edit mode
    if(selectedId.value === 'new'){
        //New file upload
        if(!hasFile){
            error({ title: 'No file selected' })
            return;
        }
    }
    //Edit mode
    else{
        //If a new file has been attached, then we should prompt for an overwrite
        if(hasFile){
             //Confirm overwrite
            const { isCanceled } = await reveal({
                title: 'Overwrite file?',
                text: 'Are you sure you want to overwrite the file? This action cannot be undone.',
            })
            if (isCanceled) {
                return;
            }
        }
    }
    emit('submit', { item: metaBuffer, file: file.value });
}

const onClose = () => emit('close');

//Emit delete event
const onDelete = () => emit('delete', metaBuffer)

const removeNewFile = () =>{
    file.value = undefined;
    v$.value.name.$model = editFile.value?.name ?? '';
    reset();
}

</script>

<style lang="scss">
#content-upload-form{
    input.primary.invalid{
        @apply border-red-500;
    }
}
</style>