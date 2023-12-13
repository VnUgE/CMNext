<template>
    <div id="default-template" class="flex px-4 py-24 app-component-entry">
        <div class="mx-auto">
            <h2 class="text-center">404 - Resource not found</h2>
            <p>
                The resource you are looking for could not be found on the server. Please check the URL and try again,
                or go back <router-link class="link" to="/">home</router-link>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useStore } from '../store';

const { setPageTitle } = useStore()
setPageTitle('404 - Resource not found')

</script>

<style lang="scss">
#default-template{

}
</style>