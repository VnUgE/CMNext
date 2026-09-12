import 'pinia';
import { computed, type Ref } from 'vue';
import {
  useMfaApi,
  type MfaMethod,
  type MfaApi,
  type MfaGetResponse,
  type ApiConfig,
} from '@vnuge/vnlib.browser';
import { useAsyncState } from '@vueuse/core';
import { PiniaPluginContext, PiniaPlugin } from 'pinia';
import { find, includes } from 'lodash-es';
import { storeExport } from './index';
import { logError } from '../lib/log';

export interface MfaSettingsStore {
  readonly mfa: {
    readonly data: MfaGetResponse;
    /**
     * Checks if the given mfa method is enabled for the current user
     * @param type The mfa method to check if it is enabled
     * @returns
     */
    readonly isEnabled: (type: MfaMethod) => Ref<boolean>;
    /**
     * Checks if the server announced that the given mfa method is supported
     * on the server
     * @param type The mfa method to check if it is supported
     * @returns A reactive ref that is true if the method is supported
     */
    readonly isSupported: (type: MfaMethod) => Ref<boolean>;
    /**
     * Gets the MFA data slot returned by the server for the given mfa method
     * This data is specific to the mfa method and does not have a fixed schema
     * @param type The mfa method to get the data for
     * @returns A reactive ref that contains the data for the mfa method
     */
    readonly getDataFor: <T>(type: MfaMethod) => Ref<T | undefined>;
    /**
     * Refreshes the mfa data from the server
     */
    readonly refresh: () => void;
  } & MfaApi;
}

declare module 'pinia' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- intentional: pinia merges these augmentations across plugins
  export interface PiniaCustomProperties extends MfaSettingsStore {}
}

export const mfaSettingsPlugin = (config: ApiConfig): PiniaPlugin => {
  return ({ store }: PiniaPluginContext): MfaSettingsStore => {
    const mfaConfig = useMfaApi(config);

    const { state: data, execute } = useAsyncState<MfaGetResponse>(
      async () => {
        //Wait for the account rpc data to be loaded from the server
        const accStatus = await store.account.wait();

        //Ensure the user is logged in and MFA is enabled
        if (!accStatus.status.authenticated || !mfaConfig.isEnabled(accStatus)) {
          return {} as MfaGetResponse;
        }

        try {
          //errors are swallowed here
          return await mfaConfig.getData();
        } catch {
          logError('MFA Failure', 'Failed to load MFA settings');
          return {} as MfaGetResponse;
        }
      },
      {} as MfaGetResponse,
      { delay: 100, immediate: false }
    );

    const isEnabled = (type: MfaMethod): Ref<boolean> => {
      return computed(() => {
        const m = find(data.value.methods, (m) => m.type === type);
        return m ? m.enabled : false;
      });
    };

    const isSupported = (type: MfaMethod): Ref<boolean> => {
      return computed(() => includes(data.value.supported_methods, type));
    };

    const getDataFor = <T>(type: MfaMethod): Ref<T | undefined> => {
      return computed(() => {
        const m = find(data.value.methods, (m) => m.type === type);
        return m ? (m.data as T) : undefined;
      });
    };

    return storeExport({
      mfa: {
        ...mfaConfig,
        data,
        isEnabled,
        isSupported,
        getDataFor,
        refresh: execute,
      },
    }) as unknown as MfaSettingsStore;
  };
};
