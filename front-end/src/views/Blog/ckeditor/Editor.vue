<script setup lang="ts">
import { defer } from 'lodash-es';
import { ref, toRefs, watch } from 'vue';
import { get, set, tryOnMounted, until } from '@vueuse/core';
import { apiCall } from '@vnuge/vnlib.browser';
import suneditor from 'suneditor'
import plugins from 'suneditor/src/plugins'
import SunEditor from 'suneditor/src/lib/core';

const emit = defineEmits(['change', 'load', 'mode-change'])
const props = defineProps<{ initialContent: string | undefined }>();
const { initialContent } = toRefs(props);

const sunPostEditor = ref<HTMLTextAreaElement>();
const editorInstance = ref<SunEditor>();

// Called when the suneditor completes initlaization
const onEditorLoaded = async (editor: SunEditor) => {
    set(editorInstance, editor);
    emit('load', editor);
}

const onEditorChanged = async (content: string) => {
    emit('change', content);
}

//IF the initial data buffer updates, write the content to the editor
watch(initialContent, async () => {
    const val = get(initialContent);
    //Wait for the editor to load if it hasn't yet. 
    const editor = await until(editorInstance).not.toBeNull().then(e => e!);
    editor.setContents(val || '');
})

tryOnMounted(() => defer(() =>
    //Load the editor once the component is mounted
    apiCall(async () => {
        const editor = suneditor.create(sunPostEditor.value!, {
            plugins: plugins,
            height: 'auto',
            stickyToolbar: 87,
            width: '100%',
            imageMultipleFile: true,
            buttonList: [
                ['undo', 'redo'],
                ['font', 'fontSize', 'formatBlock'],
                ['paragraphStyle', 'blockquote'],
                ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                ['fontColor', 'hiliteColor', 'textStyle'],
                ['removeFormat'],
                '/', // Line break
                ['outdent', 'indent'],
                ['align', 'horizontalRule', 'list', 'lineHeight'],
                ['table', 'link', 'image', 'video', 'audio' /** ,'math' */], // You must add the 'katex' library at options to use the 'math' plugin.
                /** ['imageGallery'] */ // You must add the "imageGalleryUrl".
                ['fullScreen', 'showBlocks', 'codeView'],
                ['preview', 'print', 'template'],
                /** ['dir', 'dir_ltr', 'dir_rtl'] */ // "dir": Toggle text direction, "dir_ltr": Right to Left, "dir_rtl": Left to Right
            ],
            placeholder: 'Start writing your post content here...',
            charCounterType: 'byte-html',
            charCounter: true,
            maxCharCount: 50000,
            showPathLabel: false
        });

        editor.onload = () => {
            onEditorLoaded(editor);
        };

        editor.onChange = onEditorChanged;
    })
))

</script>
<template>
    <textarea id="sun-post-editor" ref="sunPostEditor" class="prose max-w-none" />
</template>
