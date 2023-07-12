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

import { MaybeRefOrGetter, computed } from 'vue';
import { useOffsetPagination } from '@vueuse/core';
import { filter, includes, isEmpty, orderBy, slice, toLower } from 'lodash';
import { CanPaginate, NamedBlogEntity, SortedFilteredPaged } from '../types';

/**
 * Allows filtering, sorting, and paginating a collection of blog items 
 * @param pageable The collection of items to paginate and filter
 * @returns The filtered and sorted items, and the pagination state
 */
export const useFilteredPages = <T extends NamedBlogEntity>(pageable: CanPaginate<T>, pageSize: MaybeRefOrGetter<number>): SortedFilteredPaged<T> => {

    //Get filterable items, and the query state to filter by
    const { sort, search } = pageable.getQuery();

    const filtered = computed<T[]>(() => {

        //Sort the posts by the sort order and decending
        const sorted = orderBy(pageable.items.value, sort.value, ['desc'])

        if (isEmpty(search.value)) {
            return sorted
        }
        else {
            //Search query as lower-case
            const lower = toLower(search.value);
            return filter(sorted, c => includes(toLower(c.title || c.name), lower) || includes(toLower(c.id), lower))
        }
    })

    //Get total after sort and filter
    const total = computed(() => filtered.value.length);

    //Setup pagination based on sort/filter
    const pagination = useOffsetPagination({ total, pageSize });

    const final = computed<T[]>(() => {
        const currentPageSize = pagination.currentPageSize.value;
        //get the current page of items to display
        const offset = currentPageSize * (pagination.currentPage.value - 1);
        const limit = currentPageSize * pagination.currentPage.value;
        return slice(filtered.value, offset, limit);
    })

    return { items: final, pagination }
}