/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: StorageBase.cs 
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

using VNLib.Plugins;
using VNLib.Utils.IO;
using VNLib.Plugins.Extensions.Loading;

namespace Content.Publishing.Blog.Admin.Storage
{
    internal abstract class StorageBase : IAsyncConfigurable, ISimpleFilesystem
    {
        /// <summary>
        /// The base file path within the remote file system to use for external urls
        /// </summary>
        protected abstract string? BasePath { get; }

        ///<inheritdoc/>
        public abstract Task ConfigureServiceAsync(PluginBase plugin);

        ///<inheritdoc/>
        public abstract Task DeleteFileAsync(string filePath, CancellationToken cancellation);

        ///<inheritdoc/>
        public abstract Task<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation);

        ///<inheritdoc/>
        public abstract Task WriteFileAsync(string filePath, Stream data, string ct, CancellationToken cancellation);

        ///<inheritdoc/>
        public virtual string GetExternalFilePath(string filePath)
        {
            return string.IsNullOrWhiteSpace(BasePath) ? filePath : $"{BasePath}/{filePath}";
        }
    }
}
