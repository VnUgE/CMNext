<template>
    <div id="feed-custom-fields">
        <div class="my-3 text-center">
            <h4>Feed custom fields</h4>
        </div>

        <div v-if="cleanXml" class="w-full max-w-2xl mx-auto">
            <pre class="xml">
{{ cleanXml }}
            </pre>
        </div>

        
        <div class="my-2 ml-auto w-fit">
            <div v-if="!editMode"  class="button-group">
                <button class="btn" @click="edit">Edit</button>
            </div>
            <div v-else class="button-group">
                <button class="btn primary" @click="save" >Update</button>
                <button class="btn" @click="cancel">Cancel</button>
            </div>
        </div>


        <div v-if="editMode" class="flex flex-col">
            <div v-if="$props.blog" class="mb-2">
                <EpAdder :blog="$props.blog" @submit="onAddEnclosure" />
            </div>

            <div class="">
                <JsonEditorVue :ask-to-format="true" class="json" v-model="jsonFeedData"/>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { FeedProperty, UseXmlProperties } from '@vnuge/cmnext-admin';
import { BlogState } from '../blog-api';
import EpAdder from './podcast-helpers/EpisodeAdder.vue';
const JsonEditorVue = defineAsyncComponent(() => import('json-editor-vue'))

const props = defineProps<{
    properties: UseXmlProperties,
    blog?: BlogState
}>()

const { getXml, saveJson, getModel, addProperties } = props.properties

const jsonFeedData = ref()
const editMode = ref(false)
const xmlData = ref<string | undefined>(getXml())

const cleanXml = computed(() => {

    const formatXml = (xml : string) => { // tab = optional indent value, default is tab (\t)
        var formatted = '', indent = '';
        xml.split(/>\s*</).forEach(function (node) {
            if (node.match(/^\/\w/)){
                indent = indent.substring(1); // decrease indent by one 'tab'
            }
            formatted += indent + '<' + node + '>\r\n';
            if (node.match(/^<?\w[^>]*[^\/]$/)){
                 indent += '\t';              // increase indent
            }
        });

        return formatted.substring(1, formatted.length - 3);
    }
    return formatXml(xmlData.value || '')
})

const edit = () => {
    jsonFeedData.value = getModel()
    editMode.value = true
}

const save = () : void => {
    //Only close editor if the json is valid
    if(saveJson(jsonFeedData.value)){
        editMode.value = false
        //update xml
        xmlData.value = getXml()
    }
}

const cancel = () : void => {
    editMode.value = false
    xmlData.value = getXml()
}

const onAddEnclosure = (props: FeedProperty[]) =>{
    addProperties(props);
    //update xml
    xmlData.value = getXml()
    //update json editor
    jsonFeedData.value = getModel()
}

</script>

<style lang="scss">

#feed-custom-fields{

    @apply w-full max-w-[80%] mx-auto py-4 my-5;

    .json > .jse-main{
        @apply w-full min-h-[40rem] rounded bg-transparent mx-auto;
    }

    .feed-fields{
        @apply mx-auto gap-4 flex flex-row justify-center my-6;
        
        input.primary{
            @apply w-full;
        }

        textarea.primary{
            @apply w-full h-full tracking-wider font-mono p-3 text-sm;
        }

        textarea.invalid{
            @apply border-red-500;
        }
    }

    .xml{
        @apply tracking-wider font-mono p-3 text-sm border dark:border-dark-500 rounded whitespace-pre-wrap;
    }

    .xml.invalid{
        @apply border-red-500;
    }

}

</style>