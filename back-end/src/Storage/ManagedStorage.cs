/*
* Copyright (c) 2025 Vaughn Nugent
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
    [ConfigurationName("storage")]
    internal sealed class ManagedStorage : ISimpleFilesystem
    {
        private readonly ISimpleFilesystem _backingStorage;      

        public ManagedStorage(PluginBase plugin, IConfigScope config)
        {
            string type = config.GetRequiredProperty("type", p => p.GetString()!);

            switch (type)
            {
                // User can specify a custom storage assembly to load externally
                case "custom":
                    string assemnbly = config.GetRequiredProperty("custom_storage_assembly", p => p.GetString()!);
                    _backingStorage = plugin.CreateServiceExternal<ISimpleFilesystem>(assemnbly);
                    break;

                case "ftp":
                    _backingStorage = plugin.GetOrCreateSingleton<FtpStorageManager>();
                    break;

                case "s3":
                    _backingStorage = plugin.GetOrCreateSingleton<MinioClientManager>();
                    break;

                default:
                    throw new ConfigurationException($"Invalid storage type: {type}, allowed types are: 'custom' | 'ftp' | 's3'");
            }           
          
        }

        ///<inheritdoc/>
        public ValueTask DeleteFileAsync(string filePath, CancellationToken cancellation)
        {
            return _backingStorage.DeleteFileAsync(filePath, cancellation);
        }

        ///<inheritdoc/>
        public string GetExternalFilePath(string filePath)
        {
            return _backingStorage.GetExternalFilePath(filePath);
        }

        ///<inheritdoc/>
        public async ValueTask<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation)
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
        public ValueTask WriteFileAsync(string filePath, Stream data, string ct, CancellationToken cancellation)
        {
            //Try to reset the stream if allowed
            if (data.CanSeek)
            {
                //Reset stream
                data.Seek(0, SeekOrigin.Begin);
            }

            return _backingStorage.WriteFileAsync(filePath, data, ct, cancellation);
        }
      
        ///<inheritdoc/>
        ValueTask<Stream?> ISimpleFilesystem.OpenFileAsync(string filePath, FileAccess options, CancellationToken cancellation)
        {
            return _backingStorage.OpenFileAsync(filePath, options, cancellation);
        }
    }
}
