<template>
    <div id="content-editor" class="">
        <EditorTable title="Manage content" :show-edit="showEdit" :pagination="pagination" @open-new="openNew">
            <template #table>
                <ContentTable 
                    :content="items"
                    @open-edit="openEdit"
                    @copy-link="copyLink"
                    @delete="onDelete"
                />
            </template>
            <template #editor>
                 <div v-if="showProgress" class="max-w-xl mx-auto">
                    <span id="ProgressLabel" class="sr-only">Loading</span>

                    <span 
                        role="progressbar"
                        aria-labelledby="ProgressLabel"
                        :aria-valuenow="progress"
                        class="relative block bg-gray-200 rounded-full dark:bg-dark-500"
                    >
                        <span class="absolute inset-0 flex items-center justify-center text-[10px]/4">
                            <span class="font-bold text-white "> {{ loadingProgress }} </span>
                        </span>

                        <span class="block h-4 text-center rounded-full bg-primary-600" :style="progressWidth"></span>
                    </span>
                </div>
                <ContentEditor 
                    :blog="$props.blog"
                    @submit="onSubmit"
                    @close="closeEdit"
                    @delete="onDelete"
                />
            </template>
        </EditorTable>
    </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';
import { BlogState } from '../blog-api';
import { isEmpty } from 'lodash-es';
import { apiCall, useConfirm } from '@vnuge/vnlib.browser';
import { useClipboard } from '@vueuse/core';
import { ContentMeta, useFilteredPages } from '@vnuge/cmnext-admin';
import EditorTable from './EditorTable.vue';
import ContentEditor from './Content/ContentEditor.vue';
import ContentTable from './Content/ContentTable.vue';

const emit = defineEmits(['reload'])

const props = defineProps<{
    blog: BlogState,
    progress: number
}>()

const { progress } = toRefs(props)

//Get the computed content
const { selectedId, 
    updateContent,
    uploadContent,
    deleteContent,
    updateContentName,
    getPublicUrl
 } = props.blog.content;

 //Setup content filter
 const { items, pagination } = useFilteredPages(props.blog.content, 15)
 const { reveal } = useConfirm()

const showEdit = computed(() => !isEmpty(selectedId.value));
const loadingProgress = computed(() => `${progress?.value}%`);
const progressWidth = computed(() => ({ width: `${progress?.value}%` }));
const showProgress = computed(() => progress?.value > 0 && progress?.value < 100);

const openEdit = async (item: ContentMeta) => selectedId.value = item.id

const closeEdit = (update?: boolean) => {
    selectedId.value = ''
    //reload channels
    if (update) {
        emit('reload')
    }
    //Reset page to top
    window.scrollTo(0, 0)
}

const openNew = () => {
    selectedId.value = 'new'
    //Reset page to top
    window.scrollTo(0, 0)
}

interface OnSubmitValue{
    item: ContentMeta,
    file: File | undefined
}

//Allow copying of the public url to clipboard
const { copy } = useClipboard()
const copyLink = async (item : ContentMeta) =>{
    apiCall(async ({toaster}) =>{
        const url = await getPublicUrl(item);
        await copy(url);
        toaster.general.info({ title: 'Copied link to clipboard' })
    });
}

const onSubmit = async (value : OnSubmitValue) => {

    //Check for new channel, or updating old channel
    if (selectedId.value === 'new') {
        //Exec create call
        await apiCall(async () => {

            if(!value.file?.name){
                throw Error('No file selected')
            }

            //endpoint returns the content
            await uploadContent(value.file, value.item.name!);

            //Close the edit panel
            closeEdit(true);
        })
    }
    else if (!isEmpty(selectedId.value)) {
        //Exec update call
        await apiCall(async () => {
            //If no file was attached, just update the file name
            if(value.file?.name){
                await updateContent(value.item, value.file);
            }
            else{
                await updateContentName(value.item, value.item.name!);
            }
            //Close the edit panel
            closeEdit(true);
        })
    }
    //Notify error state
}

const onDelete = async (item: ContentMeta) => {
    //Show confirm
    const { isCanceled } = await reveal({
        title: 'Delete File?',
        text: `Are you sure you want to delete ${item.name}? This action cannot be undone.`,
    })
    if (isCanceled) {
        return;
    }

    if (!confirm(`Are you sure you want to delete ${item.name} forever?`)) {
        return;
    }

    //Exec delete call
    await apiCall(async () => {
        await deleteContent(item);
        //Close the edit panel
        closeEdit(true);
    })

    //Refresh content after delete
    props.blog.content.refresh();
}


</script>