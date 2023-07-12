/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: BlogChannel.cs 
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

namespace Content.Publishing.Blog.Admin.Model
{
    internal class BlogChannel : IChannelContext
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("name")]
        public string BlogName { get; set; } = "";

        [JsonPropertyName("path")]
        public string BaseDir { get; set; } = "";

        /*
         * Configure some defaults if the user does not 
         * specify them during channel creation.
         */

        [JsonPropertyName("index")]
        public string IndexPath { get; set; } = "index.json";

        [JsonPropertyName("content")]
        public string? ContentDir { get; set; } = "/content";

        [JsonPropertyName("feed")]
        public FeedMeta? Feed { get; set; }

        [JsonIgnore]
        public long Date { get; set; }
    }
}
