<template>
  <!-- Import environment component top level as the entrypoint -->
  <Environment>
    <template #main>
      <router-view />
    </template>
  </Environment>
 
</template>

<script setup lang="ts">
import Environment from './bootstrap/Environment.vue';

</script>