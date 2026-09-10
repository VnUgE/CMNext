<script setup lang="ts">
import { onClickOutside, useElementSize } from '@vueuse/core';
import { ref, computed, toRefs } from 'vue';

const emit = defineEmits<{ close: []; submit: [] }>();
const props = defineProps<{ open: boolean }>();
const { open } = toRefs(props);

const dialogRef = ref(null);

onClickOutside(dialogRef, () => emit('close'));

// TODO: useElementSize(null) always returns {width: 0, height: 0}.
// Need to track an actual header element ref or use a different approach
// to calculate dialog positioning relative to app header.
const header = useElementSize(null);

const style = computed(() => {
  return {
    height: `calc(100vh - ${header.height.value}px)`,
    top: `${header.height.value}px`,
  };
});

const modalClass = computed(() => ({ 'modal-open': open.value }));
</script>

<template>
  <dialog :style="style" :class="modalClass" class="modal modal-bottom sm:modal-middle">
    <div ref="dialogRef" class="modal-box">
      <slot name="main">
        <h3 class="text-lg font-bold">
          <slot name="title" />
        </h3>

        <div class="modal-action">
          <slot name="description" />
        </div>
      </slot>
    </div>
  </dialog>
</template>
