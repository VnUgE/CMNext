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

import { computed } from "vue";
import { isEqual, find } from 'lodash-es';
import { apiCall } from "@vnuge/vnlib.browser";
import { PostMeta, ComputedPosts, BlogAdminContext } from "../types";
import { usePostApi } from "./usePost";
import { watchAndCompute } from "../helpers";

/**
 * Creates a computed post api for reactive blog apis
 * @param context The blog admin context
 * @returns The computed post api 
 */
export const useComputedPosts = (context: BlogAdminContext): ComputedPosts => {
    //Post api around the post url and channel
    const postApi = usePostApi(context);

    const { channel, post } = context.getQuery();
    
    //Get all posts
    const items = watchAndCompute([channel, post], async () => {
        return channel.value ? await apiCall(postApi.getPosts) ?? [] : [];
    }, [])

    const selectedItem = computed<PostMeta | undefined>(() => {
        return find(items.value, p => isEqual(p.id, post.value));
    })

    return {
        ...postApi,
        items,
        selectedItem,
        selectedId:post,
        getQuery: context.getQuery
    };
}