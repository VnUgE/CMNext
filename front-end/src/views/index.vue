<template>
    <div id="home-page-entry" class="app-component-entry">
        
    </div>
</template>

<script setup lang="ts">

import { useRouter } from 'vue-router';

const { push } = useRouter();
push('/blog')

</script>