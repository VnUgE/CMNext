/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: ContentManager.cs 
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
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Content.Publishing.Blog.Admin.Storage;

using VNLib.Hashing;
using VNLib.Utils.IO;
using VNLib.Net.Http;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

namespace Content.Publishing.Blog.Admin.Model
{
    internal sealed class ContentManager
    {
        private const string ContentIndex = "content.json";

        private readonly ISimpleFilesystem Storage;

        public ContentManager(PluginBase plugin)
        {
            //Load the minio client manager
            Storage = plugin.GetOrCreateSingleton<ManagedStorage>();
        }

        /// <summary>
        /// Gets the content meta object for the given content item by its id
        /// </summary>
        /// <param name="channel">The channel that contains the desired content</param>
        /// <param name="metaId">The id of the object</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>The content meta item if found in the store</returns>
        public async Task<ContentMeta?> GetMetaAsync(IChannelContext channel, string metaId, CancellationToken cancellation)
        {
            //Get the content index
            IRecordDb<ContentMeta> contentIndex = await Storage.LoadDbAsync<ContentMeta>(channel, ContentIndex, cancellation);

            //Get the content meta
            return contentIndex.GetRecord(metaId);
        }

        /// <summary>
        /// Overwrites the content index with the given content index
        /// </summary>
        /// <param name="channel">The channel to set the content for</param>
        /// <param name="meta">The contne meta to update</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that completes when the operation has completed</returns>
        /// <exception cref="ArgumentNullException"></exception>
        public async Task SetMetaAsync(IChannelContext channel, ContentMeta meta, CancellationToken cancellation)
        {
            _ = meta.Id ?? throw new ArgumentNullException(nameof(meta));

            //Get the content index
            IRecordDb<ContentMeta> contentIndex = await Storage.LoadDbAsync<ContentMeta>(channel, ContentIndex, cancellation);

            //Set the content meta
            contentIndex.SetRecord(meta);

            //Save the content index
            await StoreContentIndex(channel, contentIndex, cancellation);
        }

        /// <summary>
        /// Initializes a new content meta object for a new content item
        /// </summary>
        /// <param name="length">The length of the new content item</param>
        /// <returns>An initializes <see cref="ContentMeta"/> ready for a new content item</returns>
        public ContentMeta GetNewMetaObject(long length, string? fileName, ContentType ct)
        {
            string fileId = RandomHash.GetRandomBase32(16).ToLowerInvariant();
           
            return new()
            {
                Id = fileId,
                Length = length,
                FileName = fileName,
                //File path from ct
                FilePath = GetFileNameFromTypeOrExtension(fileId, ct, fileName)
            };
        }

        /// <summary>
        /// Gets all content items in the given channel
        /// </summary>
        /// <param name="context">The channel to get content items for</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>The collection of content items for the channel</returns>
        public async Task<ContentMeta[]> GetAllContentItemsAsync(IChannelContext context, CancellationToken cancellation)
        {
            //Get the content index
            IRecordDb<ContentMeta> contentIndex = await Storage.LoadDbAsync<ContentMeta>(context, ContentIndex, cancellation);

            //Return all content items
            return contentIndex.GetRecords().ToArray();
        }

        /// <summary>
        /// Reads content from the store and writes it to the output stream
        /// </summary>
        /// <param name="channel">The channel that contains the content</param>
        /// <param name="metaId">The id of the content item to read</param>
        /// <param name="output">The stream to write the file data to</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>The meta object that contains the content metadata if found, null if the content was not found in the directory</returns>
        public async Task<ContentMeta?> GetContentAsync(IChannelContext context, string metaId, Stream output, CancellationToken cancellation)
        {
            //Get the content index
            IRecordDb<ContentMeta> contentIndex = await Storage.LoadDbAsync<ContentMeta>(context, ContentIndex, cancellation);

            //Get the content meta
            ContentMeta? meta = contentIndex.GetRecord(metaId);

            //Read the content
            if (meta?.Id != null)
            {
                await Storage.ReadFileAsync(context, GetFilePath(context, meta), output, cancellation);
            }

            return meta;
        }

        /// <summary>
        /// Adds content to the store
        /// </summary>
        /// <param name="context">The blog channel to store the data in</param>
        /// <param name="meta">The content meta of the data to store</param>
        /// <param name="data">The data stream to store</param>
        /// <param name="ct">The content type of the data to store</param>
        /// <param name="cancellation"></param>
        /// <returns>A task that complets when the content has been added to the store</returns>
        public async Task SetContentAsync(IChannelContext context, ContentMeta meta, Stream data, ContentType ct, CancellationToken cancellation)
        {
            //Update content type
            meta.ContentType = HttpHelpers.GetContentTypeString(ct);

            //update time
            meta.Date = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            //update length
            meta.Length = data.Length;

            //Get the content index
            IRecordDb<ContentMeta> contentIndex = await GetContentIndex(context, cancellation);

            //Add the content meta to the store
            contentIndex.SetRecord(meta);

            //try to update the index before writing content
            await StoreContentIndex(context, contentIndex, cancellation);

            //Write the content
            await Storage.SetObjectDataAsync(context, data, GetFilePath(context, meta), ct, cancellation);
        }

