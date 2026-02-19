<script setup lang="ts">
import { computed, ref } from 'vue';
import { get, set, whenever } from '@vueuse/core';
import { isEmpty } from 'lodash-es';
import { Converter } from 'showdown';
import Dialog from './Dialog.vue';

const visible = defineModel<boolean>('visible', { required: true });
const content = defineModel<string | undefined>('content', { required: true });

const mdConverter = new Converter();
const mdBuffer = ref('');
const mdBufferEmpty = computed(() => isEmpty(mdBuffer.value.trim()));

const closeDialog = () => set(visible, false);

const onConvertFromMd = () => {
    const mdValue = get(mdBuffer);
    if (isEmpty(mdValue)) {
        return;
    }

    // Convert Markdown to HTML and update content
    set(content, mdConverter.makeHtml(mdValue));

    closeDialog();
};

// Refresh markdown from current content
const onConvertToMd = () => set(mdBuffer, mdConverter.makeMarkdown(content.value || ''));

// Convert current HTML content to Markdown when dialog opens
whenever(visible, onConvertToMd);
whenever(() => !visible.value, () => set(mdBuffer, ''));

</script>

<template>
    <Dialog :open="visible" @close="closeDialog">
        <template #title>
            <fa-icon icon="markdown" class="w-5 h-5 mr-2" />
            Markdown Converter
        </template>

        <template #description>
            <div ref="mdDialog" class="w-full">
                <p class="text-sm text-gray-600 mb-4">
                    Convert between Markdown and HTML content for your post.
                </p>

                <!-- Markdown Textarea -->
                <div class="mb-6 mx-auto w-full max-w-sm">
                    <label class="label block">
                        <span class="label-text font-medium">Markdown Content</span>
                    </label>
                    <textarea
                        v-model="mdBuffer"
                        placeholder="Paste your markdown here or click 'Get Markdown' to convert current content..."
                        class="textarea w-full textarea-bordered h-64 font-mono text-sm"
                    />
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-3 justify-center">
                    <button class="btn btn-ghost" @click="closeDialog">
                        Cancel
                    </button>
                    <button class="btn btn-outline" @click="onConvertToMd">
                        <fa-icon icon="arrow-down" class="w-4 h-4 mr-2" />
                        Get Markdown
                    </button>
                    <button :disabled="mdBufferEmpty" class="btn btn-primary" @click="onConvertFromMd">
                        <fa-icon icon="arrow-up" class="w-4 h-4 mr-2" />
                        Convert to HTML
                    </button>
                </div>
            </div>
        </template>
    </Dialog>
</template>
