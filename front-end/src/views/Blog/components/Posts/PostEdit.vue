<template>
    <div id="new-post-editor" class="flex flex-col w-full">
        <div class="my-4 ml-auto">
            <div class="button-group">
                <!-- Submit the post form -->
                <button class="btn primary" form="post-edit-form">Save</button>
                <button class="btn" @click="onClose">Cancel</button>
            </div>
        </div>
        <div class="mx-auto">
            <h4 class="text-center">Edit Post</h4>
            <p>
                Add or edit a post to publish to your blog.
            </p>
        </div>
        <div class="relative">
            <div class="absolute top-2 right-10">
                <button class="btn no-border" @click="setMeAsAuthor">@Me</button>
            </div>
        </div>
        <dynamic-form
            id="post-edit-form"
            class="mx-auto"
            :form="schema"
            :disabled="false"
            :validator="v$"
            @submit="onSubmit"
        />

        <div id="post-content-editor" class="px-6" :class="{'invalid':v$.content.$invalid}">
            <Editor @change="onContentChanged" :blog="$props.blog" @load="onEditorLoad" />
        </div>

         <FeedFields :properties="postProperties" :blog="$props.blog" />

         <div class="mx-auto my-4">
            <div class="button-group">
                <!-- Submit the post form -->
                <button class="btn primary" form="post-edit-form">Save</button>
                <button class="btn" @click="onClose">Cancel</button>
                <button v-if="!isNew" class="btn red" @click="onDelete">Delete Forever</button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { BlogState } from '../../blog-api';
import { reactiveComputed } from '@vueuse/core';
import { isNil, isString, split } from 'lodash-es';
import { PostMeta, useXmlProperties } from '@vnuge/cmnext-admin';
import { apiCall, useConfirm, useUser } from '@vnuge/vnlib.browser';
import { getPostForm } from '../../form-helpers';
import Editor from '../../ckeditor/Editor.vue';
import FeedFields from '../FeedFields.vue';

const emit = defineEmits(['close', 'submit', 'delete']);
const props = defineProps<{
    blog: BlogState
}>()

const { reveal } = useConfirm();
const { getProfile } = useUser();
const { schema, getValidator } = getPostForm();

const { posts, content } = props.blog;

const isNew = computed(() => isNil(posts.selectedItem.value));

/* Post meta may load delayed from the api so it must be computed 
and reactive, it may also be empty when a new post is created */
const postBuffer = reactiveComputed<PostMeta>(() => {
    return {
        ...posts.selectedItem.value,
        content: ''
    } as PostMeta
});

const { v$, validate } = getValidator(postBuffer);

//Wrap the post properties in an xml feed editor
const postProperties = useXmlProperties(posts.selectedItem);

const onSubmit = async () =>{
    if(!await validate()){
        return;
    }

    //get all properties
    const p = postProperties.getCurrentProperties();

    const post = {
        ...postBuffer,
        properties: p,
        content: undefined
    }

    //Remove the content from the post object
    delete post.content;

    //Convert the tags string to an array of strings
    post.tags = isString(post.tags) ? split(post.tags, ',') : post.tags;

    emit('submit', { post, content: v$.value.content.$model});
}

const onClose = () => emit('close');

const onContentChanged = (content: string) => {
    //Set the validator content string
    v$.value.content.$model = content;
}

const onDelete = async () => {
    //Show confirm
    const { isCanceled } = await reveal({
        title: 'Delete Post?',
        text: 'Are you sure you want to delete this post? This action cannot be undone.',
    })
    if (isCanceled) {
        return;
    }

    if (!confirm('Are you sure you want to delete this post forever?')) {
        return;
    }

    //Emit the delete event with the original post
    emit('delete', posts.selectedItem.value)
}

const setMeAsAuthor = () => {
    apiCall(async () => {
        const { first, last } = await getProfile<{first?:string, last?:string, email:string}>();
        v$.value.author.$model = `${first ?? ''} ${last ?? ''}`
    })
}

const onEditorLoad = async (editor : any) =>{

    //Get the initial content
    const postContent = await content.getSelectedPostContent();

    //Set the initial content
    if(!isNil(postContent)){
        onContentChanged(postContent);
        editor.setData(postContent);
    }
}

</script>

<style lang="scss">

</style>