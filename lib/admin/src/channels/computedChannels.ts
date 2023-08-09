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

import { apiCall } from '@vnuge/vnlib.browser';
import { Ref, computed, ref, watch } from 'vue'
import { find, isEmpty, isEqual } from 'lodash-es';
import { BlogChannel, ChannelApi, ComputedBlogApi, BlogAdminContext } from '../types.js'
import { useChannels } from './channels.js';

export interface ComputedChannels extends ChannelApi, ComputedBlogApi<BlogChannel> {
    readonly editChannel: Readonly<Ref<BlogChannel | undefined>>;
}

/**
 * Create a computed channels object to manage channels
 * @param channelUrl the path to the channel api
 * @returns The computed channels object
 */
export const useComputedChannels = (context: BlogAdminContext): ComputedChannels => {

    const channels = useChannels(context)
    const { channel, channelEdit } = context.getQuery()

    const items = ref<BlogChannel[]>([]);

    const loadChannels = async () => {
        items.value = await apiCall(channels.getChannels) ?? [];
    }

    const selectedItem = computed<BlogChannel | undefined>(() => {
        return find(items.value, c => isEqual(c.id, channel.value));
    });

    const editChannel = computed<BlogChannel | undefined>(() => {
        return find(items.value, c => isEqual(c.id, channelEdit.value));
    })

    //Initial load
    loadChannels();

    //Load channels when the edit id changes to empty
    watch(channelEdit, (newId) => isEmpty(newId) ? loadChannels() : null);

    return {
        ...channels,
        items,
        selectedItem,
        editChannel,
        selectedId:channel,
        getQuery: context.getQuery,
    }
}

