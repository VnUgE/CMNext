<template>
    <div id="post-editor" class="">
        <EditorTable title="Manage posts" :show-edit="showEdit" :pagination="pagination" @open-new="openNew">
            <template v-slot:table>
                <PostTable 
                    :posts="items"
                    @open-edit="openEdit"
                />
            </template> 
            <template #editor>
                <PostEditor 
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
import { isEmpty } from 'lodash';
import { PostMeta, useFilteredPages } from '@vnuge/cmnext-admin';
import { apiCall, debugLog } from '@vnuge/vnlib.browser';
import EditorTable from './EditorTable.vue';
import PostEditor from './Posts/PostEdit.vue';
import PostTable from './Posts/PostTable.vue';
import { BlogState } from '../blog-api';

const emit = defineEmits(['reload'])

const props = defineProps<{
   blog: BlogState
}>()

const { selectedId, publishPost, updatePost, deletePost } = props.blog.posts;
const { updatePostContent } = props.blog.content;

const showEdit = computed(() => !isEmpty(selectedId.value));

//Init paginated items for the table and use filtered items
const { pagination, items } = useFilteredPages(props.blog.posts, 15)

//Open with the post id
const openEdit = async (post: PostMeta) => selectedId.value = post.id;

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
    //Reset the edit post
    selectedId.value = 'new'
    //Reset page to top
    window.scrollTo(0, 0)
}

const onSubmit = async ({post, content } : { post:PostMeta, content:string }) => {

    debugLog('submitting', post, content);

    //Check for new channel, or updating old channel
    if (selectedId.value === 'new') {
        //Exec create call
        await apiCall(async () => {

            //endpoint returns the content
            const newMeta = await publishPost(post);

            //Publish the content
            await updatePostContent(newMeta, content)

            //Close the edit panel
            closeEdit(true);
        })
    }
    else if (!isEmpty(selectedId.value)) {
        //Exec update call
        await apiCall(async () => {
            await updatePost(post);
           
            //Publish the content
            await updatePostContent(post, content)

            //Close the edit panel
            closeEdit(true);
        })
    }
    //Notify error state
}

const onDelete = async (post: PostMeta) => {
    //Exec delete call
    await apiCall(async () => {
        await deletePost(post);
        //Close the edit panel
        closeEdit(true);
    })
}

</script>

<style lang="scss">

</style>