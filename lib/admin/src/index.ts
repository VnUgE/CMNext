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

export * from './ordering'
export * from './feedProperties'
export { usePosts } from './posts'
export { useContent } from './content'
export { useChannels } from './channels'

export type * from './types';

import { get } from '@vueuse/core'
import type { MaybeRef } from "vue";
import type { BlogAdminContext } from "./types";
import type { Axios } from 'axios';

export interface BlogAdminConfig {
    readonly axios: Axios;
    readonly postUrl: MaybeRef<string>;
    readonly contentUrl: MaybeRef<string>;
    readonly channelUrl: MaybeRef<string>;
    readonly defaultPageSize?: number;
}

/**
 * Create a blog context object from the given configuration
 * @param param0 The blog configuration object
 * @returns A blog context object to pass to the blog admin components
 */
export const createBlogContext = ({ channelUrl, postUrl, contentUrl, axios }: BlogAdminConfig): BlogAdminContext => {

    const getAxios = (): Axios => axios;

    const getPostUrl = (): string => get(postUrl)

    const getContentUrl = (): string => get(contentUrl)

    const getChannelUrl = (): string => get(channelUrl)

    return{
        getAxios,
        getPostUrl,
        getChannelUrl,
        getContentUrl,
    }
}