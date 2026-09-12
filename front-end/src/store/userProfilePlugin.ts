import 'pinia';
import { computed } from 'vue';
import { type UserProfile, type ApiConfig, useProfile, isLoggedIn } from '@vnuge/vnlib.browser';
import { syncRef, useAsyncState, whenever } from '@vueuse/core';
import { PiniaPlugin, PiniaPluginContext, storeToRefs } from 'pinia';
import { storeExport } from './index';

interface ExUserProfile extends UserProfile {
  created: string | Date;
}

export interface UserProfileStore {
  readonly user: {
    /**
     * The user profile data buffer for editing and syncing with server
     */
    readonly profile: ExUserProfile;
    /**
     * Waits for the user profile to be loaded from the server
     * @returns The loaded user profile
     */
    readonly wait: () => Promise<ExUserProfile>;
    /**
     * Updates the user profile on the server
     * @param profile Partial profile data to update
     * @returns The updated user profile from the server
     */
    readonly update: (profile: Partial<ExUserProfile>) => Promise<ExUserProfile>;
    /**
     * Refreshes the user profile from the server
     */
    readonly refresh: () => void;
  };
}

declare module 'pinia' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- intentional: pinia merges these augmentations across plugins
  export interface PiniaCustomProperties extends UserProfileStore {}
}

export const profilePlugin = (config: ApiConfig): PiniaPlugin => {
  const { getProfile, updateProfile } = useProfile(config);

  return ({ store }: PiniaPluginContext): UserProfileStore => {
    const { userName } = storeToRefs(store);

    const serverProfile = useAsyncState<ExUserProfile>(
      async () => {
        //Wait for the account rpc data to be loaded from the server
        const accStatus = await store.account.wait();

        //Ensure the user is logged in
        if (!isLoggedIn(accStatus)) throw new Error('Not logged in');

        return getProfile<ExUserProfile>();
      },
      {} as ExUserProfile,
      { delay: 100, immediate: false, resetOnExecute: false }
    );

    const update = async (profile: Partial<ExUserProfile>) => {
      // Save the buffer to the server and refresh the server profile
      const { getResultOrThrow } = await updateProfile(profile);

      getResultOrThrow();

      return serverProfile.execute();
    };

    // Sync global username value with profile email
    syncRef(
      userName,
      computed(() => serverProfile.state.value.email),
      { direction: 'rtl' }
    );

    // Fetch the profile whenever the account state flips to authenticated.
    // Cold boot with a valid session, fresh logins, and polled session
    // restores all flow through here, so no view needs to trigger the load.
    whenever(
      () => isLoggedIn(store.account.data),
      () => serverProfile.execute()
    );

    return storeExport<UserProfileStore>({
      user: storeExport({
        update,
        profile: serverProfile.state,
        refresh: serverProfile.execute,
        wait: serverProfile.then((t) => t.state.value),
      }),
    });
  };
};
