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

import { isArray, orderBy } from "lodash";
import { WebMessage, useAxios } from "@vnuge/vnlib.browser"
import { PostMeta, PostApi, BlogAdminContext } from "../types";

/**
 * Gets a reactive post api for the given channel
 * @param context The blog admin context
 * @returns The configured post api
 */
export const usePostApi = (context : BlogAdminContext): PostApi => {
    const axios = useAxios(null);

    const { channel } = context.getQuery();

    const getUrl = (): string => {
        const url = context.getPostUrl();
        //Return the url with the channel id query
        return `${url}?channel=${channel.value}`;
    }

    const getPosts = async (): Promise<PostMeta[]> => {
        const { data } = await axios.get(getUrl());
        return isArray(data) ? orderBy(data, 'date', 'desc') : [];
    }

    const deletePost = (post: PostMeta): Promise<void> => {
        //Call delete with the post id query
        return axios.delete(`${getUrl()}&post=${post.id}`);
    }

    const publishPost = async (post: PostMeta): Promise<PostMeta> => {
        //Call post with the post data
        const { data } = await axios.post<WebMessage<PostMeta>>(getUrl(), post);
        return data.getResultOrThrow();
    }

    const updatePost = async (post: PostMeta): Promise<PostMeta> => {
        //Call patch with the updated post content, must have an id set as an existing post
        const { data } = await axios.patch<WebMessage<PostMeta>>(getUrl(), post);
        return data.getResultOrThrow();
    }

    const getSinglePost = async (postId: string): Promise<PostMeta> => {
        const { data } = await axios.get(`${getUrl()}&post=${postId}`);
        return data;
    }

    return { 
        getPosts,
        deletePost,
        publishPost,
        updatePost,
        getSinglePost
    };
}