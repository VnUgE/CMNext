import { computed, type MaybeRef, type Ref } from 'vue';
import { toRef } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { type BlogChannel } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import * as yup from 'yup';
import { confirm } from '../../../lib/confirm';
import { toaster } from '../../../main';
import { useEditBuffer } from '../../../lib/editBuffer';
import { BlogAdminState } from '../../../lib/blog';

/**
 * Validation schema for channel fields
 * Only validates user-editable fields
 */
export const channelSchema = yup.object({
    name: yup
        .string()
        .required('Channel name is required')
        .max(64, 'Channel name must be less than 64 characters')
        .matches(/^[a-zA-Z0-9\&\|\.\,\? ]*$/, 'Channel name must be alphanumeric'),
    path: yup
        .string()
        .required('Channel path is required')
        .max(64, 'Channel path must be less than 64 characters'),
    index: yup
        .string()
        .required('Channel index is required')
        .max(64, 'Channel index must be less than 64 characters'),
    content: yup
        .string()
        .required('Channel content directory is required')
        .max(64, 'Channel content directory must be less than 64 characters'),
    feed: yup.object({
        url: yup
            .string()
            .max(100, 'Channel feed url must be less than 100 characters')
            .matches(/^(http|https):\/\/[^ "]+$/, 'Channel feed url must be a valid url')
            .required(),
        path: yup
            .string()
            .max(64, 'Channel feed path must be less than 64 characters')
            .required()
    }).optional()
});

/**
 * Interface defining the channel editor state and actions
 */
export interface ChannelEditorState {
    // Core State
    readonly channelId: Ref<string>;
    readonly channel: Ref<BlogChannel | undefined>;
    readonly channelBuffer: ReturnType<typeof useEditBuffer<BlogChannel>>;

    // Derived State
    readonly isNew: Ref<boolean>;
    readonly feedEnabled: Ref<boolean>;
    readonly isLoading: Ref<boolean>;

    // Actions
    saveChannel: () => Promise<void>;
    deleteChannel: () => Promise<void>;
    revertChanges: () => Promise<void>;
    close: () => void;

    // API State
    readonly waiting: Ref<boolean>;
}

/**
 * Centralized composable for blog channel editor state and operations
 * Manages channel editing, feed configuration, validation, and API interactions
 */
export const useChannelEditor = (
    blog: BlogAdminState,
    channelId: MaybeRef<string>
): ChannelEditorState => {
    
    const router = useRouter();

    const channelIdRef = toRef(channelId);

    // API call state
    const { invoke: apiCall, waiting } = useApiCall({ toaster });

    // Core Channel State
    const channel = blog.channels.single(channelIdRef);

    const isNew = computed(() => !channel.value);
    const isLoading = computed(() => blog.channels.isLoading.value);
    const channelBuffer = useEditBuffer(channel, channelSchema as any);
    const { modified } = channelBuffer;

    const saveChannel = async () => {
        // Validate channel fields
        if (!await channelBuffer.validate()) {
            return;
        }
   
        await apiCall(async () => {
            if (isNew.value) {
                await blog.channels.add(channelBuffer.editBuffer);
                toaster.success('Channel created successfully');
            } else {
                await blog.channels.update(channelBuffer.editBuffer);
                toaster.success('Channel updated successfully');
            }

            // Navigate back to blog dashboard
            await router.push('/blog');
        });
    };

    const deleteChannel = async () => {
        if (isNew.value) return;
        if (!channel.value) return;

        // Confirm deletion
        const { isCanceled } = await confirm({
            title: 'Delete Channel?',
            message: 'Are you sure you want to delete this channel? This action cannot be undone.',
        });

        if (isCanceled) return;

        await apiCall(async () => {
            await blog.channels.delete(channel.value!);
            toaster.success('Channel deleted successfully');
            await router.push('/blog');
        });
    };

    const revertChanges = async () => {
        if (!modified.value) return;

        const { isCanceled } = await confirm({
            title: 'Discard Changes?',
            message: 'Are you sure you want to discard all changes? This action cannot be undone.',
            isWarning: true,
        });

        if (isCanceled) return;

        channelBuffer.revert();
        toaster.info('Changes Reverted', 'All changes have been discarded.');
    };

    const close = async () => {
        if (!channelBuffer.modified) {
            router.push('/blog');
            return;
        }

        const { isCanceled } = await confirm({
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Are you sure you want to close without saving?',
        });
        
        if (isCanceled) return;

        router.push('/blog');
    };

    return {
        // Core State
        channelId: channelIdRef,
        channel,
        channelBuffer,

        // Derived State
        isNew,
        isLoading,
        feedEnabled: computed(() => !!channel.value?.feed?.url),

        // Actions
        saveChannel,
        deleteChannel,
        revertChanges,
        close,

        // API State
        waiting: toRef(() => waiting.value),
    };
};
