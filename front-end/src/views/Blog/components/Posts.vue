<template>
    <div id="post-editor" class="">
        <EditorTable title="Manage posts" :show-edit="showEdit" :pagination="pagination" @open-new="openNew">
            <template #table>
                <PostTable 
                    :items="items"
                    @open-edit="openEdit"
                    @delete="onDelete"
                />
            </template> 
            <template #editor>
                <PostEditor 
                    @submit="onSubmit"
                    @close="closeEdit"
                    @delete="onDelete"
                />
            </template>
        </EditorTable>
    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { isEmpty } from 'lodash-es';
import { PostMeta } from '@vnuge/cmnext-admin';
import { apiCall, debugLog, useConfirm } from '@vnuge/vnlib.browser';
import { useStore } from '../../../store';
import EditorTable from './EditorTable.vue';
import PostTable from './Posts/PostTable.vue';
const PostEditor = defineAsyncComponent(() => import('./Posts/PostEdit.vue'))

const store = useStore()

const { reveal } = useConfirm()

const showEdit = computed(() => !isEmpty(store.posts.selectedId));
const { items, pagination } = store.posts.createPages();

//Open with the post id
const openEdit = async (post: PostMeta) => store.posts.selectedId = post.id;

const refresh = () => {
    store.posts.refresh();
    store.content.refresh();
}

const closeEdit = (update?: boolean) => {
    store.posts.selectedId = ''
    //reload channels
    if (update) {
        //must refresh content and posts when a post is updated
       refresh();
    }
    //Reset page to top
    window.scrollTo(0, 0);
}

const openNew = () => {
    //Reset the edit post
    store.posts.selectedId = 'new'
    //Reset page to top
    window.scrollTo(0, 0)
}

const onSubmit = async ({post, content } : { post: PostMeta, content: string }) => {

    debugLog('submitting', post, content);

    //Check for new channel, or updating old channel
    if (store.posts.selectedId === 'new') {
        //Exec create call
        await apiCall(async ({toaster}) => {

            //endpoint returns the content
            const newMeta = await store.posts.add(post);

            //Publish the content
            await store.content.updatePostContent(newMeta, content)

            toaster.general.success({
                id: 'post-create-success',
                title: 'Created',
                text: `Post '${post.title}' created`,
            })
        })
    }
    else if (!isEmpty(store.posts.selectedId)) {
        //Exec update call
        await apiCall(async ( {toaster} ) => {
            await store.posts.update(post);
           
            //Publish the content
            await store.content.updatePostContent(post, content)

            toaster.general.info({
                id: 'post-update-success',
                title: 'Saved',
                text: `Post '${post.title}' updated`,
            })
        })
    }
    refresh();
}

const onDelete = async (post: PostMeta) => {

    //Show confirm
    const { isCanceled } = await reveal({
        title: 'Delete Post?',
        text: `Are you sure you want to delete post '${post.title}?' This action cannot be undone.`,
    })
    if (isCanceled) {
        return;
    }

    if (!confirm(`Are you sure you want to delete post '${post.id}' forever?`)) {
        return;
    }

    //Exec delete call
    await apiCall(async () => {
        await store.posts.delete(post);
        //Close the edit panel
        closeEdit(true);
    })

    store.posts.refresh();
}

</script>

<style lang="scss">

</style>