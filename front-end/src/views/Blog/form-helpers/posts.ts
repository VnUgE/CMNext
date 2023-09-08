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

import { MaybeRef, computed } from "vue";
import { useVuelidateWrapper } from "@vnuge/vnlib.browser"
import { PostMeta } from '@vnuge/cmnext-admin'
import { helpers, required, maxLength } from "@vuelidate/validators"
import useVuelidate from "@vuelidate/core"

export const getPostForm = () => {

    const schema = computed(() => {
        return {
            fields: [
                {
                    id: 'post-title',
                    type: 'text',
                    label: 'Post Title',
                    name: 'title',
                    placeholder: 'Enter the title of the post'
                },
                {
                    id: 'post-author',
                    type: 'text',
                    label: 'Post Author',
                    name: 'author',
                    placeholder: 'The author of the post',
                },
                {
                    id: 'post-tags',
                    type: 'text',
                    label: 'Post Tags',
                    name: 'tags',
                    placeholder: 'Ex: tag1,tag2',
                },
                {
                    id: 'post-image',
                    type: 'text',
                    label: 'Post Image',
                    name: 'image',
                    placeholder: 'Enter the full external image url',
                },
                {
                    id: 'post-summary',
                    type: 'textarea',
                    label: 'Post Summary',
                    name: 'summary',
                    placeholder: 'Enter the summary of the post',
                    description: 'A short summary of the post, also the description for the rss feed'
                },
                {
                    id: 'existing-post-id',
                    type: 'text',
                    label: 'Post Id',
                    name: 'id',
                    placeholder: '',
                    disabled: true,
                }
            ]
        }
    });

    const alphaNumSpace = helpers.regex(/^[a-zA-Z0-9\?\\\&\|\\/\-\.\, ]*$/);
    const httpUrl = helpers.regex(/^(http|https):\/\/[^ "]+$/);

    const rules = {
        title: {
            required: helpers.withMessage('Post title is required', required),
            maxlength: helpers.withMessage('Post title must be less than 64 characters', maxLength(64)),
            alphaNumSpace: helpers.withMessage('Post title must be alphanumeric', alphaNumSpace),
        },
        summary: {
            required: helpers.withMessage('Post summary is required', required),
            maxlength: helpers.withMessage('Post summary must be less than 250 characters', maxLength(250)),
        },
        author: {
            required: helpers.withMessage('Post author is required', required),
            maxlength: helpers.withMessage('Post author must be less than 64 characters', maxLength(64)),
        },
        tags: {},
        image: {
            maxlength: helpers.withMessage('Post image must be less than 200 characters', maxLength(200)),
            httpUrl: helpers.withMessage('Post image must be a valid http url', httpUrl),
        },
        content: {
            required: helpers.withMessage('Post content is required', required),
            maxLength: maxLength(50000),
        },
        id: {}
    }

    const getValidator = <T extends PostMeta>(buffer: MaybeRef<T | undefined>) => {
        const v$ = useVuelidate(rules, buffer, { $lazy: true, $autoDirty: true });
        const { validate } = useVuelidateWrapper(v$);
        return { v$, validate, reset: v$.value.$reset };
    }

    return { schema, rules, getValidator };
}