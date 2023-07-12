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

//Export apis and types
export * from './types';
export * from './ordering'
export * from './feedProperties'
export * from './posts'
export * from './content'
export * from './channels'

import { MaybeRef } from "vue";
import { get } from '@vueuse/core'
import { useRouteQuery } from "@vueuse/router";
import { QueryState, QueryType, SortType, BlogAdminContext } from "./types";

export interface BlogAdminConfig {
    readonly postUrl: MaybeRef<string>;
    readonly contentUrl: MaybeRef<string>;
    readonly channelUrl: MaybeRef<string>;
    readonly defaultPageSize?: number;
}

const createQueryState = (): QueryState => {
    //setup filter search query
    const search = useRouteQuery<string>(QueryType.Filter, '', { mode: 'replace' });

    //Get sort order query
    const sort = useRouteQuery<SortType>(QueryType.Sort, SortType.CreatedTime, { mode: 'replace' });

    //Selected channel id
    const channel = useRouteQuery<string>(QueryType.Channel, '', { mode: 'replace' });

    //Edits are in push mode because they are used to navigate to edit pages

    const channelEdit = useRouteQuery<string>(QueryType.ChannelEdit, '', { mode: 'push' });

    const content = useRouteQuery<string>(QueryType.Content, '', { mode: 'push' });
    //Get the selected post id from the route
    const post = useRouteQuery<string>(QueryType.Post, '', { mode: 'push' });

    return {
        post,
        channel,
        content,
        channelEdit,
        search,
        sort
    }
}

/**
 * Create a blog context object from the given configuration
 * @param param0 The blog configuration object
 * @returns A blog context object to pass to the blog admin components
 */
export const createBlogContext = ({ channelUrl, postUrl, contentUrl }: BlogAdminConfig): BlogAdminContext => {

    const queryState = createQueryState();

    const getQuery = (): QueryState => queryState;

    const getPostUrl = (): string => get(postUrl)

    const getContentUrl = (): string => get(contentUrl)

    const getChannelUrl = (): string => get(channelUrl)

    return{
        getQuery,
        getPostUrl,
        getChannelUrl,
        getContentUrl,
    }
}