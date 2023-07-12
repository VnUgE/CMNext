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

export interface CMNextAutoConfig{
    /**
     * The url to the global channel catalog index
     */
    readonly cmsChannelIndexPath: string;
    /**
     * The id of the channel to load
     */
    readonly channelId: string;
}


/**
 * Represents a 1:1 mapping of a blog index to
 * the CMS representation of the index
 */
export interface CMNextIndex<T>{
    /**
     * The collection of records in the index
     */
    readonly records: T[];
    /**
     * The date the index was last modified in unix seconds
     */
    readonly date: number;
    /**
     * The version of the index
     */
    readonly version: string;
}

/**
 * A base blog entity that has a globally unique id and a date
 */
export interface CMNextEntity {
    /**
     * The globally unique id of the entity
     */
    readonly id: string;
    /**
     * The date the entity was last modified in unix seconds
     */
    readonly date: number;
}

/**
 * A uniform api for the CMNext cms
 */
export interface CMNextApi<T> {
    /**
     * Gets the index file from the configured endpoint
     */
    getIndex(): Promise<CMNextIndex<T>>;
}


/**
 * A channel configuration entity
 */
export interface ChannelMeta extends CMNextEntity {
    /**
     * The base path of the channel
     */
    readonly path: string;
    /**
     * The realtive path of the channel's index file
     */
    readonly index: string;
    /**
     * The realtive directory within the channel to the channel's content
     */
    readonly content: string;
    /**
     * Optiona channel feed configuration
     */
    readonly feed?: ChannelFeed;
}

/**
 * A channel's feed configuration
 */
export interface ChannelFeed {
    /**
     * The public url the feed points to, aka the public url to this channel
     */
    readonly url: string;
    /**
     * The realtive path to the channel's rss feed xml file within the channel
     */
    readonly path: string;
    /**
     * The url to the image for this channel
     */
    readonly image?: string;
    /**
     * The description of the channel
     */
    readonly description?: string;
    /**
     * The author of the channel
     */
    readonly author?: string;
    /**
     * The webmaster contact email for the channel
     */
    readonly contact?: string;
}

/**
 * A blog post entity and its metadata
 */
export interface PostMeta extends CMNextEntity {
    /**
     * The title of the post
     */
    readonly title?: string;
    /**
     * The summary of the post
     */
    readonly summary?: string;
    /**
     * The author of the post
     */
    readonly author?: string;
    /**
     * The date the post was created in unix seconds
     */
    readonly created?: number;
    /**
     * The post tags for categorization
     */
    readonly tags: string[];
    /**
     * The post's image, assumed to be an absolute url
     */
    readonly image?: string;
}

export interface ContentMeta extends CMNextEntity {
    /**
     * The relative path to the content file within the 
     * content directory of the channel
     */
    readonly path: string;
    /**
     * The name of the content file
     */
    readonly name: string;
    /**
     * The content type of the content file
     */
    readonly content_type: string;
    /**
     * The length of the content file in bytes
     */
    readonly length: number;
}
