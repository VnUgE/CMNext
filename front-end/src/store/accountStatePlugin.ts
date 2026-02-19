import 'pinia';
import { computed, type Ref } from 'vue';
import {
    type AccountRpcGetResult,
    type AccountRpcMethod,
    type ApiConfig,
    useAccount,
    useAccountRpc,
    useOauthLogin,
} from '@vnuge/vnlib.browser';
import { get, syncRef, toReactive, useAsyncState, useTimeoutPoll } from '@vueuse/core';
import { PiniaPluginContext, PiniaPlugin, storeToRefs } from 'pinia';
import { defaultsDeep, filter } from 'lodash-es';
import { storeExport } from './index';

export interface AccountStateStore {
    readonly account: {
        readonly data: AccountRpcGetResult;
        readonly error: ReturnType<typeof useAsyncState>['error'] | undefined;
        readonly refresh: () => void;
        readonly isMethodSupported: (type: string) => Ref<boolean>;
        readonly getPropertyData: <T>(name: string, defaultValue: T) => Ref<T>;
        readonly wait: () => Promise<AccountRpcGetResult>;
        readonly logout: () => Promise<void>;
    };
}

declare module 'pinia' {
    export interface PiniaCustomProperties extends AccountStateStore {}
}

export const accountStatePlugin = (config: ApiConfig, interval: number): PiniaPlugin => {
    const accRpc = useAccountRpc(config);
    const { logout } = useAccount(config);
    const { logout: oauthLogout, isEnabled } = useOauthLogin(config);

    return ({ store }: PiniaPluginContext): AccountStateStore => {
        const { loggedIn, isLocalAccount } = storeToRefs(store);

        const accountRpcState = useAsyncState(
            accRpc.getData,
            {
                http_methods: [],
                rpc_methods: [],
                properties: [],
                accept_content_type: '',
                status: {
                    authenticated: false,
                    is_local_account: false,
                },
            },
            { delay: 100, immediate: true, resetOnExecute: false }
        );

        //This plugin is authoritatively setting the value of isLocalAccount and loggedIn
        syncRef(
            isLocalAccount,
            computed(() => accountRpcState.state.value.status.is_local_account),
            { direction: 'rtl' }
        );
        syncRef(
            loggedIn,
            computed(() => accountRpcState.state.value.status.authenticated),
            { direction: 'rtl' }
        );

        const isMethodSupported = (type: string): Ref<boolean> => {
            return computed(() => {
                const { rpc_methods } = accountRpcState.state.value;
                return filter(rpc_methods as AccountRpcMethod[], { method: type }).length > 0;
            });
        };

        const getPropertyData = <T>(name: string, defaultVal: T): Ref<T> => {
            return computed(() => {
                const { properties } = get(accountRpcState.state);
                const [val] = filter(properties, { type: name });
                return defaultsDeep(val, defaultVal);
            });
        };

        const onLogout = async () => {
            if (isEnabled(store.account.data)) {
                //Logout using oauth
                await oauthLogout({ autoRedirect: true });
            } else {
                //Standard logout
                await logout();
            }

            // Refresh account state after logout
            await accountRpcState.execute();
        };

        const onPoll = () => {
            accountRpcState.execute();
        };

        // continually poll for account state updates
        useTimeoutPoll(onPoll, interval, { immediate: true });

        return storeExport<AccountStateStore>({
            account: {
                data: toReactive(accountRpcState.state),
                refresh: accountRpcState.execute,
                error: accountRpcState.error,
                wait: () => accountRpcState.then((s) => s.state.value),
                getPropertyData,
                isMethodSupported,
                logout: onLogout,
            },
        });
    };
};
