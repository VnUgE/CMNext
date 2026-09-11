<script setup lang="ts">
import { toRefs } from 'vue';
import { fidoMfaAuthenticate, type MfaFlow, useFidoApi } from '@vnuge/vnlib.browser';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { toaster } from '../../../main';

const emit = defineEmits(['clear', 'back']);
const props = defineProps<{ upgrade: MfaFlow<'fido'> }>();

const { upgrade } = toRefs(props);
const { invoke: apiCall, waiting } = useApiCall({ toaster });
const { isSupported } = useFidoApi();

const authenticateFido = () => {
  //If a request is still pending, do nothing
  if (waiting.value) return;

  apiCall(async () => {
    //Submit totp code
    const res = await fidoMfaAuthenticate(upgrade.value, { useAutoFill: false });
    res.getResultOrThrow();

    emit('clear');

    // Push a new toast message
    toaster.success('You have been logged in');
  });
};
</script>

<template>
  <div id="fido-login-form" class="py-6">
    <div class="">
      <button :disabled="!isSupported()" class="btn w-full btn-primary" @click="authenticateFido()">
        <!-- Display spinner if waiting -->
        <span v-if="waiting" class="loading loading-spinner loading-sm" />
        <span class="text-base"> Complete Login </span>
      </button>
    </div>
    <div class="mt-3 w-fit mx-auto">
      <button class="mt-3" @click="emit('back')">
        <div class="flex flex-row items-center justify-center gap-2">
          <fa-icon icon="arrow-left" />
          <span>Back</span>
        </div>
      </button>
    </div>
  </div>
</template>
