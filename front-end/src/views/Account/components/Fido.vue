<script setup lang="ts">
/**
 * FIDO/WebAuthn security key settings component.
 * Allows users to manage hardware security keys for 2FA.
 */
import { isEmpty } from 'lodash-es';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { type FidoDevice as IFidoDevice, useFidoApi } from '@vnuge/vnlib.browser';
import { reactive } from 'vue';
import { confirm, promptForPassword } from '../../../lib/confirm';
import { useFormValidation } from '../../../lib/forms';
import { toaster } from '../../../main';
import { useStore } from '../../../store';
import { useToggle, whenever, refDefault, toRefs } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import * as yup from 'yup';
import SettingsCard from './SettingsCard.vue';

const store = useStore();
const { isLocalAccount } = storeToRefs(store);
const apiCall = useApiCall({ toaster });

const isSupported = store.mfa.isSupported('fido');
const fido = useFidoApi(store.mfa);

const fidoSlot = store.mfa.getDataFor<{
    devices: IFidoDevice[];
    can_add_devices: boolean;
    data_size: number;
    max_size: number;
}>('fido');
const fidoData = refDefault(fidoSlot, {
    devices: [],
    can_add_devices: false,
    data_size: 0,
    max_size: 0,
});
const { devices, can_add_devices, data_size, max_size } = toRefs(fidoData);

const [isOpen, toggleOpen] = useToggle();
const { validate } = useFormValidation({ toaster });

const vState = reactive({ deviceName: '' });

const deviceSchema = yup.object({
    deviceName: yup
        .string()
        .required('Device name is required')
        .matches(/^[a-zA-Z0-9\s]+$/, 'Device name must be alphanumeric')
        .min(1, 'Device name must be at least 1 character')
        .max(32, 'Device name must have less than 32 characters'),
});

const onRemoveDevice = async (single: IFidoDevice) => {
    const { isCanceled } = await confirm({
        title: 'Are you sure?',
        message: `Are you sure you want to remove the device ${single.n}? This action cannot be undone.`,
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
        const result = await fido.disableDevice(single, { password });
        toaster.success(result.result);
        store.mfa.refresh();
    });
};

const onDisable = async () => {
    const { isCanceled } = await confirm({
        title: 'Are you sure?',
        message: 'This will disable FIDO authentication for your account.',
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
        const result = await fido.disableAllDevices({ password });
        toaster.success(result.result);
        store.mfa.refresh();
    });
};

const onRegisterDevice = async () => {
    if (!isSupported.value) {
        toaster.error('Your browser does not support FIDO authentication.');
        return;
    }

    if (!(await validate(vState, deviceSchema))) {
        return;
    }

    toggleOpen(false);

    const password = await promptForPassword();
    if (!password) {
        toggleOpen(true);
        return;
    }

    const result = await apiCall(async () => {
        const response = await fido.registerDefaultDevice(vState.deviceName, { password });
        toaster.success(response.result);
        return true;
    });

    if (!result) {
        toggleOpen(true);
        return;
    }

    vState.deviceName = '';
    store.mfa.refresh();
};

const getAlgNameFromCode = (code: number) => {
    switch (code) {
        case -7:
            return 'ES256';
        case -35:
            return 'ES384';
        case -36:
            return 'ES512';
        default:
            return 'Unknown';
    }
};

whenever(isOpen, () => {
    vState.deviceName = '';
});
</script>

<template>
    <SettingsCard
        v-if="isSupported"
        title="Security Keys"
        :description="
            devices.length > 0
                ? `${devices.length} device(s) registered`
                : 'Use hardware security keys for 2FA'
        "
        :external-auth-blocked="!isLocalAccount"
    >
        <template #actions>
            <div v-if="isLocalAccount">
                <div v-if="!isEmpty(devices)" class="join">
                    <button
                        class="btn btn-sm join-item tooltip tooltip-left"
                        data-tip="Add a new security key"
                        :disabled="!can_add_devices || !fido.isSupported()"
                        @click.prevent="toggleOpen()"
                    >
                        <fa-icon icon="plus" />
                        <span class="hidden sm:inline ml-1">Add</span>
                    </button>
                    <button
                        class="btn btn-sm text-error join-item tooltip tooltip-left tooltip-error"
                        data-tip="Remove all keys"
                        @click.prevent="onDisable()"
                    >
                        <fa-icon icon="minus-circle" />
                        <span class="hidden sm:inline ml-1">Disable</span>
                    </button>
                </div>
                <button
                    v-else
                    :disabled="!fido.isSupported()"
                    class="btn btn-sm btn-primary"
                    @click.prevent="toggleOpen()"
                >
                    <fa-icon icon="plus" />
                    <span class="ml-1">Add Key</span>
                </button>
            </div>
        </template>

        <!-- Device Table -->
        <div v-if="devices.length > 0" class="overflow-x-auto -mx-2">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Device</th>
                        <th class="hidden sm:table-cell">ID</th>
                        <th class="hidden sm:table-cell">Algorithm</th>
                        <th class="w-20" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="device in devices" :key="device.id">
                        <td class="max-w-32 truncate">{{ device.n }}</td>
                        <td
                            class="hidden sm:table-cell max-w-32 truncate text-base-content/60 text-xs"
                        >
                            {{ device.id }}
                        </td>
                        <td class="hidden sm:table-cell text-xs">
                            {{ getAlgNameFromCode(device.alg) }}
                        </td>
                        <td class="text-right">
                            <button
                                class="btn btn-xs btn-ghost text-error"
                                @click="onRemoveDevice(device)"
                            >
                                <fa-icon icon="trash-can" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="text-xs text-base-content/50 text-right mt-1">
                {{ data_size }}/{{ max_size }} bytes
            </div>
        </div>

        <!-- Info when no devices -->
        <p v-else class="text-sm text-base-content/70">
            Add a <a class="link" target="_blank" href="https://webauthn.io/">FIDO or WebAuthn</a>
            security key like YubiKey as a second factor for your account.
        </p>
    </SettingsCard>

    <!-- Not supported -->
    <SettingsCard
        v-else
        title="Security Keys"
        description="WebAuthn is not enabled on this server"
    />

    <!-- Add Device Dialog -->
    <Dialog :open="isOpen" @close="toggleOpen(false)">
        <template #title> Register Security Key </template>
        <template #description>
            <div class="max-w-md">
                <form class="space-y-4" @submit.prevent="onRegisterDevice()">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Device name</span>
                        </label>
                        <input
                            v-model="vState.deviceName"
                            type="text"
                            class="input input-bordered w-full"
                            placeholder="My YubiKey..."
                        >
                    </div>

                    <div class="flex justify-end gap-2">
                        <button
                            type="button"
                            class="btn btn-ghost"
                            @click.prevent="toggleOpen(false)"
                        >
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">Register</button>
                    </div>
                </form>
            </div>
        </template>
    </Dialog>
</template>
