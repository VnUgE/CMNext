import { computed, ref, type MaybeRef, type Ref, type ComputedRef, shallowRef } from 'vue';
import { useToggle, toRef, get, computedAsync } from '@vueuse/core';
import { isString, split, defer, isEmpty } from 'lodash-es';
import { useRouter } from 'vue-router';
import { BlogChannel, PostMeta } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import * as yup from 'yup';
import { useEditBuffer, type EditBuffer } from './editBuffer';
import { toaster } from '../main';
import { confirm } from './confirm';
import type { BlogAdminState } from './blog';

export type ExtendedPostMeta = PostMeta & {
  content?: string;
};

/**
 * Post validation schema
 */
export const postSchema = yup.object({
  title: yup
    .string()
    .required('Post title is required')
    .max(64, 'Post title must be less than 64 characters')
    // eslint-disable-next-line no-useless-escape -- `\/` is required: `/` ends a regex literal
    .matches(/^[a-zA-Z0-9?&|.,\/ -]*$/, 'Post title must be alphanumeric'),
  summary: yup
    .string()
    .required('Post summary is required')
    .max(250, 'Post summary must be less than 250 characters'),
  author: yup
    .string()
    .required('Post author is required')
    .max(64, 'Post author must be less than 64 characters'),
  tags: yup.array().of(yup.string().required()).default([]),
  image: yup
    .string()
    .max(200, 'Post image must be less than 200 characters')
    .matches(/^(http|https):\/\/[^ "]+$/, 'Post image must be a valid http URL')
    .optional(),
  content: yup
    .string()
    .required('Post content is required')
    .max(50000, 'Post content must be less than 50000 characters'),
  id: yup.string().default(''),
  created: yup.number().default(0),
  date: yup.number().default(0),
  name: yup.string().default(''),
  html_description: yup.string().default(''),
  properties: yup.mixed().nullable().default(undefined),
});

export interface PostEditorState {
  // Core State
  readonly channelId: Ref<string>;
  readonly channels: Ref<BlogChannel[]>;
  readonly postId: Ref<string>;
  readonly post: Pick<EditBuffer<ExtendedPostMeta>, 'raw' | 'buffer' | 'modified' | 'errors'>;

  // UI State
  readonly md: {
    readonly visible: Ref<boolean>;
    readonly toggle: (value?: boolean) => boolean;
  };
  readonly podcast: {
    readonly mode: Ref<boolean>;
    readonly toggle: (value?: boolean) => boolean;
  };
  readonly imageLoadError: Ref<boolean>;

  // TODO: retype when the rich text editor replacement lands (suneditor removed).
  readonly sunEditor: Ref<unknown>;

  // Derived State
  readonly isNew: ComputedRef<boolean>;

  // Actions
  savePost: () => Promise<void>;
  deletePost: () => Promise<void>;
  saveDraft: () => Promise<void>;
  revertChanges: () => void;
  navigateBack: () => Promise<void>;
  openPreview: () => void;
  refreshPost: () => Promise<void>;

  // API State
  readonly waiting: Ref<boolean>;
}

/**
 * Centralized composable for blog post editor state and operations
 */
export const usePostEditor = (
  blog: BlogAdminState,
  channelId: MaybeRef<string>,
  postId: MaybeRef<string>
): PostEditorState => {
  const router = useRouter();

  const channelIdRef = toRef(channelId);
  const postIdRef = toRef(postId);

  // API instances scoped to channel
  const postApi = blog.createPostStore(channelIdRef.value);
  const contentApi = blog.createContentStore(channelIdRef.value);

  // API call state
  const { invoke: apiCall, waiting } = useApiCall({ toaster });

  // UI State
  const [mdVisible, toggleMdVisible] = useToggle(false);
  const [podcastMode, togglePodcastMode] = useToggle(false);
  const imageLoadError = ref(false);
  const sunEditor = shallowRef<unknown>();

  // Find single post from loaded posts based on postId
  //const _post = shallowRef<ExtendedPostMeta>({} as ExtendedPostMeta);

  const _single = postApi.single(postIdRef);
  const _post = computedAsync<ExtendedPostMeta>(async () => {
    const v = _single.value;
    if (v?.id) {
      const content = await contentApi.getPostContent(v);
      return { ...v, content };
    }
    return {
      created: 0,
      date: 0,
      id: '',
      title: '',
      summary: '',
    };
  });

  // Edit buffer with validation
  const postBuffer = useEditBuffer(_post, postSchema as any);
  const { modified } = postBuffer;

  // Derived State
  const isNew = computed(() => isEmpty(postBuffer.raw.value?.id));

  const savePost = async () => {
    if (!(await postBuffer.validate())) {
      return;
    }

    const postData: ExtendedPostMeta = {
      ...postBuffer.buffer,
      content: undefined, // Always remove content as it's stored in contentApi
    };

    delete postData.content;

    if (podcastMode.value) {
      postData.html_description = postData.content || '';
    } else {
      delete postData.html_description;
    }

    // Handle tags as comma-separated string or array
    postData.tags = isString(postData.tags)
      ? split(postData.tags as any, ',').map((tag) => tag.trim())
      : postData.tags;

    await apiCall(async () => {
      if (isNew.value) {
        const { title } = await postApi.add(postData);
        toaster.success('Post Created', `Post '${title}' has been created.`);
      } else {
        const { title } = await postApi.update(postData);
        toaster.success('Post Updated', `Post '${title}' has been updated.`);
      }

      // Refresh posts list
      await postApi.refresh();
    });
  };

  const deletePost = async () => {
    if (isNew.value) return;

    const post = get(postBuffer.raw);

    const { isCanceled } = await confirm({
      title: 'Delete Post?',
      message: `Are you sure you want to delete "${post.title}"? This action cannot be undone.`,
    });

    if (isCanceled) return;

    await apiCall(async () => {
      await postApi.delete(post);
      toaster.success('Post Deleted', `Post "${post.title}" has been deleted.`);
      router.push(`/channels/${channelIdRef.value}/posts`);
    });
  };

  const saveDraft = async () => {
    await apiCall(async () => {
      // TODO: Implement draft saving logic
      toaster.success('Draft saved');
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

    postBuffer.revert();
    toaster.info('Changes Reverted', 'All changes have been discarded.');
  };

  const navigateBack = async () => {
    if (!modified.value) {
      router.back();
      return;
    }

    const { isCanceled } = await confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave?',
      isWarning: true,
    });

    if (isCanceled) return;

    router.push(`/channels/${channelIdRef.value}/posts`);
  };

  const openPreview = () => {
    const post = get(postBuffer.raw);

    if (!post.id) {
      toaster.warning('Cannot Preview', 'Please save the post before previewing.');
      return;
    }

    const previewUrl = `/preview/${channelIdRef.value}/${post.id}`;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const refreshPost = async () => {
    await postApi.refresh();
  };

  // Rich text editor content sync removed with suneditor (see TextEditor.vue placeholder).
  // TODO: rewire two-way content sync when the replacement editor lands.

  /**
   * Catch browser/tab close to navigate back properly
   * (preventing unsaved changes loss)
   */
  // window.addEventListener('beforeunload', (event) => {
  //     navigateBack();
  //     event.preventDefault();
  // });

  // Initial blog load
  defer(() => {
    postApi.refresh();
    contentApi.refresh();
  });

  return {
    // Core State
    channelId: channelIdRef,
    channels: blog.channels.all,
    postId: postIdRef,
    post: postBuffer,

    // UI State
    md: {
      visible: mdVisible,
      toggle: toggleMdVisible,
    },
    podcast: {
      mode: podcastMode,
      toggle: togglePodcastMode,
    },

    imageLoadError,
    sunEditor,

    // Derived State
    isNew,

    // Actions
    savePost,
    deletePost,
    saveDraft,
    revertChanges,
    navigateBack,
    openPreview,
    refreshPost,

    // API State
    waiting: toRef(() => waiting.value),
  };
};
