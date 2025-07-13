// Copyright (C) 2025 Vaughn Nugent
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

import 'pinia'
import { type MaybeRef, type Ref, ref } from 'vue';
import { type PiniaPluginContext, PiniaPlugin } from 'pinia'
import { type AxiosProgressEvent } from 'axios';
import { useAxios } from '@vnuge/vnlib.browser';
import { useAsyncState } from '@vueuse/core';
import { find as _find } from 'lodash-es'
import { 
    usePosts, useContent, useChannels, createBlogContext, 
    type BlogChannel, type ChannelApi, type PostApi, type PostMeta, type ContentApi,
    type ContentMeta,
} from '@vnuge/cmnext-admin';

export interface ReactiveBlogStore<T> {
    readonly all: Readonly<T[]>
    readonly isLoading: Readonly<boolean>;
    readonly isReady: Readonly<boolean>;
    refresh(): Promise<T[]>;
}

export interface BlogAdminState{
    readonly uploadProgress: number;
    readonly channels: ReactiveBlogStore<BlogChannel> & ChannelApi;   
    createPostStore(channelId: MaybeRef<string>): ReactiveBlogStore<PostMeta> & PostApi;
    createContentStore(channelId: MaybeRef<string>): ReactiveBlogStore<ContentMeta> & ContentApi;
}

declare module 'pinia' {
    export interface PiniaCustomProperties extends BlogAdminState {
    }
}

type BlogEntity = BlogChannel | PostMeta | ContentMeta;
interface BlogStore<T extends BlogEntity> {
    getAllItems(): Promise<T[]>;
}

export const cmnextAdminPlugin = (adminBaseUrl: string): PiniaPlugin => {

    return ({}: PiniaPluginContext): BlogAdminState => {

        const uploadProgress = ref<number>(0)

        const axios = useAxios({
            onUploadProgress: (e: AxiosProgressEvent) => {
                uploadProgress.value = Math.round((e.loaded * 100) / e.total!)
            },
            //Set to 60 second timeout
            timeout: 60 * 1000
        })

        const blogContext = createBlogContext({ axios, baseUrl: adminBaseUrl })

        const createStore = <T extends BlogEntity, TStore extends BlogStore<T>>(store: TStore) => 
        {
            const { state: all, execute: refresh, isLoading, isReady } = useAsyncState(
                async () => (await store.getAllItems()) || [],
                [],
                { delay: 100, immediate: true, resetOnExecute: true }
            );

            return { all, isLoading, isReady, refresh, ...store }
        }

        const createChannelsStore = () => {
            const blogChannels = useChannels(blogContext);
            return createStore(blogChannels);
        }

        const createPostStore = (channelId: MaybeRef<string>)=> {
            const postStore = usePosts(blogContext, channelId);
            return createStore(postStore);
        }

        const createContentStore = (channelId: MaybeRef<string>)=> {
            const contentStore = useContent(blogContext, channelId);
            return createStore(contentStore);
        }
     
        return {
            uploadProgress: uploadProgress,
            channels: createChannelsStore(),
            createPostStore,
            createContentStore
        } as any as BlogAdminState;
    }
} 