/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: StorageExtensions.cs 
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

using System.IO;
using System.Threading;
using System.Threading.Tasks;

using VNLib.Utils.IO;
using VNLib.Net.Http;

using Content.Publishing.Blog.Admin.Model;

namespace Content.Publishing.Blog.Admin
{
    internal static class StorageExtensions
    {
        /// <summary>
        /// Writes a file of the given content type to the given path in the given channel context.
        /// </summary>
        /// <param name="storage"></param>
        /// <param name="context">The channel context to write the file in</param>
        /// <param name="data">The stream containing the file data to write to the storage layer</param>
        /// <param name="path">The relative path to the file within the context to write</param>
        /// <param name="ct">The file content type</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that completes when the file data has been written to the storage layer</returns>
        public static Task SetObjectDataAsync(this ISimpleFilesystem storage, IChannelContext context, Stream data, string path, ContentType ct, CancellationToken cancellation)
        {
            return storage.WriteFileAsync($"{context.BaseDir}/{path}", data, HttpHelpers.GetContentTypeString(ct), cancellation);
        }

        /// <summary>
        /// Removes an item from a pauth scoped within the given channel context
        /// </summary>
        /// <param name="storage"></param>
        /// <param name="context">The channel to scope the item into</param>
        /// <param name="path">The item path within the channel to delete</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that completes when the deletion operation has completed</returns>
        public static Task RemoveObjectAsync(this ISimpleFilesystem storage, IChannelContext context, string path, CancellationToken cancellation)
        {
            return storage.DeleteFileAsync($"{context.BaseDir}/{path}", cancellation);
        }

        /// <summary>
        /// Creates and loads a new <see cref="IRecordDb{T}"/> with the file data from the given path
        /// that resides in the given channel context
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="storage"></param>
        /// <param name="context">The channel context to get the file data from</param>
        /// <param name="fileName">The relative path inside the channel to load the database from</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that resolves the new <see cref="IRecordDb{T}"/> from file</returns>
        public static Task<IRecordDb<T>> LoadDbAsync<T>(this ISimpleFilesystem storage, IChannelContext context, string fileName, CancellationToken cancellation) where T : IRecord
        {
            return storage.LoadDbAsync<T>($"{context.BaseDir}/{fileName}", cancellation);
        }

        /// <summary>
        /// Stores the given <see cref="IRecordDb{T}"/> in the given channel context at the given file path
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="storage"></param>
        /// <param name="context">The channel context to write the database file inside</param>
        /// <param name="fileName">The path to the database file to overwrite</param>
        /// <param name="store">The database to capture the file data from</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that completes when the database has been stored</returns>
        public static Task StoreAsync<T>(this ISimpleFilesystem storage, IChannelContext context, string fileName, IRecordDb<T> store, CancellationToken cancellation)
        {
            return storage.StoreAsync($"{context.BaseDir}/{fileName}", store, cancellation);
        }

        /// <summary>
        /// Reads the file data from the given path that resides in the given channel context 
        /// and writes it to the given stream
        /// </summary>
        /// <param name="storage"></param>
        /// <param name="context">The channel context to read the file from</param>
        /// <param name="fileName">The realtive path within the channel to the file</param>
        /// <param name="stream">The stream to write the file data to from the storage layer</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that resolves the number of bytes read into the output stream</returns>
        public static Task<long> ReadFileAsync(this ISimpleFilesystem storage, IChannelContext context, string fileName, Stream stream, CancellationToken cancellation)
        {
            return storage.ReadFileAsync($"{context.BaseDir}/{fileName}", stream, cancellation);
        }

        /// <summary>
        /// Gets the external file path for the given path that exists in the given channel context
        /// </summary>
        /// <param name="storage"></param>
        /// <param name="context">The channel context that contains the item</param>
        /// <param name="path">The realtive path inside the channel to the item to get the path for</param>
        /// <returns>The full external path of the item</returns>
        public static string GetExternalFilePath(this ISimpleFilesystem storage, IChannelContext context, string path)
        {
            return storage.GetExternalFilePath($"{context.BaseDir}/{path}");
        }

        /// <summary>
        /// Stores the <see cref="IRecordDb{T}"/> at the given file path async
        /// </summary>
        /// <typeparam name="T">The record type</typeparam>
        /// <param name="storage"></param>
        /// <param name="store">The database to store</param>
        /// <param name="path">The file path to store the record at</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that completes when the operation has completed</returns>
        public static async Task StoreAsync<T>(this ISimpleFilesystem storage, string path, IRecordDb<T> store, CancellationToken cancellation)
        {
            //Alloc ms to write records to
            using VnMemoryStream ms = new();

            //Write the records to the stream
            store.Store(ms);

            await storage.WriteFileAsync(path, ms, HttpHelpers.GetContentTypeString(ContentType.Json), cancellation);
        }

        /// <summary>
        /// Creates a new <see cref="IRecordDb{T}"/> from the given object path and populates
        /// it with records from the file
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="storage"></param>
        /// <param name="objPath">The path to the stored database file</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>The populated <see cref="IRecordDb{T}"/>, if loading fails (file not found etc) the store will be returned empty</returns>
        public static async Task<IRecordDb<T>> LoadDbAsync<T>(this ISimpleFilesystem storage, string objPath, CancellationToken cancellation) where T : IRecord
        {
            //Create the db
            IRecordDb<T> db = JsonRecordDb<T>.Create();

            await storage.LoadDbAsync(objPath, db, cancellation);

            return db;
        }

        /// <summary>
        /// Populates the given <see cref="IRecordDb{T}"/> with records from the file at the given path
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="storage"></param>
        /// <param name="objPath">The path to the database file</param>
        /// <param name="db">The record database store ready to accept the database content</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that completes when the database has been populated</returns>
        public static async Task LoadDbAsync<T>(this ISimpleFilesystem storage, string objPath, IRecordDb<T> db, CancellationToken cancellation) where T : IRecord
        {
            //Mem stream to read the object into
            using VnMemoryStream ms = new();

            await storage.ReadFileAsync(objPath, ms, cancellation);

            //Load the db from the stream
            db.Load(ms);
        }

    }
}
