import 'pinia';
import { computed } from 'vue';
import { type ApiConfig, useScopedAppDataApi } from '@vnuge/vnlib.browser';
import { PiniaPluginContext, PiniaPlugin } from 'pinia';
import { useAsyncState, get, until, watchDebounced } from '@vueuse/core';
import { filter, includes, noop } from 'lodash-es';
import { storeExport } from '.';

export interface UserPreferences {
    pinnedChannels?: string[];
    theme?: string | false;
}

export interface UserPreferencesStore {
    readonly preferences: {
        readonly isLoading: Readonly<boolean>;
        readonly state: Readonly<UserPreferences>;
        refresh(): Promise<UserPreferences>;
        update(prefs: Partial<UserPreferences>): Promise<void>;
        wait(): Promise<UserPreferences>;
        readonly pinnedChannels: {
            readonly current: Readonly<string[]>;
            add(pinnedId: string): Promise<void>;
            remove(pinnedId: string): Promise<void>;
            isPinned(pinnedId: string): boolean;
        };
    };
}

declare module 'pinia' {
    export interface PiniaCustomProperties extends UserPreferencesStore {}
}

export const userPreferencesPlugin = (
    config: ApiConfig,
    endpointUrl: string,
    storageScope: string
): PiniaPlugin => {
    return ({ store }: PiniaPluginContext): UserPreferencesStore => {
        const appData = useScopedAppDataApi(config, {
            dataScope: storageScope,
            endpoint: endpointUrl,
        });

        const prefs = useAsyncState<UserPreferences>(
            async () => {
                const { status } = await store.account.wait();

                if (!status.authenticated) {
                    return {};
                }

                const data = await appData.get<UserPreferences>({});
                return data || {};
            },
            {},
            { immediate: false, delay: 100, resetOnExecute: false }
        );

        const update = async (newPrefs: Partial<UserPreferences>): Promise<void> => {
            const current = await prefs.then((s) => s.state.value);

            //Merge the new preferences with the current ones
            Object.assign(current, newPrefs);

            //Set the new preferences in the store
            await appData.set(current, {});

            //Reload the preferences from the server
            await prefs.execute();
        };

        const pinnedChannels = () => {
            const current = computed(() => prefs.state.value.pinnedChannels || []);

            const add = async (pinnedId: string): Promise<void> => {
                const arr = get(current);

                if (!includes(arr, pinnedId)) {
                    arr.push(pinnedId);

                    await update({ pinnedChannels: arr });
                }
            };

            const remove = async (pinnedId: string): Promise<void> => {
                const arr = get(current);

                if (includes(arr, pinnedId)) {
                    const without = filter(arr, (id) => id !== pinnedId);

                    await update({ pinnedChannels: without });
                }
            };

            const isPinned = (pinnedId: string): boolean => {
                return includes(get(current), pinnedId);
            };

            return { current, add, remove, isPinned };
        };

        const onThemeChange = async (theme: string) => {
            const { state } = await prefs;
            // Only update the theme if the user enabled theme syncing (i.e. theme is not false)
            if (state.value.theme !== false) {
                await update({ theme });
            }
        };

        // Wait for logged in state before applying preferences
        until(() => !!store.loggedIn)
            .toBe(true)
            .then(async () => {
                const { theme } = (await prefs.execute()) ?? {};

                // Optionally sync theme preference if truthy
                if (!!theme) {
                    store.theme = theme;
                }

                // When preferences are ready, watch for theme
                // changes and update accordingly
                watchDebounced(() => store.theme, onThemeChange, { debounce: 1000 });
            });

        return storeExport<UserPreferencesStore>({
            preferences: storeExport({
                state: prefs.state,
                isLoading: prefs.isLoading,
                refresh: prefs.execute,
                pinnedChannels: pinnedChannels(),
                wait: prefs.then,
                update,
            }),
        });
    };
};
