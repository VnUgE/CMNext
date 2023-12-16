<template>
    <div id="content-editor" class="">
        <EditorTable title="Manage content" :show-edit="showEdit" :pagination="pagination" @open-new="openNew">
            <template #table>
                <ContentTable
                    :items="items" 
                    @open-edit="openEdit"
                    @copy-link="copyLink"
                    @delete="onDelete"
                    @download="onDownload"
                />
            </template>
            <template #editor>
                 <div v-if="showProgress" class="max-w-xl mx-auto">
                    <span id="ProgressLabel" class="sr-only">Loading</span>

                    <span 
                        role="progressbar"
                        aria-labelledby="ProgressLabel"
                        :aria-valuenow="uploadProgress"
                        class="relative block bg-gray-200 rounded-full dark:bg-dark-500"
                    >
                        <span class="absolute inset-0 flex items-center justify-center text-[10px]/4">
                            <span class="font-bold text-white "> {{ loadingProgress }} </span>
                        </span>

                        <span class="block h-4 text-center rounded-full bg-primary-600" :style="progressWidth"></span>
                    </span>
                </div>
                <ContentEditor 
                    @submit="onSubmit"
                    @close="closeEdit"
                    @delete="onDelete"
                />
            </template>
        </EditorTable>
        <a class="hidden" ref="downloadAnchor"></a>
    </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { isEmpty } from 'lodash-es';
import { apiCall, useConfirm } from '@vnuge/vnlib.browser';
import { get, useClipboard } from '@vueuse/core';
import { ContentMeta } from '@vnuge/cmnext-admin';
import { useStore } from '../../../store';
import { storeToRefs } from 'pinia';
import EditorTable from './EditorTable.vue';
import ContentEditor from './Content/ContentEditor.vue';
import ContentTable from './Content/ContentTable.vue';


const store = useStore()
const { uploadProgress } = storeToRefs(store)
const { items, pagination } = store.content.createPages()

 const { reveal } = useConfirm()
 const downloadAnchor = shallowRef<HTMLAnchorElement>()

const showEdit = computed(() => !isEmpty(store.content.selectedId));
const loadingProgress = computed(() => `${uploadProgress.value}%`);
const progressWidth = computed(() => ({ width: `${uploadProgress.value}%` }));
const showProgress = computed(() => uploadProgress.value > 0 && uploadProgress.value < 100);


const openEdit = async (item: ContentMeta) => store.content.selectedId = item.id

const closeEdit = (update?: boolean) => {
    store.content.selectedId = ''
    //reload channels
    if (update) {
        store.content.refresh()
    }
    //Reset page to top
    window.scrollTo(0, 0)
}

const openNew = () => {
    store.content.selectedId = 'new'
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
        const url = await store.content.getPublicUrl(item);
        await copy(url);
        toaster.general.info({ title: 'Copied link to clipboard' })
    });
}

const onSubmit = async (value : OnSubmitValue) => {

    //Check for new channel, or updating old channel
    if (store.content.selectedId === 'new') {
        //Exec create call
        await apiCall(async () => {

            if(!value.file?.name){
                throw Error('No file selected')
            }

            //endpoint returns the content
            await store.content.uploadContent(value.file, value.item.name!);

            //Close the edit panel
            closeEdit(true);
        })
    }
    else if (!isEmpty(store.content.selectedId)) {
        //Exec update call
        await apiCall(async () => {
            //If no file was attached, just update the file name
            if(value.file?.name){
                await store.content.updateContent(value.item, value.file);
            }
            else{
                await store.content.updateContentName(value.item, value.item.name!);
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
        await store.content.delete(item);
        //Close the edit panel
        closeEdit(true);
    })

    //Refresh content after delete
    store.content.refresh();
}

const onDownload = async (item: ContentMeta) => {
    //Exec download call
    await apiCall(async () => {
        //Download the file blob from the server
        const fileBlob = await store.content.downloadContent(item)

        //Create a url for the blob and open the save link
        const url = window.URL.createObjectURL(fileBlob);
        
        const anchor = get(downloadAnchor)!;
        anchor.href = url;
        anchor.download = item.name!;
        anchor.click();
    })
}

</script>