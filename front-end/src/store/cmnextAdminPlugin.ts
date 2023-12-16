// Copyright (C) 2023 Vaughn Nugent
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
import { MaybeRef, Ref, computed, ref, toRef } from 'vue';
import { PiniaPluginContext, PiniaPlugin } from 'pinia'
import { find, isEqual } from 'lodash-es';
import { useRouter } from 'vue-router';
import { useContent, ContentApi, ContentMeta,  
    PostMeta, PostApi, BlogChannel, ChannelApi, usePosts, useChannels, 
    createBlogContext
} from '@vnuge/cmnext-admin';
import { useRouteQuery } from '@vueuse/router';
import { useAxios } from '@vnuge/vnlib.browser';
import { useScriptTag } from '@vueuse/core';
import { type ReactiveBlogStore, createReactiveBlogApi, QueryType, SortType } from './sharedTypes';
import { AxiosProgressEvent } from 'axios';

export type PostStore = ReactiveBlogStore<PostMeta> & PostApi

export interface ChannelStore extends ReactiveBlogStore<BlogChannel>, ChannelApi {
    editId: string
    readonly editChannel: BlogChannel | undefined;
}

export interface ContentStore extends ReactiveBlogStore<ContentMeta>, ContentApi {
}

export interface BlogAdminState{
    content: ContentStore
    posts: PostStore
    channels: ChannelStore
    uploadProgress: number;
    waitForEditor(): Promise<void>;
    queryState:{
        sort: SortType;
        search: string;
        pageSize: number;
    }
}

declare module 'pinia' {
    export interface PiniaCustomProperties extends BlogAdminState {
    }
}

export const cmnextAdminPlugin = (router: ReturnType<typeof useRouter>, ckEditorUrl: string, pageSize: MaybeRef<number>): PiniaPlugin => {

    return ({ store }: PiniaPluginContext): BlogAdminState => {

        //setup filter search query
        const search = useRouteQuery<string>(QueryType.Filter, '', { mode: 'replace', router });

        //Get sort order query
        const sort = useRouteQuery<SortType>(QueryType.Sort, SortType.CreatedTime, { mode: 'replace', router });

        const uploadProgress = ref<number>(0)

        const axios = useAxios({
            onUploadProgress: (e: AxiosProgressEvent) => {
                uploadProgress.value = Math.round((e.loaded * 100) / e.total!)
            },
            //Set to 60 second timeout
            timeout: 60 * 1000
        })

        const initCkEditor = () => {
            //Setup cke editor
            if ('CKEDITOR' in window === false) {
                //Load scripts
                const ckEditorTag = useScriptTag(ckEditorUrl)
                //Store the wait result on the window for the editor script to wait
                const loadPromise = ckEditorTag.load(true);

                return async (): Promise<void> => {
                    await loadPromise;
                }
            }
            return (): Promise<void> => Promise.resolve()
        }

        const blogContext = createBlogContext({
            axios,
            channelUrl: '/blog/channels',
            postUrl: '/blog/posts',
            contentUrl: '/blog/content',
        })

        const channels = (() => {

            //Create channel api
            const api = createReactiveBlogApi<BlogChannel, ChannelApi>(
                useChannels(blogContext),
                {
                    query: QueryType.Channel,
                    channelId: undefined,
                    router,
                    sort,
                    search,
                    pageSize
                }
            )

            //route query for the selected channel
            const editId = useRouteQuery<string>(QueryType.ChannelEdit, '', { mode: 'push', router });

            //Compute the selected items from their ids
            const editChannel = computed<BlogChannel | undefined>(() => find(api.all.value, c => isEqual(c.id, editId.value)))

            return{
                ...api,
                editId,
                editChannel
            }
        })()

        const getContentStore = (): ContentStore => {
            //Create post api
            return createReactiveBlogApi<ContentMeta, ContentApi>(
                useContent(blogContext, channels.selectedId),
                {
                    query: QueryType.Content,
                    channelId: toRef(channels.selectedId),
                    router,
                    sort,
                    search,
                    pageSize
                },
            )
        }

        const getPostStore = (): PostStore => {

            //Create post api
            return createReactiveBlogApi<PostMeta, PostApi>(
                usePosts(blogContext, channels.selectedId),
                {
                    query: QueryType.Post,
                    channelId: toRef(channels.selectedId),
                    router,
                    sort,
                    search,
                    pageSize
                }
            )
        }

        //Load the editor script
        const waitForEditor = initCkEditor()

        return {
            content: getContentStore(),
            posts: getPostStore(),
            channels,
            uploadProgress,
            waitForEditor,
            queryState: {
                sort,
                search,
                pageSize
            }
        }
    }
} 