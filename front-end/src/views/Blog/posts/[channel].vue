<script setup lang="ts">
import { computed } from 'vue';
import { useRouteParams, useRouteQuery } from '@vueuse/router';
import { get } from '@vueuse/core';
import { isNil, find, filter } from 'lodash-es';
import { PostMeta } from '@vnuge/cmnext-admin';
import { useConfirm, apiCall } from '@vnuge/vnlib.browser';
import { useStore } from '../../../store';

type SortType = 'created' | 'title' | 'author' | 'lastUpdated';

const store = useStore();
const { reveal } = useConfirm();

// Set page title
store.setPageTitle('Channel Posts');

// Get channel ID from route parameters
const channelId = useRouteParams<string>('channel', '');
// Get optional query parameters for filtering/searching
const search = useRouteQuery<string>('search', '', { mode: 'push' });
const sort = useRouteQuery<SortType>('sort', 'created', { mode: 'push' });

// Create scoped stores for this channel
const posts = store.createPostStore(channelId);
const channel = computed(() => {
    const channels = get(store.channels.all)
    const id = get(channelId)
    return find(channels, { id });
});

// Computed values
const pageTitle = computed(() => `Posts in ${channel.value?.name}`);
const hasChannel = computed(() => !isNil(channel.value));
const hasPosts = computed(() => posts.all.value.length > 0);

const sortedPosts = computed(() => {
    if (!hasPosts.value) return [];

    let sorted = get(posts.all.value);

    // Sort by date
    if (sort.value === 'created') {
        sorted.sort((a, b) => b.date - a.date);
    }
    // Sort by title
    else if (sort.value === 'title') {
        sorted.sort((a, b) => a.title!.localeCompare(b.title!));
    }
    // Sort by author
    else if (sort.value === 'author') {
        sorted.sort((a, b) => a.author?.localeCompare(b.author!));
    }
    // Sort by last updated
    else if (sort.value === 'lastUpdated') {
        sorted.sort((a, b) => (b.lastUpdated || b.date) - (a.lastUpdated || a.date));
    }

    // Filter by search term
    if (search.value) {
        sorted = filter(sorted, post => {
            return post.title?.toLowerCase().includes(search.value.toLowerCase()) ||
                post.summary?.toLowerCase().includes(search.value.toLowerCase());
        });
    }

    return sorted;
})

// Post operations
const onDeletePost = async (post: PostMeta) => {
    const { isCanceled } = await reveal({
        title: 'Delete Post?',
        text: `Are you sure you want to delete post "${post.title}"? This action cannot be undone.`,
    });
    
    if (isCanceled) return;

    await apiCall(async ({ toaster }) => {
        
        await posts.delete(post);
        
        toaster.general.success({
            title: 'Post Deleted',
            text: `Post "${post.title}" has been deleted successfully.`,
        });
    });

    posts.refresh();
};

// Utility functions
const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
};

const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

</script>

