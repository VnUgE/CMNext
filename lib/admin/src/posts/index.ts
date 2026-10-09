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

import { isArray, orderBy } from 'lodash-es';
import { get } from '@vueuse/core';
import { type WebMessage } from '@vnuge/vnlib.browser';
import { type MaybeRef } from 'vue';
import type { PostMeta, PostApi, BlogAdminContext } from '../types';

/**
 * Gets a reactive post api for the given channel
 * @param context The blog admin context
 * @returns The configured post api
 */
export const usePosts = (
  { baseUrl, getAxios }: BlogAdminContext,
  channel: MaybeRef<string>
): PostApi => {
  //Return the url with the channel id query
  const getUrl = (): string => `${baseUrl()}/posts?channel=${get(channel)}`;

  const deletePost = (post: PostMeta): Promise<void> => {
    const axios = getAxios();
    //Call delete with the post id query
    return axios.delete(`${getUrl()}&post=${post.id}`);
  };

  return {
    async delete(item: PostMeta | PostMeta[]) {
      //invoke delete for each item
      if (isArray(item)) {
        await Promise.all(item.map(deletePost));
      } else {
        //Call delete with the post id query
        await deletePost(item);
      }
    },

    async add(item: PostMeta) {
      const axios = getAxios();
      //Call post with the post data
      const { data } = await axios.post<WebMessage<PostMeta>>(getUrl(), item);
      return data.getResultOrThrow();
    },

    async getAllItems() {
      const axios = getAxios();
      const { data } = await axios.get(getUrl());
      return isArray(data) ? orderBy(data, 'date', 'desc') : [];
    },

    async update(item: PostMeta) {
      const axios = getAxios();
      //Call patch with the updated post content, must have an id set as an existing post
      const { data } = await axios.patch<WebMessage<PostMeta>>(getUrl(), item);
      return data.getResultOrThrow();
    },

    async getSinglePost(postId: string) {
      const axios = getAxios();
      return axios.get(`${getUrl()}&post=${postId}`).then((s) => s.data);
    },
  };
};
