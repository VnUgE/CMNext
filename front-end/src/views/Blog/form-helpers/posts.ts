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

import { PostMeta } from "@vnuge/cmnext-admin";
import { object, string, array, date, Schema } from "yup";

export const getPostFormSchema = (): Schema<PostMeta> => {
    const schema = object().shape({
        title: string()
            .required("Post title is required")
            .max(64, "Post title must be less than 64 characters")
            .matches(/^[a-zA-Z0-9\?\\\&\|\\/\-\.\, ]*$/, "Post title must be alphanumeric"),
        summary: string()
            .required("Post summary is required")
            .max(250, "Post summary must be less than 250 characters"),
        author: string()
            .required("Post author is required")
            .max(64, "Post author must be less than 64 characters"),
        tags: array().of(string()), // Assuming tags is an array of strings
        image: string()
            .max(200, "Post image must be less than 200 characters")
            .matches(/^(http|https):\/\/[^ "]+$/, "Post image must be a valid http URL"),
        content: string()
            .required("Post content is required")
            .max(50000, "Post content must be less than 50000 characters"),
        id: string().nullable(), // Assuming id is optional
        created: date().nullable(), // Assuming created is a date and optional
    });

    return schema;
};