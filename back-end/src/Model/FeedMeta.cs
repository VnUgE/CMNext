/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: FeedMeta.cs 
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

using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

using FluentValidation;

using VNLib.Plugins.Extensions.Validation;

namespace Content.Publishing.Blog.Admin.Model
{
    internal class FeedMeta : IBlogFeedContext
    {
        private static readonly Regex FileNameRegex = new(@"^[a-zA-Z0-9_.\-]+$", RegexOptions.Compiled);
        private static readonly Regex HttpUrlRegex = new(@"^https?://", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        [JsonPropertyName("url")]
        public string PublihUrl { get; set; } = string.Empty;

        [JsonPropertyName("path")]
        public string FeedPath { get; set; } = string.Empty;

        [JsonPropertyName("image")]
        public string ImageUrl { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("maxItems")]
        public int? MaxItems { get; set; }

        [JsonPropertyName("author")]
        public string? Author { get; set; }

        [JsonPropertyName("contact")]
        public string? WebMaster { get; set; }

        [JsonPropertyName("properties")]
        public ExtendedProperty[]? ExtendedProperties { get; set; }


        public static IValidator<FeedMeta> GetValidator()
        {
            InlineValidator<FeedMeta> validator = new();

            validator.RuleFor(x => x.PublihUrl)
                .NotEmpty()
                .MaximumLength(200)
                .Matches(HttpUrlRegex)
                .WithMessage("Your feed url is not a valid http url");

            validator.RuleFor(x => x.FeedPath)
                .NotEmpty()
                .MaximumLength(200)
                .Must(static p => !p.StartsWith('/') && !p.StartsWith('\\'))
                .WithMessage("The feed file path must not contain a leading slash")
                .Matches(FileNameRegex)
                .WithMessage("The feed file name is not valid");

            validator.RuleFor(x => x.ImageUrl)
                .MaximumLength(200)
                .Must(static x => string.IsNullOrWhiteSpace(x) || HttpUrlRegex.IsMatch(x))
                .WithMessage("The image url is not a valid http url");

            validator.RuleFor(x => x.Description!)
                .NotEmpty()
                .IllegalCharacters()
                .MaximumLength(200);

            //Cap max items at 100
            validator.RuleFor(x => x.MaxItems)
                .InclusiveBetween(1, 100);

            validator.RuleFor(x => x.Author!)
                .SpecialCharacters()
                .MaximumLength(200);

            validator.RuleFor(x => x.WebMaster!)
                .IllegalCharacters()
                .MaximumLength(200);

            //Make sure the keys for each propery are valid
            validator.RuleForEach(x => x.ExtendedProperties)
                      .ChildRules(r => r.RuleFor(k => k.Name!).IllegalCharacters())
                      .When(x => x.ExtendedProperties != null);

            return validator;
        }
    }
}
