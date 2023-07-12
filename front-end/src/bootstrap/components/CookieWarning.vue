<template>
  <div v-if="show" class="fixed top-0 left-0 z-10 w-full" :style="style">
    <div class="flex w-full p-2 text-center text-white bg-blue-600">
      <div class="m-auto text-sm font-semibold md:text-base">
        You must have cookies enabled for this site to work properly
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { computed, toRefs } from 'vue'
import { useEnvSize } from '@vnuge/vnlib.browser'

const props = defineProps<{
  hidden?: boolean
}>()

const { hidden } = toRefs(props)

const { headerHeight } = useEnvSize()

const show = computed(() => (!window.navigator.cookieEnabled) && !hidden.value)

const style = computed(() => {
  return {
    top: headerHeight.value + 'px'
  }
})

</script>

<style>

</style>