<template>
    <div id="channel-posts-page" class="flex flex-col w-full min-h-screen">
        <!-- Header -->
        <div class="navbar bg-base-100 shadow-sm mb-6">
            <div class="navbar-start">
                <router-link :to="`/blog/channels/${channelId}`" class="btn btn-ghost">
                    <fa-icon icon="arrow-left" />
                    Back to Blog
                </router-link>
            </div>
            
            <div class="navbar-center">
                <h1 class="text-xl font-bold">{{ pageTitle }}</h1>
            </div>
            
            <div class="navbar-end">
                <div class="join">
                    <router-link 
                        class="btn btn-primary join-item" 
                        :to="`/blog/posts/new?channel=${channelId}`"
                    >
                        <fa-icon icon="plus" />
                        New Post
                    </router-link>
                    <router-link 
                        class="btn btn-secondary join-item" 
                        :to="`/blog/channels/edit?id=${channelId}`"
                    >
                        <fa-icon icon="cog" />
                        Settings
                    </router-link>
                </div>
            </div>
        </div>

        <!-- Channel info and search -->
        <div class="max-w-6xl w-full mx-auto px-4 mb-6">
            <div v-if="store.channels.all.isLoading" class="flex justify-center py-8">
                <fa-icon icon="spinner" class="animate-spin text-2xl" />
            </div>
            
            <div v-else-if="channel" class="bg-base-200 rounded-lg p-4 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-semibold">{{ channel.name }}</h2>
                        <p class="text-sm opacity-75">{{ channel.path }}</p>
                        <p v-if="channel.feed" class="text-sm text-success">
                            <fa-icon icon="rss" /> RSS Feed Enabled
                        </p>
                    </div>
                    <div class="stats shadow">
                        <div class="stat">
                            <div class="stat-value text-primary">{{ posts.all.value.length }}</div>
                            <div class="stat-title">Total Posts</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Search and filter controls -->
            <div class="flex gap-4 items-center mb-4">
                <div class="form-control flex-1">
                    <input 
                        type="text" 
                        class="input input-bordered w-full" 
                        placeholder="Search posts..."
                        v-model="search"
                    />
                </div>
                <div class="form-control">
                    <select class="select select-bordered" v-model="sort">
                        <option value="created">Sort by Date</option>
                        <option value="title">Sort by Title</option>
                        <option value="author">Sort by Author</option>
                        <option value="lastUpdated">Sort by Last Updated</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Posts List -->
        <div class="max-w-6xl mx-auto px-4 flex-1">
            <!-- Loading indicator -->
            <div v-if="posts.isLoading.value" class="flex justify-center py-12">
                <fa-icon icon="spinner" class="animate-spin text-3xl" />
            </div>

            <!-- No channel selected -->
            <div v-else-if="!hasChannel" class="text-center py-12">
                <fa-icon icon="exclamation-triangle" class="text-6xl text-warning mb-4" />
                <h3 class="text-2xl font-bold mb-2">No Channel Selected</h3>
                <p class="text-lg opacity-75 mb-4">Please select a channel to view its posts.</p>
                <router-link to="/blog/channels" class="btn btn-primary">
                    Go to Blog Dashboard
                </router-link>
            </div>

            <!-- No posts found -->
            <div v-else-if="!hasPosts" class="text-center py-12">
                <fa-icon icon="file-alt" class="text-6xl text-base-300 mb-4" />
                <h3 class="text-2xl font-bold mb-2">No Posts Yet</h3>
                <p class="text-lg opacity-75 mb-4">This channel doesn't have any posts yet.</p>
                <router-link 
                    class="btn btn-primary" 
                    :to="`/blog/posts/new?channel=${channelId}`"
                >
                    <fa-icon icon="plus" />
                    Create First Post
                </router-link>
            </div>

            <!-- Posts grid -->
            <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div 
                    v-for="post in sortedPosts" 
                    :key="post.id"
                    class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
                >
                    <div class="card-body">                       
                        <h3 class="card-title">
                            {{ post.title || 'Untitled Post' }}
                        </h3>
                        
                        <p v-if="post.summary" class="text-sm opacity-75">
                            {{ truncateText(post.summary, 120) }}
                        </p>
                        
                        <div class="text-xs opacity-60 mt-2">
                            <p v-if="post.author">By {{ post.author }}</p>
                            <p v-if="post.date">{{ formatDate(post.date) }}</p>
                            <p v-if="post.tags && post.tags.length > 0">
                                Tags: {{ post.tags.slice(0, 3).join(', ') }}
                                <span v-if="post.tags.length > 3">...</span>
                            </p>
                        </div>
                        
                        <div class="card-actions justify-end mt-4">
                            <div class="join">
                                <router-link 
                                    class="btn btn-sm btn-primary join-item" 
                                    :to="`/blog/posts/edit?channel=${channelId}&post=${post.id}`"
                                    title="Edit Post"
                                >
                                    <fa-icon icon="edit" />
                                </router-link>
                                <router-link 
                                    class="btn btn-sm btn-secondary join-item" 
                                    :to="`/blog/content?channel=${channelId}`"
                                    title="Copy Link"
                                >
                                    <fa-icon icon="link" />
                                </router-link>
                                <button 
                                    class="btn btn-sm btn-error join-item" 
                                    @click="onDeletePost(post)"
                                    title="Delete Post"
                                >
                                    <fa-icon icon="trash" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer spacing -->
        <div class="h-8"></div>
    </div>
</template>

<style scoped>

.stats .stat {
    place-items: center;
}

.card:hover {
    transform: translateY(-2px);
    transition: transform 0.2s ease-in-out;
}

.btn-group .btn:first-child {
    border-top-left-radius: 0.5rem;
    border-bottom-left-radius: 0.5rem;
}

.btn-group .btn:last-child {
    border-top-right-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
}

</style>