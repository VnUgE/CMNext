import { computed, type MaybeRef, type Ref } from 'vue';
import { toRef } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { type BlogChannel } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import * as yup from 'yup';
import { confirm } from './confirm';
import { toaster } from '../main';
import { useEditBuffer } from './editBuffer';
import { BlogAdminState } from './blog';

/**
 * Validation schema for channel fields
 * Only validates user-editable fields
 */
export const channelSchema = yup.object({
    name: yup
        .string()
        .required('Channel name is required')
        .max(64, 'Channel name must be less than 64 characters')
        .matches(/^[a-zA-Z0-9&|.,? ]*$/, 'Channel name must be alphanumeric'),
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
            .required(),
    }).optional(),
});

/**
 * Interface defining the channel editor state and actions
 */
export interface ChannelEditorState {
    // Core State
    readonly channelId: Ref<string>;
    readonly channel: ReturnType<typeof useEditBuffer<BlogChannel>>;

    // Derived State
    readonly isNew: Ref<boolean>;
    readonly isLoading: Ref<boolean>;

    // Actions
    saveChannel: () => Promise<void>;
    deleteChannel: () => Promise<void>;
    cancelEdit: () => Promise<void>;

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

    const channel = useEditBuffer(blog.channels.single(channelIdRef), channelSchema as any);
    const isNew = computed(() => !channel.raw.value?.id);
    const isLoading = computed(() => blog.channels.isLoading.value);

    const saveChannel = async () => {
        // Validate channel fields
        if (!await channel.validate()) {
            return;
        }
   
        await apiCall(async () => {
            if (isNew.value) {
                await blog.channels.add(channel.buffer);
                toaster.success('Channel created successfully');
            } else {
                await blog.channels.update(channel.buffer);
                toaster.success('Channel updated successfully');
            }

            // Navigate back to blog dashboard
            await router.push('/blog');
        });
    };

    const deleteChannel = async () => {
        if (isNew.value) return;
        if (!channel.raw.value) return;

        // Confirm deletion
        const { isCanceled } = await confirm({
            title: 'Delete Channel?',
            message: 'Are you sure you want to delete this channel? This action cannot be undone.',
        });

        if (isCanceled) return;

        await apiCall(async () => {
            await blog.channels.delete(channel.raw.value!);
            toaster.success('Channel deleted successfully');
            await router.push('/blog');
        });
    };

    const cancelEdit = async () => {

        if (channel.modified.value) {
            const { isCanceled } = await confirm({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Are you sure you want to close without saving?',
            });

            // Dont change page if user canceled
            if (isCanceled) 
                return;
        }

        // Revert any changes before navigating away
        channel.revert();

        if(isNew.value) {
            router.push('/channels');
        } else {
            router.push(`/channels/${channel.raw.value.id}`);
            toaster.info('Changes Reverted', 'All changes have been discarded.');
        }
    };

    window.addEventListener('beforeunload', (event) => {
        if (channel.modified.value) {
            event.preventDefault();
            cancelEdit();
        }
    });

    return {
        // Core State
        channelId: channelIdRef,
        channel,

        // Derived State
        isNew,
        isLoading,

        // Actions
        saveChannel,
        deleteChannel,
        cancelEdit,

        // API State
        waiting: toRef(() => waiting.value),
    };
};
