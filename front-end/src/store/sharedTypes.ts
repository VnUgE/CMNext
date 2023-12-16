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

import { type BlogEntity, type NamedBlogEntity, useFilteredPages, SortedFilteredPaged } from "@vnuge/cmnext-admin";
import { MaybeRef, Ref } from "vue";
import { computed, shallowRef, watch } from 'vue';
import { apiCall } from '@vnuge/vnlib.browser';
import { useToggle } from '@vueuse/core';
import { filter, find, includes, isEmpty, isEqual, toLower } from 'lodash-es';
import type { Router } from 'vue-router';
import { useRouteQuery } from '@vueuse/router';

export enum QueryType {
    Post = 'post',
    Channel = 'channel',
    Content = 'content',
    ChannelEdit = 'ecid',
    Filter = 'filter',
    Sort = 'sort',
    PageSize = 'size',
}

export enum SortType {
    CreatedTime = 'created',
    ModifiedTime = 'date',
}

export interface ReactiveBlogStore<T> {
    readonly all: T[];
    selectedId: string;
    readonly selected : T | undefined;
    refresh(): void;
    createReactiveSearch(sec: Ref<string>): Ref<T[] | undefined>
    createPages(): SortedFilteredPaged<T>;
}


export interface BlogApiArgs{
    readonly query: QueryType;
    readonly channelId?: Ref<string>;
    readonly router: Router;
    readonly pageSize: MaybeRef<number>;
    readonly sort: Ref<SortType>;
    readonly search: Ref<string>;
}

export interface TBlogApi<T extends BlogEntity> {
    getAllItems(): Promise<T[]>;
}


export const createReactiveBlogApi = <T extends NamedBlogEntity, TApi extends TBlogApi<T>>(api:TApi, args: BlogApiArgs)
: ReactiveBlogStore<T> & TApi => {

    const { query, router, channelId, pageSize, sort, search } = args

    //route query for the selected post
    const selectedId = useRouteQuery<string>(query, '', { mode: 'replace', router });

    const all = shallowRef<T[]>([])

    //manual refresh
    const [onRefresh, refresh] = useToggle()

    //Compute the selected items from their ids
    const selected = computed<T | undefined>(() => find(all.value, c => isEqual(c.id, selectedId.value)));

    const createReactiveSearch = (sec: Ref<string>): Ref<T[] | undefined> => {
        return computed(() => {
            return filter(all.value, c => includes(toLower(c.name), toLower(sec.value)) || includes(toLower(c.id), toLower(sec.value)));
        })
    }

    const createPages = (): SortedFilteredPaged<T> => {
        //Configure pagination
        return useFilteredPages({ items: all, search, sort }, pageSize)
    }

    const loadItems = () => {
        apiCall(async () => {
            all.value = await api.getAllItems()
        })
    }

    if(channelId) {
        //Watch for selected channel id changes
        watch([onRefresh, channelId], ([_, cid]) => {
            //Must have selected a channel
            if (isEmpty(cid)) {
                all.value = []
            }
            else{
                loadItems()
            }
        })
    }
    else{
        //Watch for refresh only
        watch([onRefresh], loadItems)
    }

    return {
        ...api,
        refresh,
        selectedId,
        selected,
        all,
        createReactiveSearch,
        createPages
    }
}
