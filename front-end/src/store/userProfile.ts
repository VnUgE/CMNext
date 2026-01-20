import 'pinia'
import { computed, reactive } from 'vue';
import {
    type UserProfile,
    type ApiConfig,
    useProfile,
    isLoggedIn
} from '@vnuge/vnlib.browser';
import { syncRef, useAsyncState } from '@vueuse/core';
import { PiniaPlugin, PiniaPluginContext, storeToRefs } from 'pinia'
import { cloneDeep, isEqual, assign } from 'lodash-es';
import { storeExport } from './index';

interface ExUserProfile extends UserProfile {
    created: string | Date
}

export interface UserProfileStore {
    readonly user: {
        readonly edit: {
            readonly buffer: UserProfile
            readonly modified: boolean
            readonly revert: () => void
            /**
             * Saves the user profile buffer to the server
             * @returns 
             */
            readonly save: () => Promise<void>
        }
        /**
         * The user profile data buffer for editing and syncing with server
         */
        readonly profile: ExUserProfile
        /**
         * Refreshes the user profile from the server
         */
        readonly refresh: () => void;
    }

}

declare module 'pinia' {
    export interface PiniaCustomProperties extends UserProfileStore {
    }
}

export const profilePlugin = (config: ApiConfig): PiniaPlugin => {

    const { getProfile, updateProfile } = useProfile(config)

    return ({ store }: PiniaPluginContext): UserProfileStore => {

        const { userName } = storeToRefs(store)

        const serverProfile = useAsyncState<ExUserProfile>(async () => {
            //Wait for the account rpc data to be loaded from the server
            const accStatus = await store.account.wait();

            //Ensure the user is logged in
            if (!isLoggedIn(accStatus)) throw new Error("Not logged in");

            return getProfile<ExUserProfile>();

        }, {} as ExUserProfile, { delay: 100, immediate: false });

        const buffer = reactive<UserProfile>({} as UserProfile)
        const modified = computed(() => isEqual(buffer, serverProfile.state.value) === false)

        const revert = () => {
            assign(buffer, cloneDeep(serverProfile.state.value))
        }

        const save = async () => {
            // Save the buffer to the server and refresh the server profile
            const { getResultOrThrow } = await updateProfile(buffer)

            getResultOrThrow()

            await serverProfile.execute()

            // Reset the buffer to the updated profile
            revert()
        }

        // Sync global username value with profile email
        syncRef(userName, computed(() => serverProfile.state.value.email), { direction: 'rtl' })

        return storeExport<UserProfileStore>({
            user: {
                edit: {
                    buffer,
                    modified,
                    revert,
                    save,
                },
                profile: serverProfile.state,
                refresh: serverProfile.execute,
            }
        })
    }
}