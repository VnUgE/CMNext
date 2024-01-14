/*
* Copyright (c) 2024 Vaughn Nugent
* 
* Package: CMNext.Cli
* File: Program.cs 
*
* CMNext.Cli is free software: you can redistribute it and/or modify 
* it under the terms of the GNU General Public License as published
* by the Free Software Foundation, either version 2 of the License,
* or (at your option) any later version.
*
* CMNext.Cli is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
* General Public License for more details.
*
* You should have received a copy of the GNU General Public License 
* along with CMNext.Cli. If not, see http://www.gnu.org/licenses/.
*/

using CMNext.Cli.Site;

using System;

using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using VNLib.Net.Rest.Client.Construction;


namespace CMNext.Cli.Model.Posts
{
    public sealed class PostStore(CMNextSiteAdapter Site, string ChannelId) : ICMNextStore<PostMeta>
    {
        public async Task DeleteAsync(string id, CancellationToken cancellation)
        {
            await Site.BeginRequest(new DeletePostMetaRequest(ChannelId, id))
                .ExecAsync(cancellation);
        }

        public Task CreateAsync(PostMeta entity, CancellationToken cancellation)
        {
            return Site.BeginRequest(new CreatePostMetaRequest(ChannelId, entity))
                .ExecAsync(cancellation);
        }

        public Task<PostMeta?> GetAsync(string id, CancellationToken cancellation)
        {
            return Site.BeginRequest(new GetPostMetaRequest(ChannelId, id))
                .ExecAsync(cancellation)
                .AsJson<PostMeta>()!;
        }

        public async Task<PostMeta[]> ListAsync(CancellationToken cancellation)
        {
            PostMeta[]? index = await Site
                .BeginRequest(new ListPostMetaRequest(ChannelId))
                .ExecAsync(cancellation)
                .AsJson<PostMeta[]>();

            //As long as the server is real, this should error or return a valid index.
            return index ?? [];
        }

        public Task UpdateAsync(PostMeta entity, CancellationToken cancellation)
        {
            return Site.BeginRequest(new SetPostMetaRequest(ChannelId, entity))
                .ExecAsync(cancellation);
        }
    }

    public class PostMeta : ICMNextEntity
    {
        [JsonPropertyName("id")]
        public string Id { get; }

        [JsonPropertyName("date")]
        public long Date { get; }

        [JsonPropertyName("created")]
        public long Created { get; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("summary")]
        public string? Description { get; set; }

        [JsonPropertyName("tags")]
        public string[]? Tags { get; set; }

        [JsonPropertyName("image")]
        public string? Image { get; set; }

        [JsonPropertyName("html_description")]
        public string? HtmlDescription { get; set; }

        /// <summary>
        /// Gets a value that an existing post is in podcast mode, and 
        /// stores a copy of the post's HTML description on the entity 
        /// record itself.
        /// </summary>
        public bool PodcastMode => Id != null && !string.IsNullOrWhiteSpace(HtmlDescription);
    }
}