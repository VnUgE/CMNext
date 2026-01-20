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

import { includes, isArray, isEmpty, join, map } from 'lodash-es';
import { get } from '@vueuse/core';
import { type WebMessage } from "@vnuge/vnlib.browser"
import { type AxiosRequestConfig } from 'axios';
import { type MaybeRef } from 'vue';
import type { PostMeta, ContentMeta, ContentApi, BlogEntity, BlogAdminContext } from "../types";


/**
 * Configures a content api for a given content endpoint and channel
 * @param contentUrl The content endpoint url
 * @param channel The channel to get the content for
 * @returns A content api object
 */
export const useContent = ({ getAxios, baseUrl } : BlogAdminContext, channel: MaybeRef<string>): ContentApi => {

    //Return the url with the channel id query
    const getUrl = (): string => `${baseUrl()}/content?channel=${get(channel)}`;

    const getContentType = (file: File): string => {
        if (isEmpty(file.type)) {
            return 'application/octet-stream'
        }
        if (includes(file.type, 'javascript')) {
            return 'application/javascript'
        }
        if (includes(file.type, 'json')) {
            return 'application/json'
        }
        if (includes(file.type, 'xml')) {
            return 'application/xml'
        }
        return file.type;
    }

    /**
     * Gets the raw content item from the server and returns a string of the content
     * @param cotentId The id of the content to get the raw value of
     * @returns A promise that resolves to the raw content string
     */
    const _getContent = async (cotentId: string): Promise<string> => {
        const { get } = getAxios();
        return get(`${getUrl()}&id=${cotentId}`).then(s => s.data);
    }

    const getPostContent = async (post: BlogEntity): Promise<string> => {
        return await _getContent(post.id);
    }

    const getAllItems = async (): Promise<ContentMeta[]> => {
        const url = getUrl();
        const { get } = getAxios();
        return get(url).then(s => s.data);
    }

    const deleteContent = async (content: ContentMeta | ContentMeta[]): Promise<void> => {
        const { delete: del } = getAxios();

        if(isArray(content)){
            const ids = join(map(content, x => x.id));
            //bulk delete by setting multiple ids
            const { data } = await del(`${getUrl()}&ids=${ids}`);

            //Delete results returns a webmessage that contains the ids of the successfully deleted items
            const deleted = data.getResultOrThrow();
            if(deleted.length !== content.length){
                throw { message: 'Some items failed to delete' }
            }
        }
        else{
            await del(`${getUrl()}&id=${content.id}`);
        }

    }

    const uploadContent = async (file: File, name: string, config?:AxiosRequestConfig): Promise<ContentMeta> => {
        const { put } = getAxios();
        //Endpoint returns the new content meta for the uploaded content
        const { data } = await put<WebMessage<ContentMeta>>(getUrl(), file, {
            ...config,
            headers: {
                'Content-Type': getContentType(file),
                //Set the content name header as the supplied content name
                'X-Content-Name': name
            }
        });
        return data.getResultOrThrow();
    }

    const updatePostContent = async (post: PostMeta, content: string): Promise<ContentMeta> => {
        const { put } = getAxios();

        const { data } = await put<WebMessage<ContentMeta>>(`${getUrl()}&id=${post.id}`, content, {
            headers: {
                'Content-Type': 'text/html',
                //Set the content name header as the post id
                'X-Content-Name': `Content for post ${post.id}`
            }
        });
        return data.getResultOrThrow();
    }

    const updateContent = async (content: ContentMeta, data: File, config?: AxiosRequestConfig): Promise<ContentMeta> => {
        const { put } = getAxios();

        const response = await put<ContentMeta>(`${getUrl()}&id=${content.id}`, data, {
            ...config,
            headers: {
                'Content-Type': getContentType(data),
                //Set the content name header as the supplied content name
                'X-Content-Name': content.name
            }
        });
        return response.data;
    }

    const updateContentName = async (content: ContentMeta, name: string): Promise<ContentMeta> => {
        const { patch } = getAxios();

        //Create a new object with the same properties as the content meta, but with the new name
        const ct = { ...content, name: name }
        const { data } = await patch<WebMessage<ContentMeta>>(getUrl(), ct);
        return data.getResultOrThrow();
    }

    const getPublicUrl = async (content: ContentMeta): Promise<string> => {
        const { get } = getAxios();

        //Get the public url from the server
        const response = await get(`${getUrl()}&id=${content.id}&getlink=true`);

        //Response is a web-message
        if (response.data?.success !== true) {
            throw { response }
        }
        return response.data.result;
    }

    const getContent = async (id: string): Promise<ContentMeta | undefined> => {
        const index = await getAllItems();
        return index.find(x => x.id === id);
    }

    const downloadContent = async (content: ContentMeta): Promise<Blob> => {
        const { get } = getAxios();
        return get(`${getUrl()}&id=${content.id}`, { responseType: 'blob' })
            .then(s => s.data);
    }

    const add = (content: ContentMeta): Promise<ContentMeta> => {
        throw new Error("Content API does not support adding content directly. Use uploadContent instead.");
    }

    const update = (content: ContentMeta): Promise<ContentMeta> => {
        if(!content.name) {
            throw new Error("Content name is required for updating content.");
        }
        return updateContentName(content, content.name!);
    }

    return {
        getPostContent,
        getAllItems,
        delete: deleteContent,
        uploadContent,
        updateContentName,
        updatePostContent,
        updateContent,
        getPublicUrl,
        getContent,
        downloadContent,
        add,
        update,
    };
}
