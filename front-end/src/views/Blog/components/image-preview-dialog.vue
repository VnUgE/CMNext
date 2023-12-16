<template>
    <div class="">
        <Dialog :open="isOpen" @close="onClose" class="relative z-50">
        <!-- The backdrop, rendered as a fixed sibling to the panel container -->
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />

        <!-- Full-screen container to center the panel -->
        <div class="fixed inset-0 flex items-center justify-center w-screen p-4">
          <!-- The actual dialog panel -->
          <DialogPanel class="p-2 bg-white rounded dark:bg-dark-700" ref="dialog">
            <DialogDescription>
              <img class="preview-image" :src="imgUrl" alt="preview" />
            </DialogDescription>
            <!-- ... -->
          </DialogPanel>
        </div>
      </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRefs } from 'vue'
import { Dialog, DialogDescription } from '@headlessui/vue'
import { onClickOutside } from '@vueuse/core';
import { useStore } from '../../../store';
import { ContentMeta } from '../../../../../lib/admin/dist';
import { isNil } from 'lodash-es';
import { apiCall } from '@vnuge/vnlib.browser';

const emit = defineEmits(['close'])
const props = defineProps<{ 
    item: ContentMeta | undefined,
}>()

const { item } = toRefs(props)

const store = useStore()

const dialog = ref<HTMLElement | null>(null)

const onClose = () => emit('close')
const imgUrl = ref<string | undefined>()
const isOpen = computed(() => !isNil(imgUrl.value))

const downloadImage = (item: ContentMeta) => {
    apiCall(async () => {
        //Download the file blob from the server
        const fileBlob = await store.content.downloadContent(item)
        //Create a url for the blob and open the save link
        const url = window.URL.createObjectURL(fileBlob);
        imgUrl.value = url
    })
}

//load the image when open
watch(item, (item) => {
    if (isNil(item)) {
        imgUrl.value = undefined
    } else {
        downloadImage(item)
    }
})

//Close dialog when clicking outside
onClickOutside(dialog, onClose)

</script>
<style lang="scss"> 

.preview-image {
    @apply max-h-[53rem];
}

</style>