// Copyright (C) 2023 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { UseOffsetPaginationReturn } from '@vueuse/core';
import { Dictionary } from 'lodash';
import { Ref } from 'vue';

export enum QueryType {
    Post = 'post',
    Channel = 'channel',
    Content = 'content',
    ChannelEdit = 'ecid',
    Filter = 'filter',
    Sort = 'sort',
    PageSize = 'size',
}

export enum SortType {
    CreatedTime = 'created',
    ModifiedTime = 'date',
}

/**
 * A base blog entity that has a globally unique id and a date
 */
export interface BlogEntity{
    /**
     * The globally unique id of the entity
     */
    readonly id: string;
    /**
     * The date the entity was last modified
     */
    readonly date: number;
}

/**
 * A blog entity that has a name and/or a title
 */
export interface NamedBlogEntity extends BlogEntity {
    /**
     * The name of the entity
     */
    readonly name?: string;
    /**
     * The title of the entity or item
     */
    readonly title?: string;
}


export interface FeedProperty {
    name: string;
    value?: string;
    namespace?: string;
    attributes?: Dictionary<string>;
    properties?: FeedProperty[];
}

export interface XmlPropertyContainer {
    properties?: FeedProperty[];
}

export interface ChannelFeed extends XmlPropertyContainer {
    url: string;
    path: string;
    image: string;
    copyright?: string;
    maxItems?: number;
    description?: string;
    contact?: string;
}

export interface BlogChannel extends BlogEntity {
    name: string;
    path: string;
    index: string;
    feed?: ChannelFeed;
    content?: string;
}

export interface ContentMeta extends NamedBlogEntity {
    readonly content_type: string;
    readonly length: number;
    readonly path: string;
}

/**
 * Represents a blog post's meta data in the catalog
 */
export interface PostMeta extends NamedBlogEntity, XmlPropertyContainer {
    readonly created ?: number;
    summary?: string;
    author?: string;
    tags?: string[];
    image?: string;
}

/**
 * Represents the channel api and its operations
 */
export interface ChannelApi {
    /**
    * Gets all blog channels from the server
    * @returns An array of blog channels
    */
    getChannels: () => Promise<BlogChannel[]>;
    /**
     * Delets a blog channel from the catalog
     * @param channel The channel to delete
     */
    deleteChannel: (channel: BlogChannel) => Promise<void>;
    /**
     * Adds a channel to the catalog
     * @param channel The channel to add
     */
    addChannel: (channel: BlogChannel, feed?: ChannelFeed) => Promise<BlogChannel>;
    /**
     * Updates a channel in the catalog
     * @param channel The channel to update
     */
    updateChannel: (channel: BlogChannel, feed?: ChannelFeed) => Promise<BlogChannel>;
}

export interface PostApi {
    /**
    * Gets all blog posts from the server
    * @param channel The channel to get posts from
    * @returns An array of blog posts
   */
    getPosts: () => Promise<PostMeta[]>;
    /**
     * Deletes a post from the given channel by its id
     * @param channel The channel the post belongs to
     * @param post The post to delete
     * @returns The response from the server
     */
    deletePost: (post: PostMeta) => Promise<void>;
    /**
     * Publishes a new post to the given channel
     * @param channel The blog channel to publish to
     * @param post The post to publish
     * @returns The response from the server
     */
    publishPost: (post: PostMeta) => Promise<PostMeta>;
    /**
    * Updates a post in the given channel
    * @param channel The channel the post belongs to
    * @param post The post to update
    * @returns The response from the server
    */
    updatePost: (post: PostMeta) => Promise<PostMeta>;
    /**
     * Gets the post meta data for a single post by its id
     * @param postId The id of the post to get
     * @returns The post meta data
     */
    getSinglePost: (postId: string) => Promise<PostMeta>;
}

export interface ContentApi {
    /**
     * Gets the content for a post as text
     * @param post The post to get the content for
     * @returns A promise that resolves to the content string
     */
    getPostContent(post: BlogEntity): Promise<string>;
    /**
     * Gets all content meta objects for the current channel
     * @returns A promise that resolves to an array of content meta objects
     */
    getAllContent(): Promise<ContentMeta[]>;
    /**
     * Deletes a content meta object from the server in the current channel
     * @param content The content meta object to delete
     */
    deleteContent(content: ContentMeta): Promise<void>;
    /**
     * Uploads a content file to the server in the current channel
     * @param content The content file to upload
     * @param name The name of the content file
     * @returns A promise that resolves to the content meta object for the uploaded content
     */
    uploadContent(data: File, name: string): Promise<ContentMeta>;
    /**
     * Updates the content for a post in the current channel
     * @param post The post to update the content for
     * @param content The post content to update
     * @returns A promise that resolves to the content meta object for the updated content
     */
    updatePostContent(post: PostMeta, content: string): Promise<ContentMeta>;
    /**
    * Updates the name of a content meta object in the current channel
    * @param content The content meta object to update
    * @param name The new name for the content
    * @returns A promise that resolves when the content has been updated
    */
    updateContentName(content: ContentMeta, name: string): Promise<ContentMeta>;
    /**
     * Gets the relative public url of the content meta object
     * @param content The content meta object to get the public url for
     * @returns The public url for the content
     */
    getPublicUrl(content: ContentMeta): Promise<string>;
    /**
     * Allows you to overwrite the content for a content meta object
     * @param content The content meta object to update
     * @param data The new content data file
     */
    updateContent(content: ContentMeta, data: File): Promise<ContentMeta>;
}

/**
 * Represents a collection of items that can be paginated, such as posts or content
 */
export interface CanPaginate<T> {
    /**
     * A reactive collection of items within the store
     */
    readonly items: Readonly<Ref<T[]>>;
    /**
     * Gets the global query state
     */
    getQuery(): Readonly<QueryState>
}

export interface ComputedBlogApi<T> extends CanPaginate<T>{
    readonly selectedId: Ref<string>;
    readonly selectedItem : Readonly<Ref<T | undefined>>;
}

export interface ComputedPosts extends PostApi, ComputedBlogApi<PostMeta> {
}

/**
 * The current state of the query
 */
export interface QueryState {
    readonly post: Ref<string>;
    readonly channel: Ref<string>;
    readonly content: Ref<string>;
    readonly channelEdit: Ref<string>;
    readonly search: Ref<string>;
    readonly sort: Ref<SortType>;
}


export interface SortedFilteredPaged<T>{
    readonly items : Readonly<Ref<T[]>>;
    readonly pagination: UseOffsetPaginationReturn;
}

export interface BlogAdminContext {
    getQuery(): QueryState;
    getPostUrl(): string;
    getContentUrl(): string;
    getChannelUrl(): string;
}