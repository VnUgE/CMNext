<script setup lang="ts">
import { computed } from 'vue';
import { reactiveComputed } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useRouteParams } from '@vueuse/router';
import { cloneDeep, forEach, set, isEmpty } from 'lodash-es';
import { BlogChannel, ChannelFeed, useXmlProperties } from '@vnuge/cmnext-admin';
import { useConfirm, useFormToaster, useWait } from '@vnuge/vnlib.browser';
import { useStore } from '../../../store';
import { getChannelForm } from '../form-helpers';
import FeedFields from '../components/FeedFields.vue';

const store = useStore();
const router = useRouter();
const { reveal } = useConfirm();
const { waiting } = useWait();
const { success, error } = useFormToaster();

// Set page title
store.setPageTitle('Edit Channel');

// Channel state
const channelId = useRouteParams<string>('id', '');
const channel = store.channels.find(c => c.id === channelId.value);
const isNew = computed(() => channelId.value === 'new');

// Form setup
const { getChannelValidator, feedSchema, getFeedValidator } = getChannelForm(computed(() => !isNew.value));

// Feed properties
const feedProps = useXmlProperties(computed(() => channel.value.feed));

// Reactive buffers for the channel and feed
const channelBuffer = reactiveComputed(() => cloneDeep(channel.value) as BlogChannel);
const feedBuffer = reactiveComputed(() => cloneDeep(channel.value.feed || {}) as ChannelFeed);

// Get validators for channel and feed
const channelVal = getChannelValidator(channelBuffer);
const feedVal = getFeedValidator(feedBuffer);

const feedEnabled = computed(() => !isEmpty(feedBuffer.url));

const disableFeed = () => {
    // Clear the feed
    forEach(feedBuffer, (_value, key) => set(feedBuffer, key, null));
    // Reset the feed validator
    feedVal.reset();
};

const onSubmit = async () => {
    // Validate channel
    if (!await channelVal.validate()) {
        return;
    }

    // Feed may not be defined, if it is validate it
    if (feedEnabled.value) {
        if (!await feedVal.validate()) {
            return;
        }

        // Set/overwrite feed properties
        const feed = {
            ...feedBuffer,
            properties: feedProps.getCurrentProperties()
        };

        try {
            if (isNew.value) {
                await store.channels.add(channelBuffer, feed);
                success({ title: 'Channel created successfully' });
            } else {
                await store.channels.update(channelBuffer);
                success({ title: 'Channel updated successfully' });
            }
            
            // Navigate back to blog
            await router.push('/blog');
        } catch (err) {
            error({ 
                title: isNew.value ? 'Failed to create channel' : 'Failed to update channel', 
                text: err instanceof Error ? err.message : 'Unknown error' 
            });
        }
    } else {
        try {
            if (isNew.value) {
                await store.channels.add(channelBuffer);
                success({ title: 'Channel created successfully' });
            } else {
                await store.channels.update(channelBuffer);
                success({ title: 'Channel updated successfully' });
            }
            
            // Navigate back to blog
            await router.push('/blog');
        } catch (err) {
            error({ 
                title: isNew.value ? 'Failed to create channel' : 'Failed to update channel', 
                text: err instanceof Error ? err.message : 'Unknown error' 
            });
        }
    }
};

const onDelete = async () => {
    if (isNew.value) return;

    // Show confirm
    const { isCanceled } = await reveal({
        title: 'Delete Channel?',
        text: 'Are you sure you want to delete this channel? This action cannot be undone.',
    });
    if (isCanceled) {
        return;
    }

    if (!confirm('Are you sure you want to delete this channel forever?')) {
        return;
    }

    try {
        await channelsApi.delete(channelBuffer);
        success({ title: 'Channel deleted successfully' });
        await router.push('/blog');
    } catch (err) {
        error({ title: 'Failed to delete channel', text: err instanceof Error ? err.message : 'Unknown error' });
    }
};

const onClose = () => {
    router.push('/blog');
};

// Page title
const pageTitle = computed(() => {
    if (isNew.value) return 'Create New Channel';
    return channelBuffer.name ? `Edit Channel: ${channelBuffer.name}` : 'Edit Channel';
});
</script>

