/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: BlogPost.cs 
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

using FluentValidation;

using VNLib.Plugins.Extensions.Validation;

namespace Content.Publishing.Blog.Admin.Model
{
    internal class BlogPost : PostMeta
    {

        public static IValidator<BlogPost> GetValidator()
        {
            InlineValidator<BlogPost> validator = new();

            validator.RuleFor(x => x.Title!)
                .NotEmpty()
                .IllegalCharacters()
                .MaximumLength(200);

            validator.RuleFor(x => x.Summary!)
                .NotEmpty()
                .IllegalCharacters()
                .MaximumLength(200);

            validator.RuleFor(x => x.Author!)
                .NotEmpty()
                .IllegalCharacters()
                .MaximumLength(64);

            return validator;
        }
    }
}
