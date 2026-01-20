import 'pinia'
import { computed, type Ref } from 'vue';
import { type ApiConfig, useScopedAppDataApi } from '@vnuge/vnlib.browser';
import { PiniaPluginContext, PiniaPlugin } from 'pinia'
import { useAsyncState, get } from '@vueuse/core'
import { cloneDeep, filter, includes } from 'lodash-es';


export interface UserPreferences {
    pinnedChannels?: string[];
}

export interface UserPreferencesStore {
    readonly preferences: {
        readonly isLoading: Readonly<Ref<boolean>>;
        refresh(): Promise<UserPreferences>;
        update(prefs: Partial<UserPreferences>): Promise<void>;
        readonly pinnedChannels:{
            readonly current: Readonly<Ref<string[]>>;
            add(pinnedId: string): Promise<void>;
            remove(pinnedId: string): Promise<void>;
            isPinned(pinnedId: string): boolean;
        }
    }
}

declare module 'pinia' {
    export interface PiniaCustomProperties extends UserPreferencesStore {
    }
}

export const userPreferencesPlugin = (config: ApiConfig, endpointUrl: string, storageScope: string): PiniaPlugin => {

    return ({ store }: PiniaPluginContext): UserPreferencesStore => {

        const appData = useScopedAppDataApi({ dataScope: storageScope, endpoint: endpointUrl, config });

         const prefs = useAsyncState<UserPreferences>(async () => {
            const { status } = await store.account.wait();
            
            if(!status.authenticated){
                return {};
            }
            
            const data = await appData.get<UserPreferences>({ });
            return data || {};

         }, {}, { immediate: true, delay: 100, resetOnExecute: true });

         const update = async (newPrefs: Partial<UserPreferences>): Promise<void> => {

            const current = cloneDeep(prefs.state.value) || {};

            //Merge the new preferences with the current ones
            Object.assign(current, newPrefs);

            //Set the new preferences in the store
            await appData.set(current, { });

            //Reload the preferences from the server
            await prefs.execute();
         }

         const pinnedChannels = () => {

            const current = computed(() => prefs.state.value.pinnedChannels || []);

            const add = async (pinnedId: string): Promise<void> => {
                const arr = get(current);

                if (!includes(arr, pinnedId)) {
                    arr.push(pinnedId);

                    await update({ pinnedChannels: arr });
                }
            }

            const remove = async (pinnedId: string): Promise<void> => {
                const arr = get(current);

                if (includes(arr, pinnedId)) {
                    const without = filter(arr, (id => id !== pinnedId));

                    await update({ pinnedChannels: without });
                }
            }

            const isPinned = (pinnedId: string): boolean => {
                return includes(get(current), pinnedId);
            }

            return { current, add, remove, isPinned };
         }

        return {
            preferences: {
                isLoading: prefs.isLoading,
                refresh: prefs.execute,
                pinnedChannels: pinnedChannels(),
            }
        };
    }
}