        /// <summary>
        /// Creates a new content item in the store with no content for a given post id
        /// </summary>
        /// <param name="context">The channel context to create the item for</param>
        /// <param name="postId">The id of the post to create content for</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that represents the async create operation</returns>
        public async Task CreateNewPostContent(IChannelContext context, string postId, CancellationToken cancellation)
        {
            //Create the content meta for the post as an empty html file
            ContentMeta meta = new()
            {
                ContentType = HttpHelpers.GetContentTypeString(ContentType.Html),
                Date = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                FileName = $"Content for post {postId}",
                Id = postId,
                Length = 0,
                FilePath = GetFileNameFromTypeOrExtension(postId, ContentType.Html, null),
            };

            //Get the content index
            IRecordDb<ContentMeta> contentIndex = await GetContentIndex(context, cancellation);

            //Add the content meta to the store
            contentIndex.SetRecord(meta);

            //try to update the index before writing content
            await StoreContentIndex(context, contentIndex, cancellation);
        }

        /// <summary>
        /// Deletes content from the store by its id
        /// </summary>
        /// <param name="context">The blog context to delete the item from</param>
        /// <param name="id"></param>
        /// <param name="cancellation"></param>
        /// <returns></returns>
        public async Task<bool> DeleteContentAsync(IChannelContext context, string id, CancellationToken cancellation)
        {
            //get the content index
            IRecordDb<ContentMeta> contentIndex = await GetContentIndex(context, cancellation);

            //Get the post meta
            ContentMeta? meta = contentIndex.GetRecord(id);

            //Delete content before deleting the meta
            if (meta?.Id == null)
            {
                return false;
            }

            //Remove the content meta from the store
            contentIndex.RemoveRecord(id);

            //Remove the content from storage first
            await Storage.RemoveObjectAsync(context, GetFilePath(context, meta), cancellation);

            //Overwrite the content index
            await StoreContentIndex(context, contentIndex, cancellation);

            return true;
        }

        /// <summary>
        /// Gets the external path for the given item id.
        /// </summary>
        /// <param name="context">The context the item resides in</param>
        /// <param name="id">The id of the item to get the path for</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>The external path of the item, or null if the item does not exist</returns>
        public async Task<string?> GetExternalPathForItemAsync(IChannelContext context, string metaId, CancellationToken cancellation)
        {
            //Get the content index
            IRecordDb<ContentMeta> contentIndex = await Storage.LoadDbAsync<ContentMeta>(context, ContentIndex, cancellation);

            //Get the content meta
            ContentMeta? meta = contentIndex.GetRecord(metaId);

            //Read the content
            if (meta?.Id == null)
            {
                return null;
            }

            //Get the full item path
            return Storage.GetExternalFilePath(context, GetFilePath(context, meta));
        }


        private async Task<IRecordDb<ContentMeta>> GetContentIndex(IChannelContext context, CancellationToken cancellation)
        {
            //Get the content index
            IRecordDb<ContentMeta> contentIndex = await Storage.LoadDbAsync<ContentMeta>(context, ContentIndex, cancellation);

            //Return the content index
            return contentIndex;
        }

        private async Task StoreContentIndex(IChannelContext channel, IRecordDb<ContentMeta> contentIndex, CancellationToken cancellation)
        {
            //Store the content index
            await Storage.StoreAsync(channel, ContentIndex, contentIndex, cancellation);
        }


        private static string GetFilePath(IChannelContext context, ContentMeta meta)
        {
            return $"{context.ContentDir}/{meta.FilePath}";
        }

        private static string GetFileNameFromTypeOrExtension(string fileId, ContentType type, string? fileName)
        {
            /*
             * Allow file extension pass through for servers that require it. Content type
             * translation is sometimes inaccurate due to the chain of events that occur. 
             * It seems that often the browsers have a very outdated MIME type list and 
             * privacy browsers may choose to obfuscate the exacte type for privacy reasons.
             * 
             * So passing the extension through to the outside world allows the web server to
             * choose. 
             */
            if(Path.HasExtension(fileName))
            {
                string extension = Path.GetExtension(fileName);
                return $"{fileId}{extension}";              
            }
            else
            {
                //Create file path from its id and file extension
                string extension = type switch
                {
                    ContentType.Javascript => ".js",
                    _ => type.ToString().ToLowerInvariant(),
                };

                return $"{fileId}.{extension}";
            }
        }
    }
}
