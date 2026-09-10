<script setup lang="ts">
// TODO: suneditor was removed (upstream trust downgrade blocked installs).
// This is a placeholder until a replacement rich text editor lands. The
// 'load' and 'mode-change' emits are kept so consumers keep compiling;
// they are never emitted by the placeholder.
defineEmits(['load', 'mode-change']);
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-2 border border-dashed border-base-300 rounded-lg p-12 text-center"
  >
    <fa-icon icon="file-alt" class="w-8 h-8 opacity-40" />
    <p class="font-medium opacity-70">Rich text editor unavailable</p>
    <p class="text-sm opacity-50 max-w-md">
      The content editor was removed and will return in a future update. You can still edit raw
      content through the Markdown dialog.
    </p>
  </div>
</template>
