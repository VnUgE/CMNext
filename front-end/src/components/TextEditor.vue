<script setup lang="ts">
import { defer } from 'lodash-es';
import { ref } from 'vue';
import { until } from '@vueuse/core';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import suneditor from 'suneditor';
import plugins from 'suneditor/src/plugins';
import { toaster } from '../main';

const emit = defineEmits(['load', 'mode-change']);

const sunPostEditor = ref<HTMLTextAreaElement>();
const apiCall = useApiCall({ toaster });

//Load the editor once the component is mounted
until(sunPostEditor)
    .toBeTruthy()
    .then((element) => {
        apiCall(async () => {
            const editor = suneditor.create(element, {
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
                showPathLabel: false,
            });

            editor.onload = () => defer(async () => {
                emit('load', editor);
            });
        });
    });

</script>

<template>
    <textarea id="sun-post-editor" ref="sunPostEditor" class="prose max-w-none" />
</template>
