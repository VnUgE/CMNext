<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import { useXmlProperties, type FeedProperty } from '@vnuge/cmnext-admin';
import { useToggle, whenever } from '@vueuse/core';
import { cloneDeep } from 'lodash-es';

defineProps<{ showEpAdder?: boolean }>();
const properties = defineModel<FeedProperty[]>('properties', { required: true });
const { toXmlString } = useXmlProperties();
const [editMode, toggleEditMode] = useToggle();

// A failed editor download leaves the pane usable via retry instead of a
// permanent skeleton. Bumping the key forces a fresh load attempt.
const editorKey = ref(0);
const editorError = ref<unknown>(null);
const JsonEditorVue = defineAsyncComponent({
  loader: () => import('json-editor-vue'),
  onError: (err) => (editorError.value = err),
});

const propBuffer = ref<FeedProperty[]>(cloneDeep(properties.value));

// Show realtime-example
const cleanXml = computed(() => {
  const xml = toXmlString(properties.value);
  return formatXml(xml || '');
});

const formatXml = (xml: string) => {
  // tab = optional indent value, default is tab (\t)
  let formatted = '';
  let indent = '';

  xml.split(/>\s*</).forEach((node) => {
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

const retryEditor = (): void => {
  editorError.value = null;
  editorKey.value++;
};

const save = (): void => {
  properties.value = cloneDeep(propBuffer.value);
  toggleEditMode(false);
};

const cancel = (): void => {
  // Reset buffer to original
  propBuffer.value = cloneDeep(properties.value);
  toggleEditMode(false);
};

whenever(editMode, () => (propBuffer.value = cloneDeep(properties.value)));
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

    <div v-else-if="!editMode" class="w-full max-w-2xl mx-auto text-center opacity-70">
      <p>No custom feed fields. Click Edit to add some.</p>
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
      <div v-if="showEpAdder" class="mb-2">
        <div class="alert alert-info mb-2">
          <span>Episode enclosures aren't editable yet.</span>
        </div>
      </div>

      <div v-if="editorError" class="flex flex-col items-center justify-center gap-2 h-64">
        <p class="text-error">Failed to load the JSON editor.</p>
        <button class="btn btn-sm btn-outline" @click="retryEditor()">Retry</button>
      </div>

      <Suspense v-else>
        <template #default>
          <JsonEditorVue :key="editorKey" v-model="propBuffer" :ask-to-format="true" class="json" />
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
