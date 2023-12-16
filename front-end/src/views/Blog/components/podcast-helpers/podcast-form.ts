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

import { computed, Ref } from 'vue';
import { helpers, required, maxLength, alphaNum, numeric } from "@vuelidate/validators"
import { useVuelidate } from "@vuelidate/core"
import { MaybeRef } from '@vueuse/core';
import { useVuelidateWrapper } from '@vnuge/vnlib.browser';
import type { ContentMeta, FeedProperty } from '@vnuge/cmnext-admin';

export interface EnclosureEntity{
    fileId: string;
    contentUrl: string;
    contentLength: number;
    contentType: string;
    explicit: boolean;
}

export interface PodcastEntity extends EnclosureEntity{
    episodeType: string;
    duration: number;
}

export const getPodcastForm = (editMode?: Ref<boolean>) => {
    const schema = computed(() => {
        return {
            fields: [
                {
                    id: 'episode-type',
                    type: 'text',
                    label: 'Episode Type',
                    name: 'episodeType',
                    placeholder: '',
                    description: 'The itunes episode type, typically "full" or "trailer"',
                },
                {
                    id: 'episode-duration',
                    type: 'text',
                    label: 'Duration',
                    name: 'duration',
                    placeholder: '',
                    description: 'The duration in seconds for the episode',
                },
                {
                    id: 'ep-content-id',
                    type: 'text',
                    label: 'File Id',
                    name: 'fileId',
                    placeholder: '',
                    disabled: true,
                },
                {
                    id: 'content-url',
                    type: 'text',
                    label: 'Content url',
                    name: 'contentUrl',
                    placeholder: '',
                    disabled: true,
                },
                {
                    id: 'content-length',
                    type: 'text',
                    label: 'Content length',
                    name: 'contentLength',
                    placeholder: '',
                    disabled: true,
                },
                {
                    id: 'content-type',
                    type: 'text',
                    label: 'MIME content type',
                    name: 'contentType',
                    placeholder: '',
                    disabled: true,
                }
            ]
        }
    });


    const alphaNumSlash = helpers.regex(/^[a-zA-Z0-9\/]*$/);

    const rules = {
        fileId: {
            required:helpers.withMessage('The file id is required', required),
            maxLength: helpers.withMessage('The file id must be less than 64 characters', maxLength(64)),
            alphaNumeric: helpers.withMessage('The file id must be alpha numeric', alphaNum)
        },
        episodeType: {
            required: helpers.withMessage('The episode type is required', required),
            maxLength: helpers.withMessage('The episode type must be less than 64 characters', maxLength(64)),
            alphaNumeric: helpers.withMessage('The episode type must be alpha numeric', alphaNum)
        },
        duration: {
            required: helpers.withMessage('The duration is required', required),
            numeric: helpers.withMessage('The duration must be a number', numeric)
        },
        contentUrl: {
            required: helpers.withMessage('The content url is required', required),
            maxLength: helpers.withMessage('The content url must be less than 256 characters', maxLength(256))
        },
        contentLength: {
            required: helpers.withMessage('The content length is required', required),
            numeric: helpers.withMessage('The content length must be a number', numeric)
        },
        contentType: {
            required: helpers.withMessage('The content type is required', required),
            maxLength: helpers.withMessage('The content type must be less than 64 characters', maxLength(64)),
            alphaNumeric: helpers.withMessage('The content type must be in MIME format', alphaNumSlash)
        }
    }

    const getValidator = <T extends PodcastEntity>(buffer: MaybeRef<T>) => {
        const v$ = useVuelidate(rules, buffer, { $lazy: true, $autoDirty: true });
        const { validate } = useVuelidateWrapper(v$);

        return { v$, validate, reset: v$.value.$reset };
    }

    const setEnclosureContent = (enclosure: EnclosureEntity, content: ContentMeta, url: string) => {
        enclosure.fileId = content.id;
        enclosure.contentLength = content.length
        enclosure.contentType = content.content_type;
        enclosure.contentUrl = url;
    }

    const exportProperties = (podcast: PodcastEntity) : FeedProperty[] => {
        return [
            { 
                name: 'episodeType', 
                namespace: 'itunes',
                value: podcast.episodeType
            },
            {
                name: 'duration',
                namespace: 'itunes',
                value: podcast.duration?.toString()
            },
            //Setup the enclosure
            {
                name:"enclosure",
                attributes:{
                    url: podcast.contentUrl,
                    length: podcast.contentLength?.toString(),
                    type: podcast.contentType
                },
            },
            {
                name: 'explicit',
                namespace: 'itunes',
                value: podcast.explicit ? 'true' : 'false'
            }
        ]
    } 

    return {
        schema,
        rules,
        getValidator,
        setEnclosureContent,
        exportProperties
    };
}

