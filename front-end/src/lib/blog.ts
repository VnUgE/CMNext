// Copyright (C) 2026 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import 'pinia';
import { type MaybeRef, type Ref, ref, toRef } from 'vue';
import { type AxiosProgressEvent } from 'axios';
import { ApiConfig, useAxios } from '@vnuge/vnlib.browser';
import { useArrayFind, useAsyncState } from '@vueuse/core';

import {
    usePosts,
    useContent,
    useChannels,
    createBlogContext,
    type BlogChannel,
    type ChannelApi,
    type PostApi,
    type PostMeta,
    type ContentApi,
    type ContentMeta,
} from '@vnuge/cmnext-admin';

export interface ReactiveBlogStore<T> {
    readonly all: Ref<T[]>;
    readonly isLoading: Ref<boolean>;
    readonly isReady: Ref<boolean>;
    single(id: MaybeRef<string>): Ref<T | undefined>;
    refresh(): Promise<T[]>;
}

export interface BlogAdminState {
    readonly uploadProgress: Ref<number>;
    readonly channels: ReactiveBlogStore<BlogChannel> & ChannelApi;
    createPostStore(channelId: MaybeRef<string>): ReactiveBlogStore<PostMeta> & PostApi;
    createContentStore(channelId: MaybeRef<string>): ReactiveBlogStore<ContentMeta> & ContentApi;
}

type BlogEntity = BlogChannel | PostMeta | ContentMeta;
interface BlogStore<T extends BlogEntity> {
    getAllItems(): Promise<T[]>;
}

export const useCmnextAdmin = (vnlib: ApiConfig, adminBaseUrl: string): BlogAdminState => {

    const uploadProgress = ref<number>(0);

    const axios = useAxios(vnlib, {
        onUploadProgress: (e: AxiosProgressEvent) => {
            uploadProgress.value = Math.round((e.loaded * 100) / e.total!);
        },
        timeout: 120000, //120 second timeout
    });

    const blogContext = createBlogContext({ axios, baseUrl: adminBaseUrl });

    const createStore = <T extends BlogEntity, TStore extends BlogStore<T>>(store: TStore)
    : ReactiveBlogStore<T> & TStore => {
        const { state: all, execute: refresh, isLoading, isReady } = useAsyncState(
            async () => (await store.getAllItems()) || [],
            [],
            { delay: 100, immediate: true, resetOnExecute: false }
        );

        const single = (id: MaybeRef<string>): Ref<T | undefined> => {
            const _id = toRef(id);
            return useArrayFind(all, c => c.id == _id.value);
        };

        return { all, isLoading, isReady, refresh, single, ...store };
    };

    const createChannelsStore = (): ReactiveBlogStore<BlogChannel> & ChannelApi => {
        const blogChannels = useChannels(blogContext);
        return createStore(blogChannels);
    };

    const createPostStore = (channelId: MaybeRef<string>): ReactiveBlogStore<PostMeta> & PostApi => {
        const postStore = usePosts(blogContext, channelId);
        return createStore(postStore);
    };

    const createContentStore = (channelId: MaybeRef<string>): ReactiveBlogStore<ContentMeta> & ContentApi => {
        const contentStore = useContent(blogContext, channelId);
        return createStore(contentStore);
    };

    return {
        uploadProgress: uploadProgress,
        channels: createChannelsStore(),
        createPostStore,
        createContentStore,
    };
}; 