<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import { FeedProperty, useXmlProperties } from '@vnuge/cmnext-admin';
import { useToggle, whenever } from '@vueuse/core';
import { assign } from 'lodash-es';
const JsonEditorVue = defineAsyncComponent(() => import('json-editor-vue'));

const _props = defineProps<{
  showEpAdder?: boolean;
}>();

const properties = defineModel<FeedProperty[]>('properties', { required: true });

const { toXmlString } = useXmlProperties();
const [editMode, toggleEditMode] = useToggle();

const formatXml = (xml: string) => {
  // tab = optional indent value, default is tab (\t)
  let formatted = '';
  let indent = '';

  xml.split(/>\s*</).forEach(function (node) {
    if (node.match(/^\/\w/)) {
      indent = indent.substring(1); // decrease indent by one 'tab'
    }
    formatted += indent + '<' + node + '>\r\n';
    if (node.match(/^<?\w[^>]*[^/]$/)) {
      indent += '\t'; // increase indent
    }
  });

  return formatted.substring(1, formatted.length - 3);
};

// Show realtime-example
const cleanXml = computed(() => {
  const xml = toXmlString(properties.value);
  return formatXml(xml || '');
});

const propBuffer = ref<FeedProperty[]>([...properties.value]);

const save = () => {
  properties.value = propBuffer.value;
  toggleEditMode(false);
};

const cancel = (): void => {
  // Reset buffer to original
  propBuffer.value = properties.value;
  toggleEditMode(false);
};

whenever(editMode, () => assign(propBuffer.value, properties.value));
</script>

<template>
  <div id="feed-custom-fields">
    <div class="my-3 text-center">
      <h4>Feed custom fields</h4>
    </div>

    <div v-if="cleanXml && !editMode" class="w-full max-w-2xl mx-auto">
      <pre class="xml">
        {{ cleanXml }}
      </pre>
    </div>

    <div class="my-2 ml-auto w-fit">
      <div v-if="!editMode" class="button-group">
        <button class="btn" @click="toggleEditMode(true)">Edit</button>
      </div>
      <div v-else class="button-group">
        <button class="btn btn-primary" @click="save()">Update</button>
        <button class="btn" @click="cancel()">Cancel</button>
      </div>
    </div>

    <div v-if="editMode" class="flex flex-col">
      <div v-if="$props.showEpAdder" class="mb-2">
        <div class="mb-2">
          <h5 class="text-center mb-2">TODO: Add Episode Enclosure</h5>
        </div>
      </div>

      <Suspense>
        <template #default>
          <JsonEditorVue v-model="propBuffer" :ask-to-format="true" class="json" />
        </template>
        <template #fallback>
          <div class="flex items-center justify-center h-64">
            <div class="loading loading-spinner loading-lg" />
            <span class="ml-2">Loading editor...</span>
          </div>
        </template>
      </Suspense>
    </div>
  </div>
</template>
