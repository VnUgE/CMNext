/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: ChannelManager.cs 
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

using VNLib.Hashing;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

using Content.Publishing.Blog.Admin.Storage;

namespace Content.Publishing.Blog.Admin.Model
{

    [ConfigurationName("blog_channels")]
    internal sealed class ChannelManager : IChannelContextManager
    {
        private readonly IStorageFacade Storage;
        private readonly string _indexPath;


        public ChannelManager(PluginBase plugin, IConfigScope config)
        {
            //Init minio client
            Storage = plugin.GetOrCreateSingleton<ManagedStorage>();

            _indexPath = config["index_file_name"].GetString() ?? "channels.json";
        }

        ///<inheritdoc/>
        public async Task<bool> CreateChannelAsync(BlogChannel context, CancellationToken cancellation)
        {
            _ = context.Id ?? throw new ArgumentNullException(nameof(context.Id));

            IRecordDb<BlogChannel> db = await LoadDb(cancellation);

            BlogChannel? existing = db.GetRecord(context.Id);

            //Make sure the id is unique
            if (existing != null)
            {
                return false;
            }

            //Add to the index
            db.SetRecord(context);

            //Publish updated index to storage
            await StoreDb(db, cancellation);

            return true;
        }

        ///<inheritdoc/>
        public async Task<bool> UpdateChannelAsync(BlogChannel channel, CancellationToken cancellation)
        {
            _ = channel.Id ?? throw new ArgumentNullException(nameof(channel.Id));

            IRecordDb<BlogChannel> db = await LoadDb(cancellation);

            //Get the original context for the channel
            _ = db.GetRecord(channel.Id) ?? throw new KeyNotFoundException("The requested channel does not exist");

            //Add the updated context to the index
            db.SetRecord(channel);

            //Publish updated index to storage
            await StoreDb(db, cancellation);

            return true;
        }

        ///<inheritdoc/>
        public async Task DeleteChannelAsync(IChannelContext context, CancellationToken cancellation)
        {
            _ = context?.Id ?? throw new ArgumentNullException(nameof(context));

            IRecordDb<BlogChannel> db = await LoadDb(cancellation);

            //Remove from the index
            db.RemoveRecord(context.Id);

            //Delete the channel dir
            await Storage.DeleteFileAsync(context.BaseDir, cancellation);

            //Publish updated index to storage
            await StoreDb(db, cancellation);
        }

        /// <summary>
        /// Computes the unique id for a context
        /// </summary>
        /// <param name="context">The context to produce the context id for</param>
        /// <returns>The unique context id</returns>
        public static string ComputeContextId(IChannelContext context)
        {
            //Context-id is the hash of the base dir and index file path
            return ManagedHash.ComputeHexHash($"{context.BaseDir}/{context.IndexPath}", HashAlg.SHA1).ToLowerInvariant();
        }

        ///<inheritdoc/>
        public async Task<IChannelContext?> GetChannelAsync(string id, CancellationToken cancellation)
        {
            //Recover the db
            IRecordDb<BlogChannel> db = await LoadDb(cancellation);

            //Get the channel
            return db.GetRecord(id);
        }

        ///<inheritdoc/>
        public async Task<object[]> GetAllContextsAsync(CancellationToken cancellation)
        {
            //Recover the db
            IRecordDb<BlogChannel> db = await LoadDb(cancellation);

            //Get the channel
            return db.GetRecords().ToArray();
        }

       
        private Task<IRecordDb<BlogChannel>> LoadDb(CancellationToken cancellation)
        {
            return Storage.LoadDbAsync<BlogChannel>(_indexPath, cancellation);
        }

        private Task StoreDb(IRecordDb<BlogChannel> db, CancellationToken cancellation)
        {
            return Storage.StoreAsync(_indexPath, db, cancellation);
        }

    }
}
