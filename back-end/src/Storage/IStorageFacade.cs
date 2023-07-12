/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: IStorageFacade.cs 
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
using System.Threading;
using System.Threading.Tasks;

using VNLib.Net.Http;

namespace Content.Publishing.Blog.Admin.Storage
{
    /// <summary>
    /// Represents an opaque storage interface that abstracts simple storage operations
    /// ignorant of the underlying storage system.
    /// </summary>
    internal interface IStorageFacade
    {
        /// <summary>
        /// Gets the full public file path for the given relative file path
        /// </summary>
        /// <param name="filePath">The relative file path of the item to get the full path for</param>
        /// <returns>The full relative file path</returns>
        string GetExternalFilePath(string filePath);

        /// <summary>
        /// Deletes a file from the storage system asynchronously
        /// </summary>
        /// <param name="filePath">The path to the file to delete</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that represents and asynchronous work</returns>
        Task DeleteFileAsync(string filePath, CancellationToken cancellation);

        /// <summary>
        /// Writes a file from the stream to the given file location
        /// </summary>
        /// <param name="filePath">The path to the file to write to</param>
        /// <param name="data">The file data to stream</param>
        /// <param name="ct">The content type of the file to write</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that represents and asynchronous work</returns>
        Task SetFileAsync(string filePath, Stream data, ContentType ct, CancellationToken cancellation);

        /// <summary>
        /// Reads a file from the storage system at the given path asynchronously
        /// </summary>
        /// <param name="filePath">The file to read</param>
        /// <param name="output">The stream to write the file output to</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>The number of bytes read, -1 if the operation failed</returns>
        Task<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation);
    }
}
