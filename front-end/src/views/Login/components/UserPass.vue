<script setup lang="ts">
import { ref, shallowRef, reactive, computed } from 'vue';
import { useTimeoutFn, set } from '@vueuse/core';
import { isEmpty, isArray } from 'lodash-es';
import {
  useMfaLogin,
  totpMfaProcessor,
  fidoMfaProcessor,
  type WebMessage,
  type MfaFlow,
  type MfaContinuation,
  type MfaMethod,
} from '@vnuge/vnlib.browser';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { useFormValidation } from '../../../lib/forms';
import { vnlib, toaster } from '../../../main';
import * as yup from 'yup';
import { useStore } from '../../../store';
import Fido from './Fido.vue';
import Totp from './Totp.vue';

const { account } = useStore();

interface LoginAccountPropertyData {
  readonly enforce_email: boolean;
  readonly username_max_chars: number;
}

//Stores dynamic account data from the server
const loginData = account.getPropertyData<LoginAccountPropertyData>('login', {
  enforce_email: false,
  username_max_chars: 50,
});

const { invoke: apiCall, waiting } = useApiCall({ toaster });

const { login } = useMfaLogin(vnlib, {
  handlers: [totpMfaProcessor(), fidoMfaProcessor()],
});

const mfaUpgrades = shallowRef<MfaFlow<MfaMethod>[]>();
const selectedUpgrade = shallowRef<MfaFlow<MfaMethod>>();

const clearUpgrade = () => {
  set(mfaUpgrades, []);
  set(selectedUpgrade, undefined);
};

const mfaTimeout = ref<number>(600 * 1000);
const mfaTimer = useTimeoutFn(
  () => {
    //Clear upgrade message
    clearUpgrade();
    toaster.info(
      'MFA Upgrade Timed Out',
      'The two-factor upgrade process has timed out. Please log in again to continue.'
    );
  },
  mfaTimeout,
  { immediate: false }
);

const vState = reactive({ username: '', password: '' });
const { validate } = useFormValidation({ toaster });

// Yup validation schema
const loginSchema = computed(() =>
  yup.object({
    username: yup
      .string()
      .required('Email cannot be empty')
      .test('email-if-enforced', 'Your email address is not valid', function (value) {
        if (!loginData.value.enforce_email) return true;
        return yup.string().email().isValidSync(value);
      })
      .max(
        loginData.value.username_max_chars,
        `Email address must be less than ${loginData.value.username_max_chars} characters`
      ),
    password: yup
      .string()
      .required('Password cannot be empty')
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must have less than 128 characters'),
  })
);

const SubmitLogin = async () => {
  // If the form is not valid set the error message
  if (!(await validate(vState, loginSchema.value))) {
    return;
  }

  // Run login in an apicall wrapper
  await apiCall(async () => {
    //Attempt to login
    const response = await login({
      userName: vState.username,
      password: vState.password,
    });

    //See if the response is a web message
    if ((response as WebMessage).getResultOrThrow) {
      (response as WebMessage).getResultOrThrow();
    }

    //Try to get response as a flow continuation
    const { methods, expires } = response as MfaContinuation;

    // Response is an mfa upgrade
    if (isArray(methods) && methods.length > 0) {
      /**
       * If mfa has a type assicated, then we should have a handler matched
       * with it to continue the flow
       *
       * All mfa upgrades will have a token expiration, and an assoicated
       * type string name (string)
       */

      set(mfaUpgrades, methods);

      set(mfaTimeout, expires! * 1000);

      mfaTimer.start();
    }
    //If login without mfa was successful
    else if ((response as WebMessage).success) {
      // Push a new toast message
      toaster.success('Success', 'You have been logged in');
    }
  });
};

const mfaClear = () => {
  mfaTimer.stop();
  clearUpgrade();
  account.refresh();
};

const goBackToSelect = () => set(selectedUpgrade, undefined);

const isMethodSelected = (upgrade: MfaFlow<MfaMethod> | undefined, type: MfaMethod) =>
  upgrade?.type === type;
const isSelectectionReady = computed(() => !selectedUpgrade.value && !isEmpty(mfaUpgrades.value));

const getIconUrl = (method: MfaMethod) => {
  switch (method) {
    case 'fido':
      return `M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 
             15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25
             2.25Zm.75-12h9v9h-9v-9Z`;

    case 'totp':
      return `M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0
             0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3`;
  }
};

const getMfaName = (method: MfaMethod) => {
  switch (method) {
    case 'fido':
      return 'Security Key';
    case 'totp':
      return 'Authenticator App';
  }
};
</script>

<template>
  <div class="">
    <div v-if="isMethodSelected(selectedUpgrade, 'totp')">
      <Totp :upgrade="selectedUpgrade" @clear="mfaClear()" @back="goBackToSelect" />
    </div>

    <div v-else-if="isMethodSelected(selectedUpgrade, 'fido')">
      <Fido :upgrade="selectedUpgrade" @clear="mfaClear()" @back="goBackToSelect" />
    </div>

    <div v-else-if="isSelectectionReady">
      <div class="flex flex-col gap-3 py-6">
        <h4 class="text-base font-semibold md:text-lg text-center">Two factor</h4>
        <div class="flex flex-col gap-2">
          <div v-for="upgrade in mfaUpgrades" :key="upgrade.type" class="flex flex-row gap-4">
            <button
              class="flex flex-row items-center justify-center gap-2 btn btn-secondary w-full"
              @click="selectedUpgrade = upgrade"
            >
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke="currentColor"
                    stroke-linejoin="round"
                    :d="getIconUrl(upgrade.type)"
                  />
                </svg>
              </span>
              <span class="md:text-base">
                {{ getMfaName(upgrade.type) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <form
      v-else
      id="user-pass-submit-form"
      method="post"
      action="/login"
      @submit.prevent="SubmitLogin"
    >
      <fieldset class="mt-10" :disabled="waiting">
        <div class="pt-3">
          <label class="input input-bordered flex items-center gap-2 w-full">
            <fa-icon icon="user" />

            <!-- Enforce an email address only if the server requires it, otherwise a username is acceptable -->
            <input
              v-if="loginData.enforce_email"
              id="username"
              v-model="vState.username"
              tabindex="1"
              type="email"
              autocomplete="username"
              class="grow"
              placeholder="Email"
            />

            <input
              v-else
              id="username"
              v-model="vState.username"
              tabindex="1"
              type="text"
              autocomplete="username"
              class="grow"
              placeholder="Username"
            />
          </label>
        </div>
        <div class="py-5">
          <label class="input input-bordered flex items-center gap-2 w-full">
            <fa-icon icon="lock" />

            <input
              id="password"
              v-model="vState.password"
              tabindex="2"
              type="password"
              autocomplete="current-password"
              class="grow"
              placeholder="Password"
            />
          </label>
          <div class="label text-sm w-full flex flex-row justify-between mt-1">
            <span class="label-text-alt link link-hover" />
            <span class="label-text-alt link link-hover">
              <router-link to="/pwreset"> Forgot password </router-link>
            </span>
          </div>
        </div>
      </fieldset>
      <button
        tabindex="3"
        type="submit"
        form="user-pass-submit-form"
        class="btn btn-primary w-full"
        :disabled="waiting"
      >
        <!-- Display spinner if waiting, otherwise the sign-in icon -->
        <span v-if="waiting" class="loading loading-spinner loading-sm" />
        <fa-icon v-else icon="sign-in-alt" />
        <span class="ml-2"> Login </span>
      </button>
    </form>
  </div>
</template>
