<script setup lang="ts">
import { defaultTo } from 'lodash-es';
import { computed, ref } from 'vue';
import { confirm, ConfirmMessage } from '../lib/confirm';

const message = ref<ConfirmMessage>();
const revealed = computed(() => confirm.isRevealed.value);

//Set message on reveal
confirm.onReveal((m: ConfirmMessage) => message.value = defaultTo(m, {}));

const onConfirm = () => {
    confirm.confirm();
};

const onCancel = () => {
    confirm.cancel();
};

</script>

<template>
    <div id="confirm-prompt" class="z-40">
        <Dialog :open="revealed" @close="confirm.cancel">
            <template #title>
                {{ message?.title ?? 'Confirm' }}
            </template>

            <template #description>
                <div :id="message?.title" class="max-w-md w-[75vw] md:w-screen">
                    <p class="modal-description">{{ message?.message }}</p>

                    <p class="hidden modal-text-secondary">{{ message?.message }}</p>

                    <div class="pt-4 join w-full flex justify-end">
                        <button
                            id="modal-btn-confirm" class="btn btn-primary join-item"
                            :class="{ 'btn-error': message?.isWarning }" @click.prevent="onConfirm"
                        >
                            Confirm
                        </button>

                        <button id="modal-btn-cancel" class="btn join-item" @click.prevent="onCancel">Close</button>
                    </div>
                </div>
            </template>
        </Dialog>
    </div>
</template>
