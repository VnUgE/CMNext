<template>
  <div id="account-fido-settings">
    <div v-if="!isLocalAccount" class="flex flex-row justify-between">
      <h6 class="block">
        FIDO/WebAuthN Authentication
      </h6>
      <div class="text-red-500">
        Unavailable for external auth
      </div>
    </div>
    <div v-else class="flex flex-row flex-wrap justify-between">
      <h6>FIDO/WebAuthN Authentication</h6>
      <div class="">
        <div v-if="fidoEnabled" class="">
          <button class="ml-1 btn red sm" @click.prevent="Disable">
            <fa-icon icon="minus-circle" />
            <span class="pl-3">Disable</span>
          </button>
        </div>
        <div v-else>
          <button class="btn primary sm" @click.prevent="Setup">
            <fa-icon icon="plus" />
            <span class="pl-3">Setup</span>
          </button>
        </div>
      </div>
      <p class="p-1 pt-3 text-sm text-gray-600">
        WebAuthN/FIDO is not yet supported, due to complexity and browser support. 
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSession } from '@vnuge/vnlib.browser'
import { toRefs } from 'vue';

const props = defineProps<{
  fidoEnabled?: boolean
}>()

const { fidoEnabled } = toRefs(props)

const { isLocalAccount } = useSession()

const Disable = () => {}
const Setup = () => {}

</script>

<style>

</style>
