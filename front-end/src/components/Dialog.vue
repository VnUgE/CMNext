<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { ref, computed } from 'vue'
import { useEnvSize } from '@vnuge/vnlib.browser'
import { 
    Dialog,
    DialogPanel,
    DialogTitle,
    DialogDescription,
    TransitionRoot,
    TransitionChild
} from '@headlessui/vue'

const emit = defineEmits(['close', 'submit'])
defineProps<{ open: boolean }>()

const dialogRef = ref(null)

onClickOutside(dialogRef, () => emit('close'))

const { headerHeight } = useEnvSize()

const style = computed(() => {
    return {
        'height': `calc(100vh - ${headerHeight.value}px)`,
        'top': `${headerHeight.value}px`
    }
})

</script>

<template>

    <TransitionRoot :show="$props.open" as="template">
        <Dialog as="div" ref="dialogRef" :style="style" @close="emit('close')" class="modal-entry">

            <TransitionChild enter="duration-100 ease-out" enter-from="opacity-0" enter-to="opacity-100"
                leave="duration-100 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-base-100/80 " aria-hidden="true" />
            </TransitionChild>

            <TransitionChild enter="duration-100 ease-out" enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100" leave="duration-100 ease-in" leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95" as="div" class="relative w-full">

                <div class="modal-content-container">

                    <DialogPanel class="modal modal-open modal-box">
                        <slot name="main">

                            <DialogTitle as="div" class="modal-header font-bold text-lg">
                                <slot name="title"></slot>
                            </DialogTitle>

                            <DialogDescription class="py-4">
                                <slot name="description"></slot>
                            </DialogDescription>
                        </slot>
                    </DialogPanel>

                </div>
            </TransitionChild>
        </Dialog>
    </TransitionRoot>
</template>