<template>
    <div id="channel-editor-page" class="flex flex-col w-full min-h-screen">
        <!-- Header -->
        <div class="my-4 ml-auto">
            <div class="join">
                <button 
                    :disabled="waiting.value || isLoading" 
                    class="btn btn-primary join-item" 
                    form="channel-edit-form"
                >
                    <fa-icon icon="spinner" v-if="waiting.value" class="animate-spin" />
                    <span v-else>{{ isNew ? 'Create' : 'Save' }}</span>
                </button>
                <button class="btn join-item" @click="onClose">Cancel</button>
            </div>
        </div>

        <!-- Title -->
        <div class="mx-auto sm:min-w-[20rem] text-center">
            <h4>{{ pageTitle }}</h4>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="flex justify-center py-8">
            <fa-icon icon="spinner" class="animate-spin text-2xl" />
        </div>

        <!-- Channel form -->
        <div v-else id="channel-edit-body" class="min-h-[24rem] my-10">
            <form id="channel-edit-form" class="flex" @submit.prevent="onSubmit">
                <fieldset class="mx-auto flex flex-col gap-6 w-[32rem]">
                    
                    <!-- Channel Fields -->
                    <div class="space-y-4">
                        <h5 class="text-lg font-semibold">Channel Settings</h5>
                        
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text">Channel Name</span>
                            </label>
                            <input
                                type="text" 
                                class="input input-bordered w-full"
                                placeholder="Enter channel name"
                                v-model="channelVal.name.$model" 
                                :class="{'input-error': channelVal.name.$invalid && channelVal.name.$dirty}"
                            />
                            <div v-if="channelVal.name.$invalid && channelVal.name.$dirty" class="text-error text-sm mt-1">
                                <span v-for="error in channelVal.name.$errors" :key="error.$uid">{{ error.$message }}</span>
                            </div>
                        </div>

                        <div class="form-control">
                            <label class="label">
                                <span class="label-text">Base Directory</span>
                            </label>
                            <input
                                type="text" 
                                class="input input-bordered w-full"
                                placeholder="Enter base directory path"
                                v-model="channelVal.path.$model"
                                :class="{'input-error': channelVal.path.$invalid && channelVal.path.$dirty}"
                                :disabled="!isNew"
                            />
                            <div class="label">
                                <span class="label-text-alt">{{ isNew ? 'The base directory where this channel\'s content will be stored' : 'Cannot be changed after creation' }}</span>
                            </div>
                        </div>

                        <div class="form-control">
                            <label class="label">
                                <span class="label-text">Index File</span>
                            </label>
                            <input
                                type="text" 
                                class="input input-bordered w-full"
                                placeholder="posts.json"
                                v-model="channelVal.index.$model"
                                :class="{'input-error': channelVal.index.$invalid && channelVal.index.$dirty}"
                                :disabled="!isNew"
                            />
                            <div class="label">
                                <span class="label-text-alt">{{ isNew ? 'The name of the post index file' : 'Cannot be changed after creation' }}</span>
                            </div>
                        </div>

                        <div class="form-control">
                            <label class="label">
                                <span class="label-text">Content Directory</span>
                            </label>
                            <input
                                type="text" 
                                class="input input-bordered w-full"
                                placeholder="content"
                                v-model="channelVal.content.$model"
                                :class="{'input-error': channelVal.content.$invalid && channelVal.content.$dirty}"
                                :disabled="!isNew"
                            />
                            <div class="label">
                                <span class="label-text-alt">{{ isNew ? 'The directory name for storing content files' : 'Cannot be changed after creation' }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Feed Settings -->
                    <div class="divider"></div>
                    
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h5 class="text-lg font-semibold">RSS Feed Settings</h5>
                            <div class="form-control">
                                <label class="cursor-pointer label">
                                    <span class="label-text mr-2">Enable RSS Feed</span>
                                    <input type="checkbox" class="toggle toggle-primary" :checked="feedEnabled" @change="feedEnabled ? disableFeed() : {}">
                                </label>
                            </div>
                        </div>

                        <div v-if="feedEnabled" class="space-y-4">
                            <FeedFields :validator="feedVal" :feed-schema="feedSchema" />
                        </div>
                        
                        <div v-else class="alert alert-info">
                            <fa-icon icon="info-circle" />
                            <span>RSS feed is disabled for this channel</span>
                        </div>
                    </div>
                </fieldset>
            </form>
        </div>

        <!-- Delete button for existing channels -->
        <div v-if="!isNew && !isLoading" class="mt-4">
            <div class="mx-auto w-fit">
                <button 
                    class="btn btn-error" 
                    :disabled="waiting.value"
                    @click="onDelete"
                >
                    Delete Channel Forever
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.form-control {
    margin-bottom: 1rem;
}

.divider {
    margin: 2rem 0;
}
</style>