<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';
import { tryOnBeforeUnmount, whenever, get, set } from '@vueuse/core';
import { Jodit } from 'jodit';
import { defer } from 'lodash-es';
import 'jodit/es2021/jodit.min.css';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const el = ref<HTMLTextAreaElement>();
const editor = shallowRef<ReturnType<typeof Jodit.make>>();

whenever(el, (mount) => {
  defer(() => {
    if (!mount.isConnected) return;

    const ed = Jodit.make(mount, { height: 'auto' });
    ed.value = props.modelValue;

    // User edits -> push up to the buffer.
    ed.events.on('change', () => {
      if (ed.value !== props.modelValue) emit('update:modelValue', ed.value);
    });

    set(editor, ed);
  });
});

// External change (e.g. Markdown import writes buffer.content) -> push down.
watch(
  () => props.modelValue,
  (value) => {
    const ed = get(editor);
    if (ed && ed.value !== value) ed.value = value;
  }
);

// Tear down on unmount
tryOnBeforeUnmount(() => {
  editor.value?.destruct();
  set(editor, undefined);
});
</script>

<template>
  <!-- Jodit replaces this textarea with its editor UI. Deliberately no v-model. -->
  <textarea ref="el" class="jodit post-editor" aria-label="Post content" />
</template>
