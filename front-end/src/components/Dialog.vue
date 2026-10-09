<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { ref, computed, toRefs, watchEffect } from 'vue';

const emit = defineEmits<{ close: []; submit: [] }>();
const props = defineProps<{ open: boolean }>();
const { open } = toRefs(props);

const dialog = ref<HTMLDialogElement | null>(null);
const dialogBox = ref<HTMLElement | null>(null);

const modalClass = computed(() => ({ 'modal-open': open.value }));

// Esc must route through the parent: closing natively would desync the
// parent's open state (e.g. useConfirmDialog would stay revealed forever).
const onCancel = (event: Event) => {
  event.preventDefault();
  emit('close');
};

// Backdrop clicks only count while the dialog is actually open
onClickOutside(dialogBox, () => {
  if (open.value) emit('close');
});

// Sync the native dialog with the open prop. The effect tracks both the
// element ref and open, so the mount assignment re-triggers it by itself —
// no separate onMounted needed. The modal-open class stays for daisyUI
// styling. There is no app header to offset from, so no position math needed.
watchEffect(() => {
  const el = dialog.value;
  if (!el) return;
  if (open.value && !el.open) el.showModal();
  else if (!open.value && el.open) el.close();
});
</script>

<template>
  <dialog
    ref="dialog"
    :class="modalClass"
    class="modal modal-bottom sm:modal-middle"
    @cancel="onCancel"
  >
    <div ref="dialogBox" class="modal-box">
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
