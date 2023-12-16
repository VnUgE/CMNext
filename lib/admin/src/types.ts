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

import type { UseOffsetPaginationReturn } from '@vueuse/core';
import type { Axios, AxiosRequestConfig } from 'axios';
import type { Dictionary } from 'lodash';
import type { Ref } from 'vue';

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
    html_description?: string;
}

export interface BlogApi<T extends BlogEntity> {
    /**
     * Gets all blog entities from the server
     * @returns An array of entities
     */
    getAllItems(): Promise<T[]>;

    /**
     * Deletes an entity from the server
     * @param item The entity to delete
     */
    delete(item: T): Promise<void>;

    /**
     * Deletes an array of entities from the server
     * @param item The entities to delete
     */
    delete(item: T[]): Promise<void>;

    /**
     * Adds an entity to the server
     * @param item The entity to add
     */
    add(item: T): Promise<T>;

    /**
     * Updates an entity on the server
     * @param item The entity to update
     */
    update(item: T): Promise<T>;
}

/**
 * Represents the channel api and its operations
 */
export interface ChannelApi extends BlogApi<BlogChannel> {
    add(item: BlogChannel, feed?: ChannelFeed): Promise<BlogChannel>;
}

export interface PostApi extends BlogApi<PostMeta> {
    /**
     * Gets the post meta data for a single post by its id
     * @param postId The id of the post to get
     * @returns The post meta data
     */
    getSinglePost: (postId: string) => Promise<PostMeta>;
}

export interface ContentApi {
    /**
    * Gets all blog entities from the server
    * @returns An array of entities
    */
    getAllItems(): Promise<ContentMeta[]>;
    /**
    * Deletes an entity from the server
    * @param item The entity to delete
    */
    delete(item: ContentMeta): Promise<void>;
    /**
     * Deletes an array of entities from the server
     * @param item The entities to delete
     */
    delete(item: ContentMeta[]): Promise<void>;
    /**
     * Gets the content for a post as text
     * @param post The post to get the content for
     * @returns A promise that resolves to the content string
     */
    getPostContent(post: BlogEntity): Promise<string>;
    /**
     * Gets a single content meta object by its id
     * @param id The id of the content meta object to get
     * @returns A promise that resolves to the content meta object
     */
    getContent(id: string): Promise<ContentMeta | undefined>;
    /**
     * Uploads a content file to the server in the current channel
     * @param content The content file to upload
     * @param name The name of the content file
     * @returns A promise that resolves to the content meta object for the uploaded content
     */
    uploadContent(data: File, name: string, config?: AxiosRequestConfig): Promise<ContentMeta>;
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
    updateContent(content: ContentMeta, data: File, config?:AxiosRequestConfig): Promise<ContentMeta>;
    /**
     * Downloads the content data file for the given content meta object
     * @param content The content meta object to download
     */
    downloadContent(content: ContentMeta): Promise<Blob>;
}

/**
 * Represents a collection of items that can be paginated, such as posts or content
 */
export interface CanPaginate<T> {
    /**
     * A reactive collection of items within the store
     */
    readonly items: Readonly<Ref<T[]>>;

    readonly sort: Readonly<Ref<string>>;

    readonly search: Readonly<Ref<string>>;
}

export interface SortedFilteredPaged<T>{
    readonly items : Readonly<Ref<T[]>>;
    readonly pagination: UseOffsetPaginationReturn;
}

export interface BlogAdminContext {
    getPostUrl(): string;
    getContentUrl(): string;
    getChannelUrl(): string;
    getAxios(): Axios;
}