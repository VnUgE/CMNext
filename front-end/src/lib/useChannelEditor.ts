import { computed, onUnmounted, type MaybeRef, type Ref } from 'vue';
import { get, toRef } from '@vueuse/core';
import { defaultTo } from 'lodash-es';
import { useRouter } from 'vue-router';
import { type BlogChannel, type ChannelFeed } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import * as yup from 'yup';
import { confirm } from './confirm';
import { toaster } from '../main';
import { useEditBuffer, type EditBuffer } from './editBuffer';
import { BlogAdminState } from './blog';
import { type Equal, type Expect } from './contract';

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
    .max(64, 'Channel path must be less than 64 characters')
    .test(
      'no-leading-slash',
      'The channel directory must not start with a forward slash',
      (value) => !value || (!value.startsWith('/') && !value.startsWith('\\'))
    )
    .matches(/^[a-zA-Z0-9_\-/]+$/, 'The channel directory is not valid'),
  index: yup
    .string()
    .required('Channel index is required')
    .max(64, 'Channel index must be less than 64 characters')
    .test(
      'no-leading-slash',
      'The index file path must not contain a leading slash',
      (value) => !value || (!value.startsWith('/') && !value.startsWith('\\'))
    )
    .matches(/^[a-zA-Z0-9_.-]+$/, 'The index file name is not valid'),
  content: yup
    .string()
    .required('Channel content directory is required')
    .max(64, 'Channel content directory must be less than 64 characters')
    .test(
      'no-leading-slash',
      'The content directory must not start with a forward slash',
      (value) => !value || (!value.startsWith('/') && !value.startsWith('\\'))
    )
    .matches(/^[a-zA-Z0-9_\-/]+$/, 'The content directory is not valid'),
  feed: yup
    .object({
      url: yup
        .string()
        .max(200, 'Channel feed url must be less than 200 characters')
        .matches(/^(http|https):\/\/[^ "]+$/, 'Channel feed url must be a valid url')
        .required(),
      path: yup
        .string()
        .max(200, 'Channel feed path must be less than 200 characters')
        .test(
          'no-leading-slash',
          'The feed file path must not contain a leading slash',
          (value) => !value || (!value.startsWith('/') && !value.startsWith('\\'))
        )
        .matches(/^[a-zA-Z0-9_.-]+$/, 'The feed file name is not valid')
        .required(),
      description: yup
        .string()
        .max(200, 'Channel feed description must be less than 200 characters')
        .required('Channel feed description is required'),
      maxItems: yup
        .number()
        .integer('Max feed items must be a whole number')
        .min(1, 'Max feed items must be at least 1')
        .max(100, 'Max feed items must be at most 100')
        .required('Max feed items is required')
        .default(20),
      // Custom feed properties are edited as opaque XML data in FeedFields,
      // so they pass through unvalidated like the post schema does.
      properties: yup.mixed<FeedProperty[]>().optional().default(undefined),
    })
    // The explicit default is load-bearing: yup still descends into an
    // absent/undefined nested object and fails its required children, so
    // without it a disabled feed can never validate
    .optional()
    .default(undefined),
});

/**
 * The channel form model: exactly what the schema validates. Composed from
 * the wire types (no duplicated field declarations) and narrowed to what
 * the user can edit — no id/date passthrough. The assertion below pins it
 * to the schema so the two cannot drift.
 */
export type ChannelFeedFormData = Pick<ChannelFeed, 'url' | 'path'>;

export interface ChannelFormData extends Pick<BlogChannel, 'name' | 'path' | 'index'> {
  content: string;
  feed?: ChannelFeedFormData;
}

export type AssertChannelForm = Expect<Equal<ChannelFormData, yup.InferType<typeof channelSchema>>>;

/**
 * Maps a wire channel to editable form data. Server-assigned fields
 * (id/date) stay out of the form; display fallbacks guard missing values.
 */
const toChannelForm = (channel: BlogChannel): ChannelFormData => ({
  name: defaultTo(channel.name, ''),
  path: defaultTo(channel.path, ''),
  index: defaultTo(channel.index, ''),
  content: defaultTo(channel.content, ''),
  feed: channel.feed
    ? { url: defaultTo(channel.feed.url, ''), path: defaultTo(channel.feed.path, '') }
    : undefined,
});

/**
 * Maps validated form data back to the wire shape, preserving
 * server-assigned fields (id/date) and untouched feed fields from the
 * source entity. For new channels there is no source, so id/date stay
 * absent and the server assigns them — matching previous behavior.
 */
const fromChannelForm = (form: ChannelFormData, source?: BlogChannel): BlogChannel => {
  const buf = { ...source, ...form };

  if (form.feed) {
    buf.feed = {
      ...source?.feed,
      url: form.feed.url,
      path: form.feed.path,
    };
  }

  return buf as BlogChannel;
};

/**
 * Interface defining the channel editor state and actions
 */
export interface ChannelEditorState {
  // Core State
  readonly channelId: Ref<string>;
  readonly channel: EditBuffer<ChannelFormData>;

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

  // Wire entity (identity for isNew/save/delete) and typed form buffer
  const source = blog.channels.single(channelIdRef);
  const initial = computed<ChannelFormData | undefined>(() =>
    source.value ? toChannelForm(source.value) : undefined
  );
  const channel = useEditBuffer(initial, channelSchema);
  const isNew = computed(() => !source.value?.id);
  const isLoading = computed(() => blog.channels.isLoading.value);

  const saveChannel = async () => {
    // Validate channel fields
    if (!(await channel.validate())) {
      console.error('Form failed validation');
      return;
    }

    await apiCall(async () => {
      if (isNew.value) {
        await blog.channels.add(fromChannelForm(channel.buffer));
        toaster.success('Channel created successfully');
      } else {
        await blog.channels.update(fromChannelForm(channel.buffer, source.value));
        toaster.success('Channel updated successfully');
      }

      // Navigate back to blog dashboard
      await router.push('/channels');
    });
  };

  const deleteChannel = async () => {
    if (isNew.value) return;

    const sourceChannel = get(source);
    if (!sourceChannel) return;

    // Confirm deletion
    const { isCanceled } = await confirm({
      title: 'Delete Channel?',
      message: 'Are you sure you want to delete this channel? This action cannot be undone.',
    });

    if (isCanceled) return;

    await apiCall(async () => {
      await blog.channels.delete(sourceChannel);
      toaster.success('Channel deleted successfully');
      await router.push('/channels');
    });
  };

  const cancelEdit = async () => {
    if (channel.modified.value) {
      const { isCanceled } = await confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to close without saving?',
      });

      // Dont change page if user canceled
      if (isCanceled) return;
    }

    // Revert any changes before navigating away
    channel.revert();

    if (isNew.value) {
      router.push('/channels');
    } else {
      router.push(`/channels/${channelIdRef.value}`);
      toaster.info('Changes Reverted', 'All changes have been discarded.');
    }
  };

  // Prompt on tab close/reload while edits are unsaved. Prompt-only: no
  // navigation here, the in-app cancelEdit flow handles route changes.
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (channel.modified.value) {
      event.preventDefault();
    }
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload));

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
