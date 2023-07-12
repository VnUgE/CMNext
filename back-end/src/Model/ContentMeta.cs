/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: ContentMeta.cs 
*
* CMNext is free software: you can redistribute it and/or modify 
* it under the terms of the GNU Affero General Public License as 
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* CMNext is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program. If not, see https://www.gnu.org/licenses/.
*/

using System;
using System.Text.Json.Serialization;

using FluentValidation;

using VNLib.Plugins.Extensions.Validation;

namespace Content.Publishing.Blog.Admin.Model
{
    internal class ContentMeta : IRecord
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("date")]
        public long Date { get; set; }

        [JsonPropertyName("name")]
        public string? FileName { get; set; }

        [JsonPropertyName("content_type")]
        public string? ContentType { get; set; }

        [JsonPropertyName("length")]
        public long Length { get; set; }

        [JsonPropertyName("path")]
        public string? FilePath { get; set; }

        public static IValidator<ContentMeta> GetValidator()
        {
            InlineValidator<ContentMeta> validationRules = new ();

            validationRules.RuleFor(meta => meta.Id)
                .NotEmpty()
                .MaximumLength(64);

            //Check filename
            validationRules.RuleFor(meta => meta.FileName)
                .NotEmpty()
                .MaximumLength(200)
                .IllegalCharacters();

            return validationRules;
        }
    }
}
