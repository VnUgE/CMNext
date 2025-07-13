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

import { isArray, isEqual, toSafeInteger } from 'lodash-es';
import { BlogChannel, ChannelFeed, ChannelApi, BlogAdminContext } from '../types.js'

/**
 * Gets the channel helper api to manage content channels
 */
export const useChannels = ({ getAxios, baseUrl }: BlogAdminContext): ChannelApi => {

    const getUrl = (): string => `${baseUrl()}/channels`;

    const sanitizeNumbers = (channel: BlogChannel): BlogChannel => {
        if (channel.feed) {
            channel.feed.maxItems = isEqual(channel.feed.maxItems, '') ? undefined : toSafeInteger(channel.feed.maxItems);
        }
        return channel;
    }
   
    const deleteChannel = async (channel: BlogChannel) => {
        const axios = getAxios();
        //Call delete with the channel id query
        await axios.delete(`${getUrl()}?channel=${channel.id}`);
    }
  
    return { 
        async getAllItems() {
            const axios = getAxios();
            return axios.get<BlogChannel[]>(getUrl()).then(s => s.data);
        },
        
        async add(item: BlogChannel, feed?: ChannelFeed) {
            const axios = getAxios();
            //Clone the item to avoid modifying the original
            const add = sanitizeNumbers({ ...item, feed });
            //Call post with the channel data
            return axios.post(getUrl(), add);
        },

        async update(item: BlogChannel, feed?: ChannelFeed) {
            const axios = getAxios();
            //Manually assign the feed or null, and clone the item to avoid modifying the original
            const update = sanitizeNumbers({ ...item, feed });
            //Call put with the channel data
            return axios.patch(getUrl(), update);
        },
        
        async delete(item: BlogChannel | BlogChannel[]){
            const axios = getAxios();
            //invoke delete for each item
            if(isArray(item)){
                await Promise.all(item.map(deleteChannel));
            }
            else{
                //Call delete with the channel id query
                await deleteChannel(item)
            }
        }
     };
}
