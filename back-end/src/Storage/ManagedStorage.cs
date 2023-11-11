/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: ManagedStorage.cs 
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

using VNLib.Utils.IO;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

namespace Content.Publishing.Blog.Admin.Storage
{
    [ConfigurationName("storage", Required = false)]
    internal sealed class ManagedStorage : ISimpleFilesystem
    {
        private readonly ISimpleFilesystem _backingStorage;

        public ManagedStorage(PluginBase plugin) : this(plugin, null)
        { }

        public ManagedStorage(PluginBase plugin, IConfigScope? config)
        {
            //try to get custom storage assembly
            if (config != null && config.ContainsKey("custom_storage_assembly"))
            {
                string storageAssembly = config.GetRequiredProperty("custom_storage_assembly", p => p.GetString()!);
                _backingStorage = plugin.CreateServiceExternal<ISimpleFilesystem>(storageAssembly);
            }
            else if (plugin.HasConfigForType<MinioClientManager>())
            {
                //Use minio storage
                _backingStorage = plugin.GetOrCreateSingleton<MinioClientManager>();
            }
            else if (plugin.HasConfigForType<FtpStorageManager>())
            {
                //Use ftp storage
                _backingStorage = plugin.GetOrCreateSingleton<FtpStorageManager>();
            }
            else
            {
                throw new ArgumentException("No storage providers were found, cannot continue!");
            }
        }

        ///<inheritdoc/>
        public Task DeleteFileAsync(string filePath, CancellationToken cancellation)
        {
            return _backingStorage.DeleteFileAsync(filePath, cancellation);
        }

        ///<inheritdoc/>
        public string GetExternalFilePath(string filePath)
        {
            return _backingStorage.GetExternalFilePath(filePath);
        }

        ///<inheritdoc/>
        public async Task<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation)
        {
            //Read the file from backing storage
            long result = await _backingStorage.ReadFileAsync(filePath, output, cancellation);

            //Try to reset the stream if allowed
            if (output.CanSeek)
            {
                //Reset stream
                output.Seek(0, SeekOrigin.Begin);
            }

            return result;
        }

        ///<inheritdoc/>
        public Task WriteFileAsync(string filePath, Stream data, string ct, CancellationToken cancellation)
        {
            //Try to reset the stream if allowed
            if (data.CanSeek)
            {
                //Reset stream
                data.Seek(0, SeekOrigin.Begin);
            }

            return _backingStorage.WriteFileAsync(filePath, data, ct, cancellation);
        }
    }
}
