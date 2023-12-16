<template>
    <div class="flex flex-col w-full">
        <div class="my-4 ml-auto">
            <div class="button-group">
                <button class="btn primary" form="channel-edit-form">Save</button>
                <button class="btn" @click="close">Cancel</button>
            </div>
        </div>
        <div class="mx-auto">
            <h4 v-if="editMode" class="text-center">Edit Channel</h4>
            <h4 v-else class="text-center">Create Channel</h4>
            <p>
                Your root directory and index file name must be unique within your S3 bucket.
            </p>
        </div>
        <dynamic-form
            id="channel-edit-form"
            class="mx-auto"
            :disabled="false"
            :form="channelSchema"
            :validator="channelVal.v$"
            @submit="onSubmit"
        />
         <div class="relative">
            <div class="absolute top-0 right-10">
                <button class="btn xs no-border red" @click="disableFeed" v-if="feedEnabled">
                    Disable
                </button>
            </div>
        </div>
        <div class="max-w-xl mx-auto mt-6">
            <h4 v-if="editMode" class="text-center">Edit Feed</h4>
            <h4 v-else class="text-center">Create Feed</h4>
            <p>
                Optionally define the rss feed for this channel. If you do not configure the feed, posts
                to this channel will not be published to an rss feed, you may configure this feed at any time.
            </p>
        </div>
        
        <!-- Feed edit form -->
        <dynamic-form
            id="feed-edit-form"
            class="mx-auto mt-4"
            :form="feedSchema"
            :validator="feedVal.v$"
            :disabled="false"
            @submit="onSubmit"
        />

        <!-- Feed properties -->
        <FeedFields :properties="feedProps" />

        <div class="mt-6">
            <div class="mx-auto w-fit">
                <button class="btn red" @click="onDelete" v-if="editMode">
                    Delete Permenantly
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { forEach, isEmpty, cloneDeep, isNil, set } from 'lodash-es';
import { reactiveComputed } from '@vueuse/core';
import { useConfirm } from '@vnuge/vnlib.browser';
import { BlogChannel, ChannelFeed, useXmlProperties } from '@vnuge/cmnext-admin';
import { getChannelForm } from '../../form-helpers';
import { useStore } from '../../../../store';
import FeedFields from '../FeedFields.vue';

const emit = defineEmits(['close', 'onSubmit', 'onDelete'])
const store = useStore()

//Disallow empty channels
const channel = computed(() => store.channels.editChannel || {} as BlogChannel)
const editMode = computed(() => !isNil(channel.value.id))

const { getChannelValidator, channelSchema, feedSchema, getFeedValidator } = getChannelForm(editMode);
const { reveal } = useConfirm();

//Get the feed properties
const feedProps = useXmlProperties(computed(() => channel.value.feed));

//Must have reactive buffers for the channel and feed
const channelBuffer = reactiveComputed(() => cloneDeep(channel.value) as BlogChannel)
const feedBuffer = reactiveComputed(() => cloneDeep(channel.value.feed || {}) as ChannelFeed)

//Get validators for channel and feed
const channelVal = getChannelValidator(channelBuffer);
const feedVal = getFeedValidator(feedBuffer);

const feedEnabled = computed(() => !isEmpty(feedBuffer.url))

const disableFeed = () => {
    //Clear the feed
    forEach(feedBuffer, (_value, key) => set(feedBuffer, key, null))
    //Reset the feed validator
    feedVal.reset();
}

const onSubmit = async () => {
    //validate
    if(!await channelVal.validate()){
        return;
    }

    //Feed may not be defined, if it is validate it
    if(feedEnabled.value){
        
        if(!await feedVal.validate()){
            return;
        }

        //set/overwite feed properties
        const feed = {
            ...feedBuffer,
            properties:feedProps.getCurrentProperties()
        }

        //Invoke submitted with feed
        emit('onSubmit', { channel: channelBuffer, feed })
    }
    else{
        //Invoke submitted without feed
        emit('onSubmit', { channel: channelBuffer, feed: null})
    }
   
}

const onDelete = async () => {
    //Show confirm
    const { isCanceled } = await reveal({
        title: 'Delete Channel?',
        text: 'Are you sure you want to delete this channel? This action cannot be undone.',
    })
    if(isCanceled){
        return;
    }

    if(!confirm('Are you sure you want to delete this channel forever?')){
        return;
    }

    emit('onDelete', channelBuffer)
}

const close = () => emit('close')

</script>

<style lang="scss">


</style>