/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: FtpStorageManager.cs 
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
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

using FluentFTP;
using FluentFTP.Exceptions;

using VNLib.Utils.Logging;
using VNLib.Utils.Resources;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

namespace Content.Publishing.Blog.Admin.Storage
{
    [ConfigurationName("ftp_config")]
    internal class FtpStorageManager : StorageBase, IDisposable
    {
        private readonly AsyncFtpClient _client;
        private readonly string _username;
        private readonly string? _baasePath;

        protected override string? BasePath => _baasePath;

        public FtpStorageManager(PluginBase plugin, IConfigScope config)
        {
            string? url = config["url"].GetString();
            _username = config["username"].GetString() ?? throw new KeyNotFoundException("Missing required username in config");
            _baasePath = config["base_path"].GetString();

            Uri uri = new (url!);

            //Init new client
            _client = new(
                uri.Host, 
                uri.Port, 
                //Logger in debug mode
                logger:plugin.IsDebug() ? new FtpDebugLogger(plugin.Log) : null
            );
        }

        public override async Task ConfigureServiceAsync(PluginBase plugin)
        {
            using ISecretResult password = await plugin.GetSecretAsync("ftp_password");

            //Init client credentials
            _client.Credentials = new NetworkCredential(_username, password?.Result.ToString());
            _client.Config.EncryptionMode = FtpEncryptionMode.Auto;
            _client.Config.ValidateAnyCertificate = true;

            plugin.Log.Information("Connecting to ftp server");

            await _client.AutoConnect(CancellationToken.None);
            plugin.Log.Information("Successfully connected to ftp server");
        }


        ///<inheritdoc/>
        public override Task DeleteFileAsync(string filePath, CancellationToken cancellation)
        {
            return _client.DeleteFile(GetExternalFilePath(filePath), cancellation);
        }

        ///<inheritdoc/>
        public override async Task<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation)
        {
            try
            {
                //Read the file 
                await _client.DownloadStream(output, GetExternalFilePath(filePath), token: cancellation);
                return output.Position;
            }
            catch (FtpMissingObjectException)
            {
                //File not found
                return -1;
            }
        }

        ///<inheritdoc/>
        public override async Task WriteFileAsync(string filePath, Stream data, string ct, CancellationToken cancellation)
        {
            //Upload the file to the server
            FtpStatus status = await _client.UploadStream(data, GetExternalFilePath(filePath), FtpRemoteExists.Overwrite, true, token: cancellation);

            if (status == FtpStatus.Failed)
            {
                throw new ResourceUpdateFailedException($"Failed to update the remote resource {filePath}");
            }
        }

        ///<inheritdoc/>
        public override string GetExternalFilePath(string filePath)
        {
            return string.IsNullOrWhiteSpace(_baasePath) ? filePath : $"{_baasePath}/{filePath}";
        }

        public void Dispose()
        {
            _client?.Dispose();
        }

        sealed record class FtpDebugLogger(ILogProvider Log) : IFtpLogger
        {
            void IFtpLogger.Log(FtpLogEntry entry)
            {
                Log.Debug("FTP [{lvl}] -> {cnt}", entry.Severity.ToString(), entry.Message);
            }
        }

    }
}
