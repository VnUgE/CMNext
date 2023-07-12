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

import { useAxios } from '@vnuge/vnlib.browser';
import { isEqual, toSafeInteger } from 'lodash';
import { BlogChannel, ChannelFeed, ChannelApi, BlogAdminContext } from '../types.js'

/**
 * Gets the channel helper api to manage content channels
 */
export const useChannels = (context: BlogAdminContext): ChannelApi => {
    const axios = useAxios(null);

    const getUrl = (): string => context.getChannelUrl();

    const sanitizeNumbers = (channel: BlogChannel): BlogChannel => {
        if (channel.feed) {
            channel.feed.maxItems = isEqual(channel.feed.maxItems, '') ? undefined : toSafeInteger(channel.feed.maxItems);
        }
        return channel;
    }
   
    const getChannels = async (): Promise<BlogChannel[]> => {
        const { data } = await axios.get(getUrl());
        return data;
    }
    
    const deleteChannel = async (channel: BlogChannel) => {
        //Call delete with the channel id query
        await axios.delete(`${getUrl()}?channel=${channel.id}`);
    }
  
    const addChannel = async (channel: BlogChannel, feed?: ChannelFeed): Promise<BlogChannel> => {
        //Clone the item to avoid modifying the original
        const add = sanitizeNumbers({ ...channel, feed });
        //Call post with the channel data
        return await axios.post(getUrl(), add);
    }

    const updateChannel = async (channel: BlogChannel, feed?: ChannelFeed): Promise<BlogChannel> => {
        //Manually assign the feed or null, and clone the item to avoid modifying the original
        const update = sanitizeNumbers({ ...channel, feed });
        //Call put with the channel data
        return await axios.patch(getUrl(), update);
    }

    return { getChannels, deleteChannel, addChannel, updateChannel };
}
