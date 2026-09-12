import { computed, ref, type MaybeRef, type Ref, type ComputedRef, shallowRef } from 'vue';
import { useToggle, toRef, get, computedAsync, tryOnMounted } from '@vueuse/core';
import { defaultTo, filter, isEmpty, join, split, defer } from 'lodash-es';
import { useRouter } from 'vue-router';
import { type BlogChannel, type FeedProperty, type PostMeta } from '@vnuge/cmnext-admin';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import * as yup from 'yup';
import { useEditBuffer, type EditBuffer } from './editBuffer';
import { toaster } from '../main';
import { confirm } from './confirm';
import { type Equal, type Expect } from './contract';
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
    .max(64, 'Post title must be less than 64 characters')
    // eslint-disable-next-line no-useless-escape -- `\/` is required: `/` ends a regex literal
    .matches(/^[a-zA-Z0-9?&|.,\/ -]*$/, 'Post title must be alphanumeric')
    .required('Post title is required'),
  summary: yup
    .string()
    .required('Post summary is required')
    .max(250, 'Post summary must be less than 250 characters'),
  author: yup
    .string()
    .required('Post author is required')
    .max(64, 'Post author must be less than 64 characters'),
  tags: yup.string().defined().default(''),
  image: yup
    .string()
    .max(200, 'Post image must be less than 200 characters')
    .matches(/^(http|https):\/\/[^ "]+$/, 'Post image must be a valid http URL')
    .optional(),
  content: yup
    .string()
    .required('Post content is required')
    .max(50000, 'Post content must be less than 50000 characters'),
  id: yup.string().defined().default(''),
  created: yup.number().defined().default(0),
  date: yup.number().defined().default(0),
  name: yup.string().defined().default(''),
  html_description: yup.string().defined().default(''),
  properties: yup.mixed<FeedProperty[]>().nullable().default(undefined),
});

/**
 * Form model for the post editor. The wire requires only `image` to stay
 * optional; title/summary/author are required by the form even though the
 * wire leaves them optional. Tags are a comma-separated string in the form
 * and an array on the wire.
 */
export interface PostFormData
  extends Pick<PostMeta, 'image'>, Required<Pick<PostMeta, 'title' | 'summary' | 'author'>> {
  tags: string;
  content: string;
  id: string;
  created: number;
  date: number;
  name: string;
  html_description: string;
  properties?: FeedProperty[] | null | undefined;
}

// The `.defined()` chains below accept '' (a new post has an empty id) while
// still requiring the key. That keeps yup's `OptionalKeys` bookkeeping inside
// `InferType`, so the pin maps over the form's own keys instead of comparing
// whole types: it still fails on renames, removals, and type drift, but a
// brand-new schema field must be added to the form and mappers by hand.
export type AssertPostForm = Expect<
  Equal<
    { [K in keyof PostFormData]: PostFormData[K] },
    { [K in keyof PostFormData]: yup.InferType<typeof postSchema>[K] }
  >
>;

/**
 * Maps a wire post to the form model, joining tags and filling the fields
 * the wire may omit.
 */
export const toPostForm = (post?: ExtendedPostMeta): PostFormData => ({
  title: defaultTo(post?.title, ''),
  summary: defaultTo(post?.summary, ''),
  author: defaultTo(post?.author, ''),
  image: post?.image,
  tags: join(defaultTo(post?.tags, []), ', '),
  content: defaultTo(post?.content, ''),
  id: defaultTo(post?.id, ''),
  created: defaultTo(post?.created, 0),
  date: defaultTo(post?.date, 0),
  name: defaultTo(post?.name, ''),
  html_description: defaultTo(post?.html_description, ''),
  properties: defaultTo(post?.properties, undefined),
});

/**
 * Maps the form model back to the wire, splitting the tags string and
 * dropping empty entries.
 */
export const fromPostForm = (form: PostFormData, source?: PostMeta): ExtendedPostMeta => {
  const tags = filter(
    split(defaultTo(form.tags, ''), ',').map((tag) => tag.trim()),
    (tag) => !isEmpty(tag)
  );
  return {
    ...source,
    ...form,
    tags,
    properties: defaultTo(form.properties, undefined),
  };
};

export interface PostEditorState {
  // Core State
  readonly channelId: Ref<string>;
  readonly channels: Ref<BlogChannel[]>;
  readonly postId: Ref<string>;
  readonly post: Pick<EditBuffer<PostFormData>, 'raw' | 'buffer' | 'modified' | 'errors'>;

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
  const postApi = blog.createPostStore(channelIdRef);
  const contentApi = blog.createContentStore(channelIdRef);

  // API call state
  const { invoke: apiCall, waiting } = useApiCall({ toaster });

  // UI State
  const [mdVisible, toggleMdVisible] = useToggle(false);
  const [podcastMode, togglePodcastMode] = useToggle(false);
  const imageLoadError = ref(false);
  const sunEditor = shallowRef<unknown>();

  // Find single post from loaded posts based on postId
  const _single = postApi.single(postIdRef);
  const _post = computedAsync<PostFormData>(async () => {
    const v = _single.value;
    if (v?.id) {
      // Posts without a saved body (including old posts) resolve to
      // undefined from the api and load as an empty body
      const content = defaultTo(await contentApi.getPostContent(v), '');
      return toPostForm({ ...v, content });
    }
    return toPostForm(undefined);
  });

  // Edit buffer with validation
  const postBuffer = useEditBuffer(_post, postSchema);
  const { modified } = postBuffer;

  // Derived State
  const isNew = computed(() => isEmpty(postBuffer.raw.value?.id));

  const savePost = async () => {
    if (!(await postBuffer.validate())) {
      return;
    }

    const postData: ExtendedPostMeta = {
      ...fromPostForm(postBuffer.buffer),
      content: undefined, // Always remove content as it's stored in contentApi
    };

    delete postData.content;

    if (podcastMode.value) {
      postData.html_description = postData.content || '';
    } else {
      delete postData.html_description;
    }

    await apiCall(async () => {
      if (isNew.value) {
        // Create the post first: the returned meta carries the server id
        // the content endpoint needs
        const created = await postApi.add(postData);

        await contentApi.updatePostContent(created, postBuffer.buffer.content);

        toaster.success('Post Created', `Post '${created.title}' has been created.`);
      } else {
        const { title } = await postApi.update(postData);

        await contentApi.updatePostContent(postData, postBuffer.buffer.content);

        toaster.success('Post Updated', `Post '${title}' has been updated.`);
      }

      // Refresh posts list
      await postApi.refresh();
    });
  };

  const deletePost = async () => {
    if (isNew.value) return;

    const post = fromPostForm(get(postBuffer.raw));

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
