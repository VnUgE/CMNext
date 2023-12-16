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

import { isArray, isEqual, toSafeInteger } from 'lodash-es';
import { BlogChannel, ChannelFeed, ChannelApi, BlogAdminContext } from '../types.js'

/**
 * Gets the channel helper api to manage content channels
 */
export const useChannels = (context: BlogAdminContext): ChannelApi => {
    const axios = context.getAxios();

    const getUrl = (): string => context.getChannelUrl();

    const sanitizeNumbers = (channel: BlogChannel): BlogChannel => {
        if (channel.feed) {
            channel.feed.maxItems = isEqual(channel.feed.maxItems, '') ? undefined : toSafeInteger(channel.feed.maxItems);
        }
        return channel;
    }
   
    const deleteChannel = async (channel: BlogChannel) => {
        //Call delete with the channel id query
        await axios.delete(`${getUrl()}?channel=${channel.id}`);
    }
  
    return { 
        async getAllItems() {
            const { data } = await axios.get(getUrl());
            return data;
        },
        
        async add(item: BlogChannel, feed?: ChannelFeed) {
            //Clone the item to avoid modifying the original
            const add = sanitizeNumbers({ ...item, feed });
            //Call post with the channel data
            return await axios.post(getUrl(), add);
        },

        async update(item: BlogChannel, feed?: ChannelFeed){
            //Manually assign the feed or null, and clone the item to avoid modifying the original
            const update = sanitizeNumbers({ ...item, feed });
            //Call put with the channel data
            return await axios.patch(getUrl(), update);
        },
        
        async delete(item: BlogChannel | BlogChannel[]){
            //invoke delete for each item
            if(isArray(item)){
                await Promise.all(item.map(deleteChannel));
            }
            else{
                //Call delete with the channel id query
                await deleteChannel(item)
            }
        },
     };
}
