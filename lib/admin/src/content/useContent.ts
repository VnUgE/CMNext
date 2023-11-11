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

import { includes, isArray, isEmpty, join, map } from 'lodash-es';
import { WebMessage } from "@vnuge/vnlib.browser"
import { AxiosRequestConfig } from 'axios';
import { PostMeta, ContentMeta, ContentApi, BlogEntity, BlogAdminContext } from "../types.js";


/**
 * Configures a content api for a given content endpoint and channel
 * @param contentUrl The content endpoint url
 * @param channel The channel to get the content for
 * @returns A content api object
 */
export const useContent = (context : BlogAdminContext): ContentApi => {
    const axios = context.getAxios();

    const { channel } = context.getQuery();

    const getUrl = (): string => {
        const url = context.getContentUrl();
        //Return the url with the channel id query
        return `${url}?channel=${channel.value}`;
    }

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
        const url = getUrl();
        const response = await axios.get(`${url}&id=${cotentId}`);
        return await response.data;
    }

    const getPostContent = async (post: BlogEntity): Promise<string> => {
        return await _getContent(post.id);
    }

    const getAllContent = async (): Promise<ContentMeta[]> => {
        const url = getUrl();
        const response = await axios.get<ContentMeta[]>(url);
        return response.data;
    }

    const deleteContent = async (content: ContentMeta | ContentMeta[]): Promise<void> => {
        const url = getUrl();

        if(isArray(content)){
            const ids = join(map(content, x => x.id));
            //bulk delete by setting multiple ids
            const { data } = await axios.delete<WebMessage<string[]>>(`${url}&ids=${ids}`);
            
            //Delete results returns a webmessage that contains the ids of the successfully deleted items
            const deleted = data.getResultOrThrow();
            if(deleted.length !== content.length){
                throw { message: 'Some items failed to delete' }
            }
        }
        else{
            await axios.delete(`${url}&id=${content.id}`);
        }
       
    }

    const uploadContent = async (file: File, name: string, config?:AxiosRequestConfig): Promise<ContentMeta> => {
        const url = getUrl();
        //Endpoint returns the new content meta for the uploaded content
        const { data } = await axios.put<WebMessage<ContentMeta>>(url, file, {
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
        const url = getUrl();

        const { data } = await axios.put<WebMessage<ContentMeta>>(`${url}&id=${post.id}`, content, {
            headers: {
                'Content-Type': 'text/html',
                //Set the content name header as the post id
                'X-Content-Name': `Content for post ${post.id}`
            }
        });
        return data.getResultOrThrow();
    }

    const updateContent = async (content: ContentMeta, data: File, config?: AxiosRequestConfig): Promise<ContentMeta> => {
        const url = getUrl();

        const response = await axios.put<ContentMeta>(`${url}&id=${content.id}`, data, {
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
        const url = getUrl();

        //Create a new object with the same properties as the content meta, but with the new name
        const ct = { ...content, name: name }
        const { data } = await axios.patch<WebMessage<ContentMeta>>(url, ct);
        return data.getResultOrThrow();
    }

    const getPublicUrl = async (content: ContentMeta): Promise<string> => {
        //Get the public url from the server
        const response = await axios.get(`${getUrl()}&id=${content.id}&getlink=true`);

        //Response is a web-message
        if (response.data?.success !== true) {
            throw { response }
        }
        return response.data.result;
    }

    const getContent = async (id: string): Promise<ContentMeta | undefined> => {
        const index = await getAllContent();
        return index.find(x => x.id === id);
    }

    return {
        getPostContent,
        getAllContent,
        deleteContent,
        uploadContent,
        updateContentName,
        updatePostContent,
        updateContent,
        getPublicUrl,
        getContent
    };
}
