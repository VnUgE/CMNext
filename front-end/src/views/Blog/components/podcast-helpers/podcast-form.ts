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

import * as yup from 'yup';
import type { ContentMeta, FeedProperty } from '@vnuge/cmnext-admin';

export interface EnclosureEntity {
    fileId: string;
    contentUrl: string;
    contentLength: number;
    contentType: string;
    explicit: boolean;
}

export interface PodcastEntity extends EnclosureEntity {
    episodeType: string;
    duration: number;
}

export const getPodcastForm = () => {
    const podcastSchema = yup.object({
        fileId: yup
            .string()
            .required('The file id is required')
            .max(64, 'The file id must be less than 64 characters')
            .matches(/^[a-zA-Z0-9]*$/, 'The file id must be alpha numeric'),
        episodeType: yup
            .string()
            .required('The episode type is required')
            .max(64, 'The episode type must be less than 64 characters')
            .matches(/^[a-zA-Z0-9]*$/, 'The episode type must be alpha numeric'),
        duration: yup
            .number()
            .required('The duration is required')
            .typeError('The duration must be a number'),
        contentUrl: yup
            .string()
            .required('The content url is required')
            .max(256, 'The content url must be less than 256 characters'),
        contentLength: yup
            .number()
            .required('The content length is required')
            .typeError('The content length must be a number'),
        contentType: yup
            .string()
            .required('The content type is required')
            .max(64, 'The content type must be less than 64 characters')
            .matches(/^[a-zA-Z0-9\/]*$/, 'The content type must be in MIME format'),
        explicit: yup.boolean()
    })

    const setEnclosureContent = (enclosure: EnclosureEntity, content: ContentMeta, url: string) => {
        enclosure.fileId = content.id;
        enclosure.contentLength = content.length
        enclosure.contentType = content.content_type;
        enclosure.contentUrl = url;
    }

    const exportProperties = (podcast: PodcastEntity): FeedProperty[] => {
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
                name: "enclosure",
                attributes: {
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
        podcastSchema,
        setEnclosureContent,
        exportProperties
    };
}

