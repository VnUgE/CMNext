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

import { Ref, WatchSource, ref } from 'vue';
import { throttle } from 'lodash';
import { watchArray } from '@vueuse/core';


/**
 * Watches a collection of items and runs the callback function if any of the 
 * items change.
 * @param watchValue A collection of watchable items to watch
 * @param cb The async callback method to run when any of the items change
 * @param initial The initial value to set the watched value to
 * @returns A ref that is updated when any of the items change
 */
export const watchAndCompute = <T>(watchValue: WatchSource[], cb: () => Promise<T>, initial: T): Ref<T> => {

    const watched = ref<T>();
    watched.value = initial;

    //Function to execute the callback and set the watched value
    const exec = async () => {
        watched.value = await cb();
    }

    //Initial call
    exec();

    watchArray(watchValue, throttle(exec, 100))

    return watched as Ref<T>;
}