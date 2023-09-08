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

import { find, isEqual } from 'lodash-es';
import { CMNextApi, CMNextIndex, ChannelMeta } from './types'

export interface ChannelApi extends CMNextApi<ChannelMeta> {
    /**
     * Gets the endpoint url for the channel
     */
    readonly channelFile: string;
}

/**
 * Gets the channel api for the given channel json file url
 * @param endpoint The url of the channel json file
 */
export const createChannelApi = (channelFile: string): ChannelApi => {

    const getIndex = async () : Promise<CMNextIndex<ChannelMeta>> => {
        const res = await fetch(channelFile)
        return await res.json()
    }

    return { channelFile, getIndex }
}

export interface ScopedChannelApi extends ChannelApi {
    /**
     * Gets the post index path for the currently selected channel
     */
    getPostIndexPath(): Promise<string | undefined>;
    /**
     * Gets the content index path for the currently selected channel
     */
    getContentIndexPath(): Promise<string | undefined>;
    /**
     * Gets the base dir for the currently selected channel
     */
    getBaseDir(): Promise<string | undefined>;
    /**
     * Gets the content dir for the currently selected channel
     */
    getContentDir(): Promise<string | undefined>;
}

export const createScopedChannelApi = (channelFile: string, channelId: string): ScopedChannelApi => {

    const channelApi = createChannelApi(channelFile);

    const getSelectedChannel = async (): Promise<ChannelMeta | undefined> => {
        const index = await channelApi.getIndex()
        //Get the selected channel from the channels
        return find(index.records, i => isEqual(i.id, channelId))
    }

    //begin getting the selected channel
    const index = getSelectedChannel();

    const getPostIndexPath = async (): Promise<string | undefined> => {
        //Await the selected channel index
        const channel = await index
        return channel ? `${channel.path}/${channel.index}` : undefined;
    }

    const getContentDir = async (): Promise<string | undefined> => {
        //Await the selected channel index
        const channel = await index
        return channel ? channel.content : undefined;
    }

    const getBaseDir = async (): Promise<string | undefined> => {
        //Await the selected channel index
        const channel = await index
        return channel ? channel.path : undefined;
    }

    const getContentIndexPath = async (): Promise<string | undefined> => {
        //Await the selected channel index
        const channel = await index
        //Get the post index from the channel
        return channel ? `${channel.path}/content.json` : undefined;
    }

    return{
        ...channelApi,
        getBaseDir,
        getContentDir,
        getPostIndexPath,
        getContentIndexPath,
    }
}