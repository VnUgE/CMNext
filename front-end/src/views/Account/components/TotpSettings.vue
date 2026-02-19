<script setup lang="ts">
import { isNil, chunk, defaultTo, map, join, toSafeInteger } from 'lodash-es';
import base32Encode from 'base32-encode';
import { computed, shallowRef } from 'vue';
import { get, useToggle } from '@vueuse/core';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useSession, useTotpApi, type TotpUpdateResponse } from '@vnuge/vnlib.browser';
import { useStore } from '../../../store';
import { confirm, promptForPassword } from '../../../lib/confirm';
import { vnlib, toaster } from '../../../main';
import { storeToRefs } from 'pinia';
import QrCodeVue from 'qrcode.vue';
import VOtpInput from 'vue3-otp-input';
import SettingsCard from './SettingsCard.vue';

const store = useStore();
const { isLocalAccount } = storeToRefs(store);

const session = useSession(vnlib);
const apiCall = useApiCall({ toaster });
const totpApi = useTotpApi(store.mfa);
const totpSupported = store.mfa.isSupported('totp');
const totpEnabled = store.mfa.isEnabled('totp');

const totpMessage = shallowRef<TotpUpdateResponse>();
const [showSubmitButton, toggleSubmitButton] = useToggle();

const showTotpCode = computed(() => !isNil(totpMessage.value?.secret));

const secretSegments = computed<string[]>(() => {
    const chunks = chunk(totpMessage.value?.secret, 6);
    return map(chunks, (chunk) => join(chunk, ''));
});

const qrCode = computed(() => {
    if (isNil(totpMessage.value?.secret)) {
        return '';
    }

    const m = get(totpMessage)!;
    const params = new URLSearchParams();
    params.append('secret', m.secret);
    params.append('issuer', m.issuer);
    params.append('algorithm', m.algorithm);
    params.append('digits', defaultTo(m.digits, 6).toString());
    params.append('period', defaultTo(m.period, 30).toString());
    return `otpauth://totp/${m.issuer}:${store.userName}?${params.toString()}`;
});

const ProcessAddOrUpdate = async () => {
    const password = await promptForPassword();
    if (!password) {
        return;
    }

    await apiCall(async () => {
        const totp = await totpApi.enable({ password });

        // Decrypt the totp secret
        const secretBuf = await session.decryptPayload(totp.secret);

        // Encode the secret to base32
        (totp as any).secret = base32Encode(secretBuf, 'RFC3548', { padding: false });

        totpMessage.value = totp;
    });
};

const configTotp = async () => {
    const { isCanceled } = await confirm({
        title: 'Enable TOTP multi factor?',
        message: 'Are you sure you understand TOTP multi factor and wish to enable it?',
    });

    if (!isCanceled) {
        ProcessAddOrUpdate();
    }
};

const regenTotp = async () => {
    if (!totpEnabled.value) {
        return;
    }

    const { isCanceled } = await confirm({
        title: 'Are you sure?',
        message:
            'If you continue your previous TOTP authenticator and recovery codes will no longer be valid.',
    });

    if (!isCanceled) {
        ProcessAddOrUpdate();
    }
};

const disable = async () => {
    const { isCanceled } = await confirm({
        title: 'Disable TOTP',
        message: 'Are you sure you want to disable TOTP? You may re-enable TOTP later.',
        isWarning: true,
    });

    if (isCanceled) {
        return;
    }

    const password = await promptForPassword();
    if (!password) {
        return;
    }

    await apiCall(async () => {
        const result = await totpApi.disable({ password });
        toaster.success(result.result);
        store.mfa.refresh();
    });
};

const VerifyTotp = (code: string) => {
    apiCall(async () => {
        try {
            await totpApi.verify(toSafeInteger(code));

            toggleSubmitButton(true);

            toaster.success('Your TOTP code is valid and is now enabled');
        } catch {
            toaster.error('Your TOTP code is not valid.');
        }
    });
};

const CloseQrWindow = () => {
    toggleSubmitButton(false);
    totpMessage.value = undefined;

    //Fresh methods
    store.mfa.refresh();
};
</script>

<template>
    <SettingsCard
        v-if="totpSupported"
        title="TOTP Authenticator"
        :description="
            totpEnabled ? 'TOTP is enabled for your account' : 'Use an authenticator app for 2FA'
        "
        :external-auth-blocked="!isLocalAccount"
    >
        <template #actions>
            <div v-if="!showTotpCode && isLocalAccount">
                <div v-if="totpEnabled" class="join">
                    <button
                        class="btn btn-sm join-item tooltip tooltip-left"
                        data-tip="Reset your TOTP secret"
                        @click.prevent="regenTotp"
                    >
                        <fa-icon icon="sync" />
                        <span class="hidden sm:inline ml-1">Regenerate</span>
                    </button>
                    <button
                        class="btn btn-sm text-error join-item tooltip tooltip-left tooltip-error"
                        data-tip="Disable TOTP"
                        @click.prevent="disable"
                    >
                        <fa-icon icon="minus-circle" />
                        <span class="hidden sm:inline ml-1">Disable</span>
                    </button>
                </div>
                <button v-else class="btn btn-sm btn-primary" @click.prevent="configTotp">
                    <fa-icon icon="plus" />
                    <span class="ml-1">Setup</span>
                </button>
            </div>
        </template>

        <!-- QR Code Setup Flow -->
        <div v-if="showTotpCode" class="text-center space-y-4">
            <p class="text-sm">Scan the QR code with your authenticator app.</p>

            <div class="flex justify-center">
                <QrCodeVue :size="160" render-as="svg" level="Q" :value="qrCode" />
            </div>

            <div>
                <p class="text-xs text-base-content/60 mb-2">Or enter manually:</p>
                <div
                    class="flex flex-wrap justify-center gap-1 p-2 bg-base-200 rounded font-mono text-sm"
                >
                    <span v-for="code in secretSegments" :key="code">{{ code }}</span>
                </div>
            </div>

            <div>
                <p class="text-sm text-base-content/70 mb-2">
                    Enter the code from your app to verify:
                </p>
                <div class="flex justify-center">
                    <VOtpInput
                        class="otp-input"
                        input-type="letter-numeric"
                        separator=""
                        value=""
                        :is-disabled="showSubmitButton"
                        input-classes="input input-bordered w-10 h-10 text-center mx-0.5"
                        :num-inputs="6"
                        @on-complete="VerifyTotp"
                    />
                </div>
            </div>

            <div v-if="showSubmitButton" class="pt-2">
                <button class="btn btn-primary btn-sm" @click.prevent="CloseQrWindow">
                    Complete Setup
                </button>
            </div>
        </div>

        <!-- Info when not enabled -->
        <p v-else-if="!totpEnabled" class="text-sm text-base-content/70">
            TOTP is a time-based one-time password. Use apps like Google Authenticator, Authy, or
            Duo.
            <a
                class="link"
                href="https://en.wikipedia.org/wiki/Time-based_one-time_password"
                target="_blank"
            >
                Learn more
            </a>
        </p>
    </SettingsCard>

    <!-- Not supported message -->
    <SettingsCard
        v-else
        title="TOTP Authenticator"
        description="TOTP is not enabled on this server"
    />
</template>
