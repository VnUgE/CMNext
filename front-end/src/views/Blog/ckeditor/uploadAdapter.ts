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

import { IToaster } from "@vnuge/vnlib.browser";
import { isNil } from "lodash-es";
import type { AxiosRequestConfig } from "axios";
import type { Editor } from "@ckeditor/ckeditor5-core";
import type { UploadAdapter, UploadResponse, FileLoader } from '@ckeditor/ckeditor5-upload'
import { ContentStore } from "../../../store/cmnextAdminPlugin";

export type ApiCall = (callback: (data: any) => Promise<any>) => Promise<any>;
export type CKEditorPlugin = (editor: Editor) => void;

/**
 * Creates a CKEditor plugin that adds an upload adapter to the editor
 * @param content The content api instance
 * @param apiCall A callback function that wraps the api call
 * @returns A CKEditor plugin initializer
 */
export const useUploadAdapter = (content: ContentStore, apiCall: ApiCall, toaster?: IToaster): CKEditorPlugin =>{

    const createUploadAdapter = (loader: FileLoader): UploadAdapter => {

        const abortController = new AbortController();

        /**
        * Init request config local to  a
        */
        const requestConfig = {
            signal: abortController.signal,
            onUploadProgress: (progressEvent: ProgressEvent) => {
                loader.uploadTotal = progressEvent.total;
                loader.uploaded = Math.round(progressEvent.loaded * 100);
            }
        } as unknown as AxiosRequestConfig;

        const upload = async (): Promise<UploadResponse> => {
            //Get the file
            const file = await loader.file;

            if(isNil(file)){
                return{ default: '' }
            }

            //Exec server operations
            const url = await apiCall(async () => {

                //Upload the file
                const meta = await content.uploadContent(file, file.name, requestConfig);

                toaster?.info({
                    title: 'Upload Complete',
                    text: `Successfully uploaded file ${file.name} ID:${meta.id}`
                })

                //Get the public url
                return await content.getPublicUrl(meta);

            }) as string

            //Reload content
            content.refresh();

            //Default url as the returned file url
            return { default: url }
        }

        const abort = () => {
            abortController.abort('Upload aborted');
        }

        return { upload, abort }
    }

    return function (editor: Editor): void {
        //Add the upload adapter factory to the editor
        editor.plugins.get('FileRepository').createUploadAdapter = createUploadAdapter;
    };
}