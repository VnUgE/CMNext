/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: PostManager.cs 
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
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

using Minio;
using Minio.Handlers;
using Minio.DataModel.Tracing;

using VNLib.Hashing;
using VNLib.Utils.IO;
using VNLib.Utils.Logging;
using VNLib.Net.Http;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

using Content.Publishing.Blog.Admin.Storage;

namespace Content.Publishing.Blog.Admin.Model
{

    internal sealed class PostManager : IBlogPostManager
    {
        private readonly ISimpleFilesystem Storage;
        private readonly IRssFeedGenerator FeedGenerator;
        private readonly ContentManager ContentMan;

        public PostManager(PluginBase plugin)
        {
            //Get minio client
            Storage = plugin.GetOrCreateSingleton<ManagedStorage>();

            //Get feed generator
            FeedGenerator = plugin.GetOrCreateSingleton<FeedGenerator>();

            //Get content manager
            ContentMan = plugin.GetOrCreateSingleton<ContentManager>();
        }

        ///<inheritdoc/>
        public async Task<PostMeta?> GetPostAsync(IChannelContext context, string postId, CancellationToken cancellation)
        {
            _ = context ?? throw new ArgumentNullException(nameof(context));
            _ = postId ?? throw new ArgumentNullException(nameof(postId));

            //Read the index into memory
            IRecordDb<PostMeta> db = await GetPostIndexAsync(context, cancellation);

            //Get the post meta
            return db.GetRecord(postId);
        }

        ///<inheritdoc/>
        public async Task<PostMeta[]> GetPostsAsync(IChannelContext context, CancellationToken cancellation)
        {
            _ = context ?? throw new ArgumentNullException(nameof(context));

            //Read the index into memory
            IRecordDb<PostMeta> db = await GetPostIndexAsync(context, cancellation);

            //Return post metas
            return db.GetRecords().ToArray();
        }

        ///<inheritdoc/>
        public async Task PublishPostAsync(IChannelContext context, PostMeta post, CancellationToken cancellation)
        {
            _ = context ?? throw new ArgumentNullException(nameof(context));
            _ = post ?? throw new ArgumentNullException(nameof(post));

            //Read the index into memory
            IRecordDb<PostMeta> db = await GetPostIndexAsync(context, cancellation);

            //Update index modifed time and post date
            post.Date = post.Created = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            //Compute post id before publishing to storage
            ComputePostId(post);

            //Add post to the index
            db.SetRecord(post);

            //Update the index
            await SetPostIndexAsync(context, db, cancellation);

            //Create empty post content
            await ContentMan.CreateNewPostContent(context, post.Id!, cancellation);
        }

        ///<inheritdoc/>
        public async Task DeletePostAsync(IChannelContext context, string postId, CancellationToken cancellation)
        {
            _ = context ?? throw new ArgumentNullException(nameof(context));
            _ = postId ?? throw new ArgumentNullException(nameof(postId));

            //Get the index
            IRecordDb<PostMeta> db = await GetPostIndexAsync(context, cancellation);

            //Remove the post from the index if it exists
            PostMeta? post = db.GetRecord(postId);

            if (post == null)
            {
                return;
            }

            db.RemoveRecord(postId);

            //Remove post content before flushing db changes
            await ContentMan.DeleteContentAsync(context, postId, cancellation);

            //update feed after post deletion
            await UpdateIndexAndFeed(context, db, cancellation);
        }

        ///<inheritdoc/>
        public async Task<bool> UpdatePostAsync(IChannelContext context, PostMeta post, CancellationToken cancellation)
        {
            _ = context ?? throw new ArgumentNullException(nameof(context));
            _ = post?.Id ?? throw new ArgumentNullException(nameof(post));

            //Get the index
            IRecordDb<PostMeta> db = await GetPostIndexAsync(context, cancellation);

            //Try to get the post by its id
            PostMeta? oldMeta = db.GetRecord(post.Id);

            if (oldMeta == null)
            {
                return false;
            }

            //Update modified time
            post.Date = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            //Save old time
            post.Created = oldMeta.Created;

            //Remove the old post meta
            db.SetRecord(post);

            //Update the index and feed after post update
            await UpdateIndexAndFeed(context, db, cancellation);

            return true;
        }

        /// <summary>
        /// Updates the index and feed for all posts for the given channel.
        /// </summary>
        /// <param name="context">The channel context to update the feed for</param>
        /// <param name="cancellation">A token to cancel the operatio</param>
        /// <returns>A task that completes when the channel feed has been updated</returns>
        /// <exception cref="ArgumentNullException"></exception>
        public async Task UpdateFeedForChannelAsync(IChannelContext context, CancellationToken cancellation)
        {
            _ = context ?? throw new ArgumentNullException(nameof(context));

            //Get the index
            IRecordDb<PostMeta> db = await GetPostIndexAsync(context, cancellation);

            //Update the index and feed after post update
            await UpdateIndexAndFeed(context, db, cancellation);
        }

        private async Task UpdateIndexAndFeed(IChannelContext context, IRecordDb<PostMeta> index, CancellationToken cancellation)
        {
            //Write the index back to the bucket
            await Storage.StoreAsync(context, context.IndexPath, index, cancellation);

            //Update feed
            if (context.Feed != null)
            {
                await UpdateRssFeed(context, index.GetRecords(), cancellation);
            }
        }

        private async Task UpdateRssFeed(IChannelContext context, IEnumerable<PostMeta> meta, CancellationToken cancellation)
        {
            using VnMemoryStream feedData = new();

            //Build the feed from posts
            FeedGenerator.BuildFeed(context, meta, feedData);

            //Rewind the feed stream
            feedData.Seek(0, System.IO.SeekOrigin.Begin);

            //Write the feed to the bucket
            await Storage.SetObjectDataAsync(context, feedData, context.Feed!.FeedPath, ContentType.Rss, cancellation);
        }

        #region Load/Store Db

        private Task<IRecordDb<PostMeta>> GetPostIndexAsync(IChannelContext channel, CancellationToken cancellation)
        {
            //Read the index into memory
            return Storage.LoadDbAsync<PostMeta>(channel, channel.IndexPath, cancellation);
        }

        private Task SetPostIndexAsync(IChannelContext channel, IRecordDb<PostMeta> db, CancellationToken cancellation)
        {
            //Read the index into memory
            return Storage.StoreAsync(channel, channel.IndexPath, db, cancellation);
        }

        #endregion

        /*
         * Computes a post id based on its meta information and produces a sha1 hash
         * to use as a unique id for the post
         */
        static void ComputePostId(PostMeta post)
        {
            post.Id = ManagedHash.ComputeHexHash($"{post.Title}.{post.Author}.{post.Summary}.{post.Date}", HashAlg.SHA1).ToLowerInvariant();
        }

        internal record class ReqLogger(ILogProvider Log) : IRequestLogger
        {
            public void LogRequest(RequestToLog requestToLog, ResponseToLog responseToLog, double durationMs)
            {
                Log.Debug("S3 result\n{method} {uri} HTTP {ms}ms\nHTTP {status} {message}\n{content}",
                    requestToLog.Method, requestToLog.Resource, durationMs,
                    responseToLog.StatusCode, responseToLog.ErrorMessage, responseToLog.Content
                    );
            }
        }
    }
}
