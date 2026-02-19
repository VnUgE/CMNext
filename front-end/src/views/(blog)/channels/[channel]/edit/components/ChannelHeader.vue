<script setup lang="ts">
import type { ChannelEditorState } from '../../../../../../lib/useChannelEditor';

const props = defineProps<{
    editor: ChannelEditorState;
}>();

const { isNew, waiting, channel, saveChannel, cancelEdit } = props.editor;

const onSave = () => saveChannel();

</script>

<template>
    <div class="my-4 ml-auto">
        <div class="join px-4">
            <button
                :disabled="waiting || !channel.modified.value" class="btn btn-primary join-item"
                form="channel-edit-form" @click.prevent="onSave"
            >
                <span v-if="waiting" class="loading loading-spinner loading-lg" />
                <span v-else>{{ isNew ? 'Create' : 'Save' }}</span>
            </button>
            <button class="btn join-item" @click.prevent="cancelEdit">Cancel</button>
        </div>
    </div>
</template>
