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

import { defaultTo, startsWith } from 'lodash-es';
import { ChannelApi, createScopedChannelApi } from "./channels";
import { CMNextApi, CMNextAutoConfig, CMNextIndex, PostMeta } from "./types";

export interface PostApi extends CMNextApi<PostMeta> {
    /**
     * Gets the content for a post by its Id
     * @param postId The id of the post to fetch content for
     * @returns A promise that resolves to the post content as a string
     */
    getPostContent: (post: string | PostMeta, extension?:string) => Promise<string>;
    /**
    * Gets the index file path for the channel
    */
    getIndexFilePath(): Promise<string>
}

/**
 * A post api created from an automatic configuration
 */
export interface AutoPostApi extends PostApi, CMNextAutoConfig {
    /**
     * The channel api pass-thru
     */
    readonly channelApi: ChannelApi;
}

/**
 * A post api created from a manual configuration
 */
export interface ManualPostApi extends PostApi, PostApiManualConfig {
}

export interface PostApiManualConfig {
    /**
     * The root directory path of the desired channel
     */
    readonly channelRootDir: string;
    /**
     * The relative path to the channel's post index file
     */
    readonly postIndexPath: string;
    /**
     * The relative path to the channel's content directory
     */
    readonly contentDir: string;
}


/**
 * Creates a post api around the channel index file and the desired channel id
 * to get posts from. This method requires an additional fetch to get the channel
 * information before it can fetch posts, so it will be slower, but its
 * discovery is automatic.
 * @param channelUrl The url to the channel index file
 * @param channelId The id of the channel to get posts from
 * @returns A post api that can be used to get posts from the channel
 */
export const createAutoPostApi = ({ cmsChannelIndexPath, channelId }: CMNextAutoConfig): AutoPostApi => {
    //Use scoped channel api
    const channelApi = createScopedChannelApi(cmsChannelIndexPath, channelId);

    const getIndex = async (): Promise<CMNextIndex<PostMeta>> => {
        //Await the selected channel index
        const indexUrl = await channelApi.getPostIndexPath();
        
        if (!indexUrl){
            //Return empty index
            return { date: 0, records: [], version: "0.0.0" }
        }

        //Fetch the index file
        const res = await fetch(indexUrl)
        return await res.json()
    }

    const getPostContent = async (post: PostMeta | string, extension = '.html'): Promise<string> => {
        //Get the selected channel
        const contentDir = await channelApi.getContentDir();
        const baseDir = await channelApi.getBaseDir();

        if (!contentDir || !baseDir){
            //Return empty content
            return ""
        }

        const itemId = defaultTo(post.id, post)

        //Fetch the content as text because it is html
        const res = await fetch(`${baseDir}${contentDir}/${itemId}${extension}`)
        return await res.text()
    }

    const getIndexFilePath = async () : Promise<string> => {
        const indexUrl = await channelApi.getPostIndexPath();
        return indexUrl || ""
    }

    return{
        channelApi,
        getPostContent,
        channelId,
        getIndexFilePath,
        getIndex,
        cmsChannelIndexPath,
    }

}

/**
 * Creates a post api around known channel information to avoid additional fetch
 * requests to get the channel information. This method is faster, but requires
 * the channel information to be known and remain constant.
 * @param baseUrl The base url of the desired channel 
 * @param indexFilePath The path to the index file within the channel
 * @param contentDir The path to the content directory within the channel
 * @returns A post api that can be used to get posts from the channel
 */
export const createManualPostApi = ({ channelRootDir, contentDir, postIndexPath }: PostApiManualConfig): ManualPostApi => {

    //Make sure inedx file has a leading slash
    postIndexPath = startsWith(postIndexPath, '/') ? postIndexPath : `/${postIndexPath}`
    contentDir = startsWith(contentDir, '/') ? contentDir : `/${contentDir}`

    const getItemPath = (path: string) => `${channelRootDir}${path}`

    const getIndex = async (): Promise<CMNextIndex<PostMeta>> => {
        //Fetch the index file
        const res = await fetch(getItemPath(postIndexPath))
        return await res.json()
    }

    const getPostContent = async (post: PostMeta | string, extension = '.html'): Promise<string> => {
        //Get the content url
        const contentUrl = `${getItemPath(contentDir)}/${defaultTo(post.id, post)}${extension}`

        //Fetch the content as text because it is html
        const res = await fetch(contentUrl)
        return await res.text()
    }

    const getIndexFilePath = async () : Promise<string> => {
        return getItemPath(postIndexPath)
    }

    return{
        getIndex,
        channelRootDir,
        contentDir,
        postIndexPath,
        getPostContent,
        getIndexFilePath
    }
}