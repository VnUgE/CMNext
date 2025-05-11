<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { ref, computed, toRefs } from 'vue'
import { useEnvSize } from '@vnuge/vnlib.browser'

const emit = defineEmits(['close', 'submit'])
const props = defineProps<{ open: boolean }>()
const { open } = toRefs(props)

const dialogRef = ref(null)

onClickOutside(dialogRef, () => emit('close'))

const { headerHeight } = useEnvSize()

const style = computed(() => {
    return {
        'height': `calc(100vh - ${headerHeight.value}px)`,
        'top': `${headerHeight.value}px`
    }
})

const modalClass = computed(() => ({ 'modal-open': open.value }))

</script>

<template>

    <dialog :style="style" :class="modalClass" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box" ref="dialogRef">
            <slot name="main">
                <h3 as="div" class="text-lg font-bold">
                    <slot name="title"></slot>
                </h3>

                <div class="modal-action">
                    <slot name="description"></slot>
                </div>
            </slot>
        </div>
    </dialog>

</template>
