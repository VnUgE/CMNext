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

import { MaybeRef, computed, watch, Ref } from 'vue'
import { helpers, required, maxLength, numeric } from "@vuelidate/validators"
import { useVuelidateWrapper } from '@vnuge/vnlib.browser';
import { defer } from 'lodash-es'
import { BlogChannel, ChannelFeed } from '@vnuge/cmnext-admin';
import useVuelidate from "@vuelidate/core"

export const getChannelForm = (editMode?: Ref<boolean>) => {
    const channelSchema = computed(() => {
        return {
            fields: [
                {
                    id: 'channel-name',
                    type: 'text',
                    label: 'Channel Name',
                    name: 'name',
                    placeholder: 'Enter the name of the channel',
                    description: 'A simple human readable name for the channel'
                },
                {
                    id: 'channel-path',
                    type: 'text',
                    label: 'Root Path',
                    name: 'path',
                    placeholder: 'Enter the root path to the channel',
                    description: editMode?.value ? 'You may not edit the channel directory' : 'The path in your bucket to the working directory for the channel',
                    disabled: editMode?.value
                },
                {
                    id: 'channel-index',
                    type: 'text',
                    label: 'Index File',
                    name: 'index',
                    placeholder: 'Enter the index file for the channel',
                    description: editMode?.value ?
                        'You may not edit the index file path'
                        : 'The name or path of the post index file, stored under the root directory of the channel',
                    disabled: editMode?.value
                },
                {
                    id: 'channel-content-dir',
                    type: 'text',
                    label: 'Content Directory',
                    name: 'content',
                    placeholder: 'Enter the content directory for the channel',
                    description: editMode?.value ?
                        'You may not edit the content directory path'
                        : 'The name or path of the content directory, stored under the root directory of the channel',
                    disabled: editMode?.value
                },
                {
                    id: 'index-file-example',
                    type: 'text',
                    label: 'Index Path',
                    name: 'example',
                    placeholder: 'Your index file path',
                    description: 'This is the location within your bucket where the index file will be stored',
                    disabled: true,
                }
            ]
        }
    });

    const feedSchema = {
        fields: [
            {
                id: 'channel-feed-url',
                type: 'text',
                label: 'Publish Url',
                name: 'url',
                placeholder: 'Enter the feed url for the channel',
                description: 'The rss syndication url for your blog channel, the http url your blog resides at.'
            },
            {
                id: 'channel-feed-path',
                type: 'text',
                label: 'Feed File',
                name: 'path',
                placeholder: 'feed.xml',
                description: 'The path to the feed xml file within the channel directory'
            },
            {
                id: 'channel-feed-image',
                type: 'text',
                label: 'Image Url',
                name: 'image',
                placeholder: 'Enter the url for the default feed image',
                description: 'The full http url to the default feed image'
            },
            {
                id: 'channel-feed-author',
                type: 'text',
                label: 'Feed Author',
                name: 'author',
                placeholder: 'Your name',
                description: 'The author name for the feed'
            },
            {
                id: 'channel-feed-contact',
                type: 'text',
                label: 'Feed Contact',
                name: 'contact',
                placeholder: 'Your contact email address',
                description: 'The webmaster contact email address'
            },
            {
                id: 'channel-feed-max-items',
                type: 'number',
                label: 'Feed Max Items',
                name: 'maxItems',
                placeholder: 'Enter the feed max items for the channel',
                description: 'The maximum number of posts to publish in the feed'
            },
            {
                id: 'channel-feed-description',
                type: 'textarea',
                label: 'Feed Description',
                name: 'description',
                placeholder: 'Enter the feed description for the channel',
            }
        ]
    }

    const alphaNumSpace = helpers.regex(/^[a-zA-Z0-9\&\|\.\,\? ]*$/);
    const httpUrl = helpers.regex(/^(http|https):\/\/[^ "]+$/);

    const channelRules = {
        name: {
            required: helpers.withMessage('Channel name is required', required),
            maxlength: helpers.withMessage('Channel name must be less than 64 characters', maxLength(64)),
            alphaNumSpace: helpers.withMessage('Channel name must be alphanumeric', alphaNumSpace),
        },
        path: {
            required: helpers.withMessage('Channel path is required', required),
            maxlength: helpers.withMessage('Channel path must be less than 64 characters', maxLength(64)),
        },
        index: {
            required: helpers.withMessage('Channel index is required', required),
            maxlength: helpers.withMessage('Channel index must be less than 64 characters', maxLength(64)),
        },
        content: {
            required: helpers.withMessage('Channel content directory is required', required),
            maxlength: helpers.withMessage('Channel content directory must be less than 64 characters', maxLength(64)),
        },
        example: {}
    }

    const feedRules = {
        url: {
            required: helpers.withMessage('Channel feed url is required', required),
            maxlength: helpers.withMessage('Channel feed url must be less than 100 characters', maxLength(100)),
            url: helpers.withMessage('Channel feed url must be a valid url', httpUrl),
        },
        path: {
            required: helpers.withMessage('Channel feed path is required', required),
            maxlength: helpers.withMessage('Channel feed path must be less than 64 characters', maxLength(64)),
        },
        image: {
            maxlength: helpers.withMessage('Channel feed image must be less than 200 characters', maxLength(200)),
        },
        contact: {
            maxlength: helpers.withMessage('Channel feed contact must be less than 64 characters', maxLength(64)),
        },
        description: {
            alphaNumSpace: helpers.withMessage('Channel feed description must be alphanumeric', alphaNumSpace),
            maxlength: helpers.withMessage('Channel feed description must be less than 250 characters', maxLength(250)),
        },
        maxItems: {
            numeric: helpers.withMessage('Channel feed max items must be a number', numeric),
        },
        author: {
            alphaNumSpace: helpers.withMessage('Channel feed author must be alphanumeric', alphaNumSpace),
            maxlength: helpers.withMessage('Channel feed author must be less than 64 characters', maxLength(64)),
        }
    }

    const getChannelValidator = <T extends BlogChannel>(buffer: MaybeRef<T | undefined>) => {

        const v$ = useVuelidate(channelRules, buffer, { $lazy: true, $autoDirty: true });

        const updateExample = () => {
            if (!v$.value.path.$model || !v$.value.index.$model) {
                v$.value.example.$model = '';
                return;
            }
            //Update the example path
            v$.value.example.$model = `${v$.value.path.$model}/${v$.value.index.$model}`;
        }

        watch(v$, updateExample);

        defer(() => updateExample());

        const { validate } = useVuelidateWrapper(v$);
        return { v$, validate, reset: v$.value.$reset };
    }

    const getFeedValidator = <T extends ChannelFeed>(buffer: MaybeRef<T | undefined>) => {
        const v$ = useVuelidate(feedRules, buffer, { $lazy: true, $autoDirty: true });
        const { validate } = useVuelidateWrapper(v$);
        return { v$, validate, reset: v$.value.$reset };
    }

    return {
        channelSchema,
        feedSchema,
        channelRules,
        feedRules,
        getChannelValidator,
        getFeedValidator
    };
}

