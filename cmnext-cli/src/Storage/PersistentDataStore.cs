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


using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.IO.IsolatedStorage;

using VNLib.Utils.Extensions;

using VNLib.Utils.IO;
using VNLib.Utils.Memory;
using Typin.Console;

namespace CMNext.Cli.Storage
{
    public sealed class PersistentDataStore
    {
        private readonly IsolatedStorageDirectory _dir;
        private readonly CancellationToken _cancellation;

        /// <summary>
        /// Creates a new isolated storage store with the provided name
        /// that can be used to store and retreive <see cref="IStorable"/>
        /// data.
        /// </summary>
        /// <param name="storeName">The directory name to store data in</param>
        /// <returns>The new <see cref="PersistentDataStore"/></returns>
        public PersistentDataStore(IConsole console)
        {
            //Isolated storage for the current user scoped to the application
            IsolatedStorageFile isf = IsolatedStorageFile.GetUserStoreForApplication();
            _dir = new(isf, Program.StorePath);
            _cancellation = console.GetCancellationToken();
        }

        /// Restores the contents of the specified file to the provided entity
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="fileName"></param>
        /// <param name="entity"></param>
        /// <param name="cancellation"></param>
        /// <returns></returns>
        public async Task<bool> RestoreAsync<T>(string fileName, T entity) where T : IStorable
        {
            if (!_dir.FileExists(fileName))
            {
                return false;
            }

            using VnMemoryStream _memStream = new();

            //read the file into memory
            await using (IsolatedStorageFileStream stream = _dir.OpenFile(fileName, FileMode.Open, FileAccess.Read))
            {
                await stream.CopyToAsync(_memStream, 4096, MemoryUtil.Shared, _cancellation);
            }

            //reset the stream
            _memStream.Seek(0, SeekOrigin.Begin);

            //load the entity from the stream
            return entity.Load(_memStream);
        }

        /// <summary>
        /// Stores the contents of the provided entity to the specified file
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="fileName">The name of the file to write</param>
        /// <param name="entity">The storable entity to store</param>
        /// <returns>A task that resolves when the save has been completed</returns>
        public async Task SaveAsync<T>(string fileName, T entity) where T : IStorable
        {
            using VnMemoryStream _memStream = new();

            //save the entity to the memory stream
            entity.Save(_memStream);

            //reset the stream
            _memStream.Seek(0, SeekOrigin.Begin);

            //write the stream to the file
            await using IsolatedStorageFileStream stream = _dir.OpenFile(fileName, FileMode.Create, FileAccess.Write);
            await _memStream.CopyToAsync(stream, 4096, _cancellation);
        }

        /// <summary>
        /// Reads the contents of the specified file as a json object directly
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="fileName">The name of the file to read</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that resolves the object if found, null otherwise</returns>
        public async Task<T?> ReadJsonAsync<T>(string fileName) where T : class
        {
            //Make sure file exists
            if (!_dir.FileExists(fileName))
            {
                return null;
            }

            //Read the file directly into the desserializer
            await using IsolatedStorageFileStream stream = _dir.OpenFile(fileName, FileMode.Open, FileAccess.Read);

            return await JsonSerializer.DeserializeAsync<T>(stream, cancellationToken: _cancellation);
        }

        /// <summary>
        /// Reads the contents of the specified file as a json object directly
        /// or returns a new instance of the object if the file does not exist
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="fileName">The name of the file to read data from</param>
        /// <returns>A task that resolves the read object</returns>
        public async Task<T> ReadJsonOrDefaultAsync<T>(string fileName) where T : class, new()
        {
            T? result = await ReadJsonAsync<T>(fileName);
            return result ?? new();
        }

        /// <summary>
        /// Saves the provided entity as a json object to the specified file
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="fileName">The name of the file to write data to</param>
        /// <param name="entity">The object to store</param>
        /// <returns>A task that resolves when the data has been stored</returns>
        public async Task SaveJsonAsync<T>(string fileName, T entity) where T : class
        {
            await using IsolatedStorageFileStream stream = _dir.OpenFile(fileName, FileMode.Create, FileAccess.Write);
            await JsonSerializer.SerializeAsync(stream, entity, cancellationToken: _cancellation);
        }
    }
}