<template>
    <div id="content-editor" class="">
        <EditorTable title="Manage content" :show-edit="showEdit" :pagination="pagination" @open-new="openNew">
            <template v-slot:table>
                <ContentTable 
                    :content="items"
                    @open-edit="openEdit"
                    @copy-link="copyLink"
                />
            </template>
            <template #editor>
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
import { computed } from 'vue';
import { BlogState } from '../blog-api';
import { isEmpty } from 'lodash';
import { apiCall } from '@vnuge/vnlib.browser';
import EditorTable from './EditorTable.vue';
import ContentEditor from './Content/ContentEditor.vue';
import ContentTable from './Content/ContentTable.vue';
import { useClipboard } from '@vueuse/core';
import { ContentMeta, useFilteredPages } from '@vnuge/cmnext-admin';

const emit = defineEmits(['reload'])

const props = defineProps<{
   blog: BlogState
}>()


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

const showEdit = computed(() => !isEmpty(selectedId.value));

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
    //Exec delete call
    await apiCall(async () => {
        await deleteContent(item);
        //Close the edit panel
        closeEdit(true);
    })
}


</script>