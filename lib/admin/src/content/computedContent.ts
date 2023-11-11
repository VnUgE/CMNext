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

import { Ref, computed, ref } from "vue";
import { find, filter, includes, isEqual, isNil, toLower } from 'lodash-es';
import { apiCall } from "@vnuge/vnlib.browser"
import { ContentMeta, BlogEntity, ContentApi, ComputedBlogApi, BlogAdminContext } from "../types.js";
import { watchAndCompute } from "../helpers.js";
import { useContent } from "./useContent.js";

export interface ComputedContent extends ContentApi, ComputedBlogApi<ContentMeta> {
    /**
     * Gets the raw content for a the currently selected post
     */
    getSelectedPostContent(): Promise<string | undefined>;
    /**
     * Filter post items by the given reactive filter
     * @param filter The reactive filter used to filter the content
     */
    createReactiveSearch(filter: Ref<string>): Ref<ContentMeta[] | undefined>;
    /**
     * triggers a refresh of the content
     */
    refresh(): void
}

/**
 * Gets a computed object with the content and selected content
 * @param context The blog admin context
 * @returns A computed object with the content and selected content
 */
export const useComputedContent = (context: BlogAdminContext): ComputedContent => {

    //Get the content api from the context
    const contentApi = useContent(context);
    const trigger = ref(0);

    const { content, post, channel } = context.getQuery();

    //Watch for channel and selected id changes and get the content
    const items = watchAndCompute([channel, content, post, trigger], async () => {
        //Get all content if the channel is set, otherwise return empty array
        return channel.value ? await apiCall(contentApi.getAllContent) ?? [] : [];
    }, []);

    const selectedItem = computed<ContentMeta | undefined>(() => {
        if (!isNil(channel.value) && content.value && content.value !== 'new') {
            return find(items.value, c => isEqual(c.id, content.value));
        }
        return {} as ContentMeta;
    })

    const getSelectedPostContent = async (): Promise<string | undefined> => {
        if (!isNil(channel.value) && post.value && post.value !== 'new') {
            return await apiCall(() => contentApi.getPostContent({ id: post.value } as BlogEntity));
        }
        return '';
    }

    const createReactiveSearch = (sec: Ref<string>): Ref<ContentMeta[] | undefined> => {
        return computed(() => {
            return filter(items.value, c => includes(toLower(c.name), toLower(sec.value)) || includes(toLower(c.id), toLower(sec.value)));
        })
    }

    const refresh = () => {
        trigger.value++;
    }

    return {
        ...contentApi,
        items,
        selectedItem,
        getSelectedPostContent,
        createReactiveSearch,
        selectedId: content,
        getQuery: context.getQuery,
        refresh
    };
}
