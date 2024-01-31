<script setup lang="ts">
import { defaultTo, noop } from 'lodash-es'
import { computed, ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, DialogDescription } from '@headlessui/vue'
import { onClickOutside } from '@vueuse/core'
import { useConfirm, useEnvSize } from '@vnuge/vnlib.browser'

export interface ConfirmMessage {
  title: string
  text: string
  subtext?: string
}

const { headerHeight } = useEnvSize()
//Use component side of confirm
const { isRevealed, confirm, cancel, onReveal } = useConfirm()

const dialog = ref(null)
const message = ref<ConfirmMessage>()

//Cancel prompt when user clicks outside of dialog, only when its open
onClickOutside(dialog, () => isRevealed.value ? cancel() : noop())

//Set message on reveal
onReveal(m => message.value = defaultTo(m, {}));

const style = computed(() => {
  return {
    'height': `calc(100vh - ${headerHeight.value}px)`,
    'top': `${headerHeight.value}px`
  }
})

</script>

<template>
  <div id="confirm-prompt">
    <Dialog class="modal-entry" :style="style" :open="isRevealed" @close="cancel" >
      <div class="modal-content-container">
        <DialogPanel>
          <DialogTitle class="modal-title">
            {{ message?.title ?? 'Confirm' }}
          </DialogTitle>

          <DialogDescription class="modal-description">
            {{ message?.text }}
          </DialogDescription>

          <p class="modal-text-secondary">
            {{ message?.subtext }}
          </p>
          
          <div class="modal-button-container">
            <button class="rounded btn sm primary" @click="confirm">
              Confirm
            </button>
            <button  class="rounded btn sm" @click="cancel">
              Close
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </div>
</template>
