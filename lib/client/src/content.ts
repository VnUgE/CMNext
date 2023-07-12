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

import { startsWith } from "lodash";
import { CMNextApi, CMNextAutoConfig, CMNextEntity, CMNextIndex, ContentMeta } from "./types";
import { createScopedChannelApi } from "./channels";

export interface ContentApi extends CMNextApi<ContentMeta> {

    /**
     * Gets the public url for the content item to load 
     * in the page
     * @param item 
     */
    getContentUrl(item: ContentMeta | CMNextEntity): Promise<string>;

    /**
     * Fetches the raw string content for the given item and returns a string
     * of the content
     * @param item The content item to fetch the content for
     */
    getStringContent(item: ContentMeta | CMNextEntity): Promise<string>;
}

export interface ContentApiManualConfig {
    /**
    * The root directory path of the desired channel
    */
    readonly channelRootDir: string;
    /**
     * The relative path to the channel's content directory
     */
    readonly contentDir: string;
    /**
     * The relative path to the channel's content index file
     */
    readonly contentIndexPath: string;
}

/**
 * Creates a manual content api for the given manual content config, that
 * uses the known endpoint constants to avoid extra netowrk requests when 
 * getting content. 
 * @param param0 The CMNext configuration for the manual content api
 * @returns The manual content api
 */
export const createManualContentApi = ({ channelRootDir, contentIndexPath, contentDir }: ContentApiManualConfig): ContentApi => {
    
    //Make sure the content dir begins with a slash
    contentDir = startsWith(contentDir, '/') ? contentDir : `/${contentDir}`

    const getIndex = async () : Promise<CMNextIndex<ContentMeta>> => {
        const res = await fetch(`${channelRootDir}/${contentIndexPath}`)
        return await res.json()
    }
    
    const getContentUrl = async (item: ContentMeta): Promise<string> => {
        //Content resides in the content dir within the channel dir
        return `${channelRootDir}${contentDir}/${item.path}`
    }

    const getStringContent = async (item: ContentMeta): Promise<string> => {
        const url = await getContentUrl(item);
        const res = await fetch(url)
        return await res.text()
    }

    return { getIndex, getContentUrl, getStringContent }
}

/**
 * Creates an automatic content api for the given auto content config, that 
 * uses the known global CMS catalog and the id of a channel to get content for
 * then discovers the required config from the channel. This api will cause multple
 * network requests to the CMS to discover the CMS configuration automatically.
 * @param param0 The CMNext configuration for the auto content api
 * @returns The automatic discovery content api
 */
export const createAutoContentApi = ({ cmsChannelIndexPath, channelId }: CMNextAutoConfig): ContentApi => {

    const channelApi = createScopedChannelApi(cmsChannelIndexPath, channelId);

    const getIndex = async () : Promise<CMNextIndex<ContentMeta>> => {
        //Get the content index path from the channel api
        const contentIndexPath = await channelApi.getContentIndexPath()
        if(!contentIndexPath){
            return { version : '0.0.0', records: [], date: 0 } 
        }
        //Fetch the content index
        const res = await fetch(contentIndexPath)
        return await res.json()
    }

    const getContentUrl = async (item: ContentMeta): Promise<string> => {
        //Content resides in the content dir within the channel dir
        const contentDir = await channelApi.getContentDir();
        return contentDir ? `${contentDir}/${item.path}` : ''
    }

    const getStringContent = async (item: ContentMeta): Promise<string> => {
        //Get the url of the item then fetch it
        const url = await getContentUrl(item);
        const res = await fetch(url)
        return await res.text()
    }

    return { getIndex, getContentUrl, getStringContent }
}