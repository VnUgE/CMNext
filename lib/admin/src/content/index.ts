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

import { includes, isArray, isEmpty, join, map } from 'lodash-es';
import { get } from '@vueuse/core';
import { type WebMessage } from '@vnuge/vnlib.browser';
import { type AxiosRequestConfig } from 'axios';
import { type MaybeRef } from 'vue';
import type { PostMeta, ContentMeta, ContentApi, BlogEntity, BlogAdminContext } from '../types';

/**
 * Configures a content api for a given content endpoint and channel
 * @param contentUrl The content endpoint url
 * @param channel The channel to get the content for
 * @returns A content api object
 */
export const useContent = (
  { getAxios, baseUrl }: BlogAdminContext,
  channel: MaybeRef<string>
): ContentApi => {
  //Return the url with the channel id query
  const getUrl = (): string => `${baseUrl()}/content?channel=${get(channel)}`;

  const getContentType = (file: File): string => {
    if (isEmpty(file.type)) {
      return 'application/octet-stream';
    }
    if (includes(file.type, 'javascript')) {
      return 'application/javascript';
    }
    if (includes(file.type, 'json')) {
      return 'application/json';
    }
    if (includes(file.type, 'xml')) {
      return 'application/xml';
    }
    return file.type;
  };

  /**
   * Gets the raw content item from the server and returns a string of the content
   * @param contentId The id of the content to get the raw value of
   * @returns The raw content string, or undefined when the server has no
   * body for the id (404 is scoped to non-throwing on this request)
   */
  const _getContent = async (contentId: string): Promise<string | undefined> => {
    const { get: getRequest } = getAxios();
    const { data, status } = await getRequest<string | undefined>(`${getUrl()}&id=${contentId}`, {
      validateStatus: (status) => status === 200 || status === 404,
    });
    return status === 404 ? undefined : data;
  };

  const getPostContent = async (post: BlogEntity): Promise<string | undefined> => {
    return await _getContent(post.id);
  };

  const getAllItems = async (): Promise<ContentMeta[]> => {
    const url = getUrl();
    const { get: getRequest } = getAxios();
    return getRequest(url).then((s) => s.data);
  };

  const deleteContent = async (content: ContentMeta | ContentMeta[]): Promise<void> => {
    const { delete: del } = getAxios();

    if (isArray(content)) {
      const ids = join(map(content, (x) => x.id));
      //bulk delete by setting multiple ids
      const { data } = await del(`${getUrl()}&ids=${ids}`);

      //Delete results returns a webmessage that contains the ids of the successfully deleted items
      const deleted = data.getResultOrThrow();
      if (deleted.length !== content.length) {
        throw { message: 'Some items failed to delete' };
      }
    } else {
      await del(`${getUrl()}&id=${content.id}`);
    }
  };

  const uploadContent = async (
    file: File,
    name: string,
    config?: AxiosRequestConfig
  ): Promise<ContentMeta> => {
    const { put } = getAxios();
    //Endpoint returns the new content meta for the uploaded content
    const { data } = await put<WebMessage<ContentMeta>>(getUrl(), file, {
      ...config,
      headers: {
        'Content-Type': getContentType(file),
        //Set the content name header as the supplied content name
        'X-Content-Name': name,
      },
    });
    return data.getResultOrThrow();
  };

  const updatePostContent = async (post: PostMeta, content: string): Promise<ContentMeta> => {
    const { put } = getAxios();

    const { data } = await put<WebMessage<ContentMeta>>(`${getUrl()}&id=${post.id}`, content, {
      headers: {
        'Content-Type': 'text/html',
        //Set the content name header as the post id
        'X-Content-Name': `Content for post ${post.id}`,
      },
    });
    return data.getResultOrThrow();
  };

  const updateContent = async (
    content: ContentMeta,
    data: File,
    config?: AxiosRequestConfig
  ): Promise<ContentMeta> => {
    const { put } = getAxios();

    const response = await put<WebMessage<ContentMeta>>(`${getUrl()}&id=${content.id}`, data, {
      ...config,
      headers: {
        'Content-Type': getContentType(data),
        //Set the content name header as the supplied content name
        'X-Content-Name': content.name,
      },
    });
    return response.data.getResultOrThrow();
  };

  const updateContentName = async (content: ContentMeta, name: string): Promise<ContentMeta> => {
    const { patch } = getAxios();

    //Create a new object with the same properties as the content meta, but with the new name
    const ct = { ...content, name: name };
    const { data } = await patch<WebMessage<ContentMeta>>(getUrl(), ct);
    return data.getResultOrThrow();
  };

  const getPublicUrl = async (content: ContentMeta): Promise<string> => {
    const { get: getRequest } = getAxios();

    //Get the public url from the server
    const response = await getRequest(`${getUrl()}&id=${content.id}&getlink=true`);

    //Response is a web-message
    if (response.data?.success !== true) {
      throw { response };
    }
    return response.data.result;
  };

  const getContent = async (id: string): Promise<ContentMeta | undefined> => {
    const index = await getAllItems();
    return index.find((x) => x.id === id);
  };

  const downloadContent = async (content: ContentMeta): Promise<Blob> => {
    const { get: getRequest } = getAxios();
    return getRequest(`${getUrl()}&id=${content.id}`, {
      responseType: 'blob',
    }).then((s) => s.data);
  };

  const add = (content: ContentMeta): Promise<ContentMeta> => {
    throw new Error(
      'Content API does not support adding content directly. Use uploadContent instead.'
    );
  };

  const update = (content: ContentMeta): Promise<ContentMeta> => {
    const { name } = content;
    if (!name) {
      throw new Error('Content name is required for updating content.');
    }
    return updateContentName(content, name);
  };

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
};
