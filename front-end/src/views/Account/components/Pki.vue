<script setup lang="ts">
import { isEmpty } from 'lodash-es';
import { useOtpApi, type OtpPublicKey } from '@vnuge/vnlib.browser';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { ref } from 'vue';
import { useToggle, set, toRefs, refDefault } from '@vueuse/core';
import { useStore } from '../../../store';
import { toaster } from '../../../main';
import { confirm, promptForPassword } from '../../../lib/confirm';
import * as yup from 'yup';
import type { ValidationError } from 'yup';
import SettingsCard from './SettingsCard.vue';

const store = useStore();
const apiCall = useApiCall({ toaster });

const isSupported = store.mfa.isSupported('pkotp');
const pkiConfig = useOtpApi(store.mfa);

const _otpData = store.mfa.getDataFor<{
    keys: OtpPublicKey[];
    can_add_keys: boolean;
    data_size: number;
    max_size: number;
}>('pkotp');
const otpData = refDefault(_otpData, { keys: [], can_add_keys: false, data_size: 0, max_size: 0 });
const {
    keys: publicKeys,
    can_add_keys: canAddKeys,
    data_size: dataSize,
    max_size,
} = toRefs(otpData);

const [isOpen, toggleOpen] = useToggle();
const keyData = ref('');
const explicitCurve = ref('');

const jwkSchema = yup.object({
    kty: yup.string().required('Key type (kty) is required'),
    use: yup.string().required('Key use (use) is required'),
    alg: yup.string().required('Algorithm (alg) is required'),
    kid: yup.string().required('Key ID (kid) is required'),
    x: yup.string().required('X coordinate (x) is required'),
    y: yup.string().required('Y coordinate (y) is required'),
    crv: yup.string().optional(),
});

const onRemoveKey = async (single: OtpPublicKey) => {
    const conf = await confirm({
        title: 'Are you sure?',
        message: `This will remove key ${single.kid} from your account.`,
        isWarning: true,
    });
    if (conf.isCanceled) {
        return;
    }

    const password = await promptForPassword();
    if (!password) {
        return;
    }

    await apiCall(async () => {
        const { result, code } = await pkiConfig.removeKey(single, { password });

        if (code == 401) {
            toaster.error('Error', 'Invalid password provided.');
            return;
        }

        toaster.success('Success', result);
        store.mfa.refresh();
    });
};

const onDisable = async () => {
    const { isCanceled } = await confirm({
        title: 'Are you sure?',
        message: 'This will disable PKI authentication for your account.',
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
        const { result } = await pkiConfig.disable({ password });
        toaster.success('Success', result);
        store.mfa.refresh();
    });
};

const onSubmitKeys = async () => {
    if (window.crypto.subtle == null) {
        toaster.error('Your browser does not support PKI authentication.');
        return;
    }

    //Validate key data
    if (isEmpty(keyData.value)) {
        toaster.error('Please enter key data');
        return;
    }

    let jwk: OtpPublicKey;
    try {
        //Try to parse as jwk
        jwk = JSON.parse(keyData.value);
    } catch (e) {
        //Write error to debug log
        console.error('Invalid JWK:', e);
        toaster.error('Invalid JWK', 'Unable to parse JSON.');
        return;
    }

    try {
        await jwkSchema.validate(jwk, { abortEarly: false });
    } catch (ve: unknown) {
        const validationError = ve as ValidationError;
        toaster.error('Invalid Key', validationError.errors.join(', '));
        return;
    }

    toggleOpen(false);

    const password = await promptForPassword();
    if (!password) {
        return;
    }

    //Send to server
    const result = await apiCall(async () => {
        //init/update the key
        const { result } = await pkiConfig.addOrUpdate(jwk, { password });

        toaster.success('Success', result);

        set(keyData, '');
        set(explicitCurve, '');

        store.mfa.refresh();

        return true;
    });

    //if the form failed to submit (password error or cancelled), open it again
    toggleOpen(!result);
};
</script>

<template>
    <SettingsCard
        v-if="isSupported"
        title="OTP Public Keys"
        :description="
            publicKeys.length > 0
                ? `${publicKeys.length} key(s) registered`
                : 'Use signed JWTs for authentication'
        "
    >
        <template #actions>
            <div v-if="publicKeys.length > 0" class="join">
                <button
                    class="btn btn-sm join-item tooltip tooltip-left"
                    data-tip="Add a new OTP public key"
                    :disabled="!canAddKeys"
                    @click.prevent="toggleOpen(true)"
                >
                    <fa-icon icon="plus" />
                    <span class="hidden sm:inline ml-1">Add</span>
                </button>
                <button
                    class="btn btn-sm text-error join-item tooltip tooltip-left tooltip-error"
                    data-tip="Remove all keys"
                    @click.prevent="onDisable"
                >
                    <fa-icon icon="minus-circle" />
                    <span class="hidden sm:inline ml-1">Disable</span>
                </button>
            </div>
            <button
                v-else
                class="btn btn-sm btn-primary"
                :disabled="!canAddKeys"
                @click.prevent="toggleOpen(true)"
            >
                <fa-icon icon="plus" />
                <span class="ml-1">Add Key</span>
            </button>
        </template>

        <!-- Keys Table -->
        <div v-if="publicKeys.length > 0" class="overflow-x-auto -mx-2">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Key ID</th>
                        <th>Algorithm</th>
                        <th class="hidden sm:table-cell">Curve</th>
                        <th class="w-20" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="key in publicKeys" :key="key.kid">
                        <td class="max-w-32 truncate" :title="key.kid">{{ key.kid }}</td>
                        <td class="text-xs">{{ key.alg }}</td>
                        <td class="hidden sm:table-cell text-xs">{{ key.crv }}</td>
                        <td class="text-right">
                            <button
                                class="btn btn-xs btn-ghost text-error"
                                @click="onRemoveKey(key)"
                            >
                                <fa-icon icon="trash-can" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="text-xs text-base-content/50 text-right mt-1">
                {{ dataSize }}/{{ max_size }} bytes
            </div>
        </div>

        <!-- Info when no keys -->
        <p v-else class="text-sm text-base-content/70">
            OTP authentication uses signed JWTs from external tools. Add your public key to enable.
        </p>
    </SettingsCard>

    <!-- Not supported -->
    <SettingsCard
        v-else-if="false"
        title="OTP Public Keys"
        description="OTP authentication is not enabled on this server"
    />

    <!-- Add Key Dialog -->
    <Dialog :open="isOpen" @close="toggleOpen(false)">
        <template #main>
            <div class="max-w-lg">
                <h4 class="text-lg font-bold">Add Public Key</h4>
                <p class="mt-2 text-sm text-base-content/70">
                    Paste your public key as a JSON Web Key (JWK). Must include kid, kty, alg, x, y
                    fields.
                </p>
                <div class="form-control mt-4">
                    <textarea
                        v-model="keyData"
                        class="textarea textarea-bordered font-mono text-xs min-h-40"
                        placeholder='{"kty": "EC", "kid": "...", ...}'
                    />
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button class="btn btn-ghost" @click.prevent="toggleOpen(false)">Cancel</button>
                    <button class="btn btn-primary" @click.prevent="onSubmitKeys">Submit</button>
                </div>
            </div>
        </template>
    </Dialog>
</template>
