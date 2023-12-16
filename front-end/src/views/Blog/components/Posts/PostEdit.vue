<template>
    <div id="new-post-editor" class="flex flex-col w-full">
        <div class="my-4 ml-auto">
            <div class="button-group">
                <!-- Submit the post form -->
                <button class="btn primary" form="post-edit-form">Save</button>
                <button class="btn" @click="onClose">Back</button>
            </div>
            <div class="pl-3 text-xs text-color-background">
                ctrl + s
            </div>
        </div>
        <div class="mx-auto">
            <h4 class="text-center">Edit Post</h4>
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
            <Editor :podcast-mode="podcastMode" @change="onContentChanged" @mode-change="onModeChange" @load="onEditorLoad" />
        </div>

         <FeedFields :show-ep-adder="true" :properties="postProperties" />

         <div class="mx-auto my-4">
            <div class="button-group">
                <!-- Submit the post form -->
                <button class="btn primary" form="post-edit-form">Save</button>
                <button class="btn" @click="onClose">Back</button>
                <button v-if="!isNew" class="btn red" @click="onDelete">Delete Forever</button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, ref, toRef } from 'vue';
import { reactiveComputed, useMagicKeys } from '@vueuse/core';
import { isNil, isString, split, debounce } from 'lodash-es';
import { PostMeta, useXmlProperties } from '@vnuge/cmnext-admin';
import { apiCall, useUser } from '@vnuge/vnlib.browser';
import { getPostForm } from '../../form-helpers';
import { useStore } from '../../../../store';
import FeedFields from '../FeedFields.vue';
const Editor = defineAsyncComponent(() => import('../../ckeditor/Editor.vue'));

const emit = defineEmits(['close', 'submit', 'delete']);
const store = useStore()

const { getProfile } = useUser();
const { schema, getValidator } = getPostForm();

const podcastMode = ref(false)

const isNew = computed(() => isNil(store.posts.selected));

/* Post meta may load delayed from the api so it must be computed 
and reactive, it may also be empty when a new post is created */
const postBuffer = reactiveComputed<PostMeta>(() => {
    return {
        ...store.posts.selected,
        content: ''
    } as PostMeta
});

const { v$, validate } = getValidator(postBuffer);

//Wrap the post properties in an xml feed editor
const postProperties = useXmlProperties(toRef(store.posts.selected));

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

    //Store the post content on the html descrption if in podcast mode
    if(podcastMode.value){
        post.html_description = v$.value.content.$model;
    }
    else{
        delete post.html_description; 
    }

    //Convert the tags string to an array of strings
    post.tags = isString(post.tags) ? split(post.tags, ',') : post.tags;

    emit('submit', { post, content: v$.value.content.$model});
}

const onClose = () => emit('close');

const onContentChanged = (content: string) => {
    //Set the validator content string
    v$.value.content.$model = content;
}

const onDelete = () => emit('delete', store.posts.selected)

const setMeAsAuthor = () => {
    apiCall(async () => {
        const { first, last } = await getProfile<{first?:string, last?:string, email:string}>();
        v$.value.author.$model = `${first ?? ''} ${last ?? ''}`
    })
}

const onModeChange = (e: boolean) => {
    podcastMode.value = e;
}

const onEditorLoad = async (editor : any) =>{

    if(isNil(store.posts.selected)){
        return;
    }

    //Get the initial content
    const postContent = await store.content.getPostContent(store.posts.selected);

    //Set the initial content
    if(!isNil(postContent)){
        onContentChanged(postContent);
        editor.setData(postContent);
    }

    //If the post has an html description, set podcast mode
    if(postBuffer.html_description){
        //Set podcast mode to true
        podcastMode.value = true;
    }
}

const throttleOnSubmit = debounce(onSubmit, 200);

//Setup ctrl+s to submit the form(save)
useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.ctrlKey && e.key === 's' && e.type === 'keydown'){
        e.preventDefault()
        throttleOnSubmit()
    }
  },
})

</script>

<style lang="scss">

</style>