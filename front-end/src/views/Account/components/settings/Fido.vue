<script setup lang="ts">
import { isEmpty } from 'lodash-es'
import {  
  useFormToaster, 
  usePassConfirm, 
  useConfirm, 
  useVuelidateWrapper, 
  type IFidoDevice, 
  type VuelidateInstance,
  useFidoApi,
} from '@vnuge/vnlib.browser'
import { computed, reactive, type Ref } from 'vue'
import { useStore } from '../../../../store'
import { useToggle, whenever, refDefault, toRefs } from '@vueuse/core'
import { useVuelidate } from '@vuelidate/core'
import { maxLength, minLength, helpers, required } from '@vuelidate/validators'
import { storeToRefs } from 'pinia'
import { RevealConfirm } from '../../../../components/types'

const store = useStore()
const { isLocalAccount } = storeToRefs(store)
const { elevatedApiCall } = usePassConfirm()
const { error, close:closeToaster } = useFormToaster()
const reveal: RevealConfirm = useConfirm().reveal;

const isSupported = store.mfa.isSupported('fido')
const fido = useFidoApi(store.mfa)

const fidoSlot = store.mfa.getDataFor<{ 
  devices: IFidoDevice[], 
  can_add_devices: boolean,
  data_size: number,
  max_size: number
}>('fido')
const fidoData = refDefault(fidoSlot, { devices: [], can_add_devices: false, data_size: 0, max_size: 0 })
const { devices, can_add_devices, data_size, max_size } = toRefs(fidoData)

const [isOpen, toggleOpen] = useToggle()

const refresh = () => store.mfa.refresh()

const vState = reactive({ deviceName: ''})
const rules = computed(() =>{
  return {
    deviceName: {
      notEmpty: helpers.withMessage('Device name is required', required),
      alphaNumOnly: helpers.withMessage('Device name must be alphanumeric', helpers.regex(/^[a-zA-Z0-9\s]+$/)),
      minLength: helpers.withMessage('Device name must be at least 1 characters', minLength(1)),
      maxLength: helpers.withMessage('Device name must have less than 32 characters', maxLength(32))
    }
  }
})

const v$ = useVuelidate(rules, vState)
const { validate } = useVuelidateWrapper(v$ as Ref<VuelidateInstance>)

const onRemoveDevice = async (single: IFidoDevice) => {
    const { isCanceled } = await reveal({
        title: 'Are you sure?',
        text: `Are you sure you want to remove the device ${single.n}? This action cannot be undone.`,
        isWarning: true
    })
    if (isCanceled) {
        return;
    }

    await elevatedApiCall(async ({ toaster, password }) => {
      
        const text = await fido.disableDevice(single, { password });

        toaster.general.info({ title: 'Success', text })

        //Refresh the status
        refresh();
    })
}

const onDisable = async () => {
  const { isCanceled } = await reveal({
    title: 'Are you sure?',
    text: 'This will disable fido authentication for your account.',
    isWarning: true
  })
  if (isCanceled) {
    return;
  }

  await elevatedApiCall(async ({ toaster, password }) => {
    const text = await fido.disableAllDevices({ password });

    toaster.general.success({ title: 'FIDO disabled', text })
  
    //Refresh the status
    refresh()
  });
}

const onRegisterDevice = async () => {

  if (!isSupported.value) {
    error({ title: "Your browser does not support FIDO authentication." })
    return;
  }

  const isValid = await validate()
  if(!isValid){
    return;
  }

  toggleOpen(false);

  const result = await elevatedApiCall(async ({ toaster, password }) => {
    
    const text = await fido.registerDefaultDevice(v$.value.deviceName.$model, { password });

    toaster.general.info({ title: 'Device registered', text })
    
    return true;
  })

  //Reopen the dialog if the result is not successful
  if(!result){
    toggleOpen(true);
    return;
  }

  v$.value.deviceName.$model = '';
  v$.value.$reset();
  refresh();
 
}

const getAlgNameFromCode = (code: number) => {
  switch (code) {
    case -7:
      return "ES256";
    case -35:
      return "ES384";
    case -36:
      return "ES512";
    default:
      return "Unknown";
  }
}

//When the form opens, clear the device name
whenever(isOpen, () => {
  v$.value.deviceName.$model = '';
  v$.value.$reset();
})

</script>

<template>
  <div id="fido-settings" v-if="isSupported" class="">

    <div v-if="!isLocalAccount" class="flex flex-row justify-between">
      <h6 class="block">Security Keys</h6>
      <div class="text-red-500">
        Unavailable for external auth
      </div>
    </div>

    <div v-else class="flex flex-row flex-wrap justify-between">
      <h6 class="font-bold">Security Keys</h6>

      <div v-if="!isEmpty(devices)" class="join">
        <button class="btn join-item tooltip tooltip-top max-sm:tooltip-left" data-tip="Add a new security key"
         :disabled="!can_add_devices || !fido.isSupported()" @click.prevent="toggleOpen()">
          <fa-icon icon="plus" />
          <span class="pl-2 max-sm:hidden">Add Key</span>
        </button>
        <button class="btn join-item tooltip max-sm:tooltip-left tooltip-top tooltip-error text-error" data-tip="Removes all of your Webauthn Keys" @click.prevent="onDisable()">
            <fa-icon icon="minus-circle" />
            <span class="pl-2 max-sm:hidden">Disable</span>
        </button>
      </div>

      <div v-else>
        <button :disabled="!fido.isSupported()" class="btn" @click.prevent="toggleOpen()">
          <fa-icon icon="plus" />
          <span class="pl-2">Add device</span>
        </button>
      </div>

    </div>

    <div v-if="devices && devices.length > 0" class="w-full mt-4">
      <table class="min-w-full text-sm divide-y-2 divide-base-200">
        <thead class="text-left text-base-content">
          <tr>
            <th class="p-2 font-medium whitespace-nowrap">
              Device Name
            </th>
            <th class="p-2 font-medium whitespace-nowrap">
              Device Id
            </th>
            <th class="p-2 font-medium whitespace-nowrap max-sm:hidden">
              Algorithm
            </th>
            <th class="p-2"></th>
          </tr>
        </thead>

        <tbody class="divide-y divide-base-100 text-base-content">
          <tr v-for="device in devices">
            <td class="p-2 max-w-[8rem] whitespace-nowrap">
              <span class="truncate max-w-40">
                {{ device.n }}
              </span>
            </td>
            <td class="p-2 whitespace-nowrap">
              <div class="truncate max-w-40">
                {{ device.id }}
              </div>
            </td>
            <td class="p-2 whitespace-nowrap max-sm:hidden">
              {{ getAlgNameFromCode(device.alg) }}
            </td>
            <td class="p-2 text-right whitespace-nowrap">
              <button class="btn btn-sm hover:text-error duration-75 ease-linear" @click="onRemoveDevice(device)">
                <span class="hidden sm:inline">Remove</span>
                <fa-icon icon="trash-can" class="inline sm:hidden" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="text-xs text-right text-bg">
        <span>Data size: {{ data_size }}/{{ max_size }} b</span>
      </div>
    </div>

    <p v-else class="p-1 pt-3 text-sm bg">
      You may add a new <a class="link" target="_blank" href="https://webauthn.io/">Fido or WebAuthn</a>
      security device as a second factor for your account. Fido security devices are hardware security
      devices such as a YubiKey, that can be used to secure your account.
    </p>
  </div>

  <div v-else>
    <div class="">
      <div class="text-sm text-bg">
        WebAuthN is not enabled on this server.
      </div>
    </div>
  </div>

  <Dialog :open="isOpen" @close="toggleOpen(false)">
    <template v-slot:title class="">
      Register a new security key
    </template>
    <template v-slot:description>
      <div class="max-w-md lg:w-screen">

        <form class="py-2 mt-3" id="fido-add-device-form" @submit.prevent="onRegisterDevice()">

          <fieldset>
            <label for="device-name" class="block text pl-0.5 pb-1">Device name</label>

            <input type="text" tabindex="1" v-model="v$.deviceName.$model" :class='{
                "dirty": v$.deviceName.$dirty,
                "data-invalid": v$.deviceName.$invalid
              }' class="w-full input input-primary" placeholder="My YubiKey..." @input="closeToaster()" />

            <p v-if="v$.deviceName.$errors.length > 0 && v$.deviceName.$model?.length > 0"
              class="mt-1 ml-1 text-xs text-red-500">
              {{ v$.deviceName.$errors[0].$message }}
            </p>

          </fieldset>

          <div class="join flex justify-end mt-6">
            <button type="submit" for="fido-add-device-form" class="join-item btn btn-primary">Submit</button>
            <button type="reset" class="btn join-item" @click.prevent="toggleOpen(false)">Cancel</button>
          </div>

        </form>

      </div>
    </template>
  </Dialog>
</template>
