/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: IRssFeedGenerator.cs 
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

using System.Collections.Generic;

using VNLib.Utils.IO;

using Content.Publishing.Blog.Admin.Model;

namespace Content.Publishing.Blog.Admin
{
    /// <summary>
    /// Represents a class that can generate an RSS feed from a collection of posts.
    /// </summary>
    internal interface IRssFeedGenerator
    {
        /// <summary>
        /// Builds an XML RSS feed from the given posts and writes it to the given output stream.
        /// </summary>
        /// <param name="context">The channel context containing feed information</param>
        /// <param name="posts">The collection of posts to publish to the feed</param>
        /// <param name="output">The output stream</param>
        void BuildFeed(IChannelContext context, IEnumerable<PostMeta> posts, VnMemoryStream output);
    }
}
