<template>
    <div id="channel-editor">
        <EditorTable title="Manage channels" :show-edit="showEdit" :pagination="pagination" @open-new="openNew">
            <template #table>
                <ChannelTable 
                    :items="items"
                    @open-edit="openEdit" 
                />
            </template>
            <template #editor>
                <ChannelEdit 
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
import { isEmpty, filter as _filter } from 'lodash-es';
import { apiCall } from '@vnuge/vnlib.browser';
import { BlogChannel, ChannelFeed } from '@vnuge/cmnext-admin';
import { useStore } from '../../../store';
import ChannelEdit from './Channels/ChannelEdit.vue';
import ChannelTable from './Channels/ChannelTable.vue';
import EditorTable from './EditorTable.vue';

const emit = defineEmits(['close', 'reload'])

const store = useStore()
const { items, pagination } = store.channels.createPages()

const showEdit = computed(() => !isEmpty(store.channels.editChannel))

const openEdit = (channel: BlogChannel) => store.channels.editId = channel.id;

const closeEdit = (update?:boolean) => {
     store.channels.editId = ''
    //reload channels
    if(update){
        emit('reload')
    }
    //Reset page to top
    window.scrollTo(0, 0)
}

const openNew = () => {
     store.channels.editId = 'new'
    //Reset page to top
    window.scrollTo(0, 0)
}

const onSubmit = async ({channel, feed} : { channel:BlogChannel, feed? : ChannelFeed}) => {

    //Check for new channel, or updating old channel
    if(store.channels.editId === 'new'){
        //Exec create call
        await apiCall(async () => {
            await store.channels.add(channel, feed);
            //Close the edit panel
            closeEdit(true);
        })
    }
    else if(!isEmpty(store.channels.editId)){
        //Exec update call
        await apiCall(async () => {
            await store.channels.update(channel, feed);
            //Close the edit panel
            closeEdit(true);
        })
    }
    //Notify error state
}

const onDelete = async (channel : BlogChannel) => {
    //Exec delete call
    await apiCall(async () => {
        await store.channels.delete(channel);
        //Close the edit panel
        closeEdit(true);
    })
}

</script>

<style lang="scss">

</style>