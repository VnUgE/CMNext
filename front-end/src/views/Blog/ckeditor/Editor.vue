<template>
    <div class="pt-6">
        <div class="flex justify-end w-full gap-2 my-2">
             <div class="w-fit">
                 <Popover class="relative">
                    <PopoverButton class="btn">
                        Add
                        <fa-icon class="ml-2" icon="photo-film" />
                    </PopoverButton>
                    <PopoverPanel class="absolute right-0 z-10 top-10">
                        <div class="md-pannel">
                            <div class="">
                                Search for content by its id or file name.
                            </div>
                            <ContentSearch :blog="$props.blog"/>
                        </div>
                    </PopoverPanel>
                </Popover>
            </div>
            <div class="w-fit">
                 <Popover class="relative">
                    <PopoverButton class="btn" @click="recoverMd">
                        Markdown
                        <fa-icon class="ml-2" :icon="['fab','markdown']" />
                    </PopoverButton>
                    <PopoverPanel class="absolute right-0 z-10 top-10">
                        <div class="md-pannel">
                            <div class="">
                                Paste your markdown here to convert it to html.
                            </div>
                            <div class="my-4">
                                <textarea class="w-full h-40 p-2 bg-transparent border" v-model="mdBuffer"></textarea>
                            </div>
                            <div class="flex justify-end">
                                <button class="btn primary" @click="convertMarkdown">Convert</button>
                            </div>
                        </div>
                    </PopoverPanel>
                </Popover>
            </div>
            <div class="w-fit">
                <button class="btn" @click="recoverFromCrash">
                    Recover
                    <fa-icon class="ml-2" icon="rotate-left" />
                </button>
            </div>
        </div>
        <div id="ck-editor-frame" ref="editorFrame">
            <div class="w-full text-center">
                <h5>Loading editor...</h5>
                <fa-icon class="text-2xl" icon="spinner" spin />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash';
import { ref } from 'vue';
import { useSessionStorage } from '@vueuse/core';
import { tryOnMounted } from '@vueuse/shared';
import { apiCall } from '@vnuge/vnlib.browser';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { BlogState } from '../blog-api'
import { Converter } from 'showdown'

//Import the editor config
import { config } from './build.ts'
import ContentSearch from '../components/ContentSearch.vue';

const emit = defineEmits(['change', 'load'])

defineProps<{
    blog: BlogState
}>()

let editor = {}
//Init new shodown converter
const showdownConverter = new Converter()
const mdBuffer = ref('')
const editorFrame = ref(null)
const crashBuffer = useSessionStorage('post-crash', '')

const recoverFromCrash = () => {
    //Set editor content from crash buffer
    editor.setData(crashBuffer.value);
}

const onChange = (content:string) =>{
    //Save the content to the crash buffer
    crashBuffer.value = content;
    emit('change', content)
}

const convertMarkdown = () => {
  
    const html = showdownConverter.makeHtml(mdBuffer.value);

    //Set initial data
    editor.setData(html)

    //manually trigger change event
    onChange(html)

    //Clear the buffer
    mdBuffer.value = ''
}

const recoverMd = () => {
    const current = editor.getData();
    const md = showdownConverter.makeMd(current);
    mdBuffer.value = md;
}

tryOnMounted(() =>
    //Load the editor once the component is mounted
   apiCall(async ({ toaster }) => {

        //Entry script creates promise that resolves when the editor script is loaded
        if(window.editorLoadResult){
            //Wait for the editor script to load
            await (window.editorLoadResult as Promise<boolean>)
        }

        if (!window['CKEDITOR']) {
            toaster.general.error({
                title: 'Script Error',
                text: 'The CKEditor script failed to load, check script permissions.'
            })
            return;
        }

        //CKEditor 5 superbuild in global scope
        const { ClassicEditor } = window['CKEDITOR']

        //Init editor when loading is complete
        editor = await ClassicEditor.create(editorFrame.value, config);

        //Update the local copy when the editor data changes
        editor.model.document.on('change:data', debounce(() => onChange(editor.getData())), 500)

        //Call initial load hook
        emit('load', editor);
    })
)

</script>

<style lang="scss">

.md-pannel{
    @apply p-6 min-w-[32rem] bg-white shadow-md dark:bg-dark-700 border dark:border-dark-300;
}

</style>