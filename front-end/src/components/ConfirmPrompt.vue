<script setup lang="ts">
import { defaultTo } from 'lodash-es'
import { ref } from 'vue'
import { useConfirm } from '@vnuge/vnlib.browser'
import type { ConfirmMessage } from './types'

//Use component side of confirm
const { isRevealed, confirm, cancel, onReveal } = useConfirm()

const message = ref<ConfirmMessage>()

//Set message on reveal
onReveal(m => message.value = defaultTo(m, {}));

</script>

<template>
  <div id="confirm-prompt" class="z-40">
    <Dialog :open="isRevealed" @close="cancel">

      <template v-slot:title>
        {{ message?.title ?? 'Confirm' }}
      </template>

      <template v-slot:description>
        <div class="max-w-md w-[75vw] md:w-screen" :id="message?.id">
          <p class="modal-description">{{ message?.text }}</p>

          <p class="modal-text-secondary">{{ message?.subtext }}</p>

          <div class="pt-4 join w-full flex justify-end">
          
            <button 
              id="modal-btn-confirm" 
              class="btn btn-primary join-item"
              :class="{ 'btn-error': message?.isWarning }" 
              @click.prevent="confirm">
                Confirm
              </button>
          
            <button id="modal-btn-cancel" class="btn join-item" @click.prevent="cancel">Close</button>
          
          </div>
        </div>

      </template>
    </Dialog>
  </div>

</template>
