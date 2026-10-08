<script setup lang="ts">
import { ref } from 'vue';
import { get, set, useClipboard, useToggle, whenever } from '@vueuse/core';
import { isEmpty } from 'lodash-es';
import { Converter } from 'showdown';
import Dialog from './Dialog.vue';

const visible = defineModel<boolean>('visible', { required: true });
const content = defineModel<string | undefined>('content', { required: true });

// Optional post title, used to derive the export download filename.
const props = defineProps<{ title?: string }>();

const mdConverter = new Converter();
const [isImport, toggleMode] = useToggle(true);
const importMd = ref('');
const exportMd = ref('');

const { copy, copied, isSupported: clipboardSupported } = useClipboard();

const closeDialog = () => set(visible, false);

// Import: paste Markdown -> convert to HTML -> replace the post content.
const onImport = () => {
  const md = get(importMd);
  if (isEmpty(md.trim())) return;

  set(content, mdConverter.makeHtml(md));
  closeDialog();
};

// Export: regenerate the Markdown view of the current HTML content.
const refreshExport = () => set(exportMd, mdConverter.makeMarkdown(content.value || ''));

const onCopy = async () => {
  const md = get(exportMd);
  if (isEmpty(md)) return;

  await copy(md);
};

const onDownload = () => {
  const md = get(exportMd);
  if (isEmpty(md)) return;

  const slug =
    (props.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'post';

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slug}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

// Reset to Import mode and pre-fill the export buffer each time the dialog opens.
whenever(visible, (open) => {
  if (!open) return;
  toggleMode(true);
  set(importMd, '');
  refreshExport();
});
</script>

<template>
  <Dialog :open="visible" @close="closeDialog">
    <template #title>
      <fa-icon :icon="['fab', 'markdown']" class="w-5 h-5 mr-2" />
      Markdown
    </template>

    <template #description>
      <div class="w-full">
        <!-- Mode switcher -->
        <div class="tabs tabs-box w-fit mb-4">
          <button class="tab" :class="{ 'tab-active': isImport }" @click="toggleMode(true)">
            <fa-icon icon="file-import" class="w-4 h-4 mr-1" />
            Import
          </button>
          <button class="tab" :class="{ 'tab-active': !isImport }" @click="toggleMode(false)">
            <fa-icon icon="file-export" class="w-4 h-4 mr-1" />
            Export
          </button>
        </div>

        <!-- Import: Markdown in -> HTML out (replaces content) -->
        <div v-if="isImport">
          <p class="text-sm text-base-content/70 mb-3">
            Paste Markdown below. Importing replaces the current post content with the converted
            HTML.
          </p>
          <textarea
            v-model="importMd"
            placeholder="Paste your Markdown here..."
            class="textarea textarea-bordered w-full h-48 font-mono text-sm"
          />
          <div class="mt-4 flex justify-end gap-2">
            <button class="btn btn-ghost btn-sm" @click="closeDialog">Cancel</button>
            <button
              class="btn btn-primary btn-sm"
              :disabled="isEmpty(importMd.trim())"
              @click="onImport"
            >
              <fa-icon icon="file-import" class="w-4 h-4 mr-2" />
              Import as HTML
            </button>
          </div>
        </div>

        <!-- Export: HTML in -> Markdown out (copy or download) -->
        <div v-else>
          <p class="text-sm text-base-content/70 mb-3">
            Copy or download the current post content as Markdown.
          </p>
          <textarea
            v-model="exportMd"
            readonly
            class="textarea textarea-bordered w-full h-48 font-mono text-sm bg-base-200"
          />
          <div class="mt-4 flex justify-end gap-2">
            <button
              v-if="clipboardSupported"
              class="btn btn-outline btn-sm"
              :disabled="isEmpty(exportMd) || copied"
              @click="onCopy"
            >
              <fa-icon v-if="copied" icon="check" class="w-4 h-4 mr-2" />
              <fa-icon v-else icon="copy" class="w-4 h-4 mr-2" />
              Copy
            </button>
            <button
              class="btn btn-primary btn-sm"
              :disabled="isEmpty(exportMd)"
              @click="onDownload"
            >
              <fa-icon icon="download" class="w-4 h-4 mr-2" />
              Download .md
            </button>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>
