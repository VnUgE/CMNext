<template>
    <div id="channel-editor">
        <EditorTable title="Manage channels" :show-edit="showEdit" :pagination="pagination" @open-new="openNew">
            <template v-slot:table>
                <ChannelTable
                    :channels="items"
                    @open-edit="openEdit"
                />
            </template>
            <template #editor>
                <ChannelEdit 
                    :blog="$props.blog"
                    @close="closeEdit"
                    @on-submit="onSubmit"
                    @on-delete="onDelete"
                />
            </template>
        </EditorTable>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BlogState } from '../blog-api';
import { isEmpty, filter as _filter } from 'lodash';
import { apiCall } from '@vnuge/vnlib.browser';
import { BlogChannel, ChannelFeed, useFilteredPages } from '@vnuge/cmnext-admin';
import ChannelEdit from './Channels/ChannelEdit.vue';
import ChannelTable from './Channels/ChannelTable.vue';
import EditorTable from './EditorTable.vue';

const emit = defineEmits(['close', 'reload'])

const props = defineProps<{
    blog: BlogState,
}>()

const { updateChannel, addChannel, deleteChannel, getQuery } = props.blog.channels;
const { channelEdit } = getQuery()

//Setup channel filter
const { items, pagination } = useFilteredPages(props.blog.channels, 15)

const showEdit = computed(() => !isEmpty(channelEdit.value))

const openEdit = (channel: BlogChannel) => channelEdit.value = channel.id;

const closeEdit = (update?:boolean) => {
    channelEdit.value = ''
    //reload channels
    if(update){
        emit('reload')
    }
    //Reset page to top
    window.scrollTo(0, 0)
}

const openNew = () => {
    channelEdit.value = 'new'
    //Reset page to top
    window.scrollTo(0, 0)
}

const onSubmit = async ({channel, feed} : { channel:BlogChannel, feed? : ChannelFeed}) => {

    //Check for new channel, or updating old channel
    if(channelEdit.value === 'new'){
        //Exec create call
        await apiCall(async () => {
            await addChannel(channel, feed);
            //Close the edit panel
            closeEdit(true);
        })
    }
    else if(!isEmpty(channelEdit.value)){
        //Exec update call
        await apiCall(async () => {
            await updateChannel(channel, feed);
            //Close the edit panel
            closeEdit(true);
        })
    }
    //Notify error state
}

const onDelete = async (channel : BlogChannel) => {
    //Exec delete call
    await apiCall(async () => {
        await deleteChannel(channel);
        //Close the edit panel
        closeEdit(true);
    })
}

</script>

<style lang="scss">

</style>