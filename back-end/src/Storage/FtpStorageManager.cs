/*
* Copyright (c) 2025 Vaughn Nugent
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

using FluentFTP;
using FluentFTP.Exceptions;

using VNLib.Utils.Logging;
using VNLib.Utils.Resources;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Loading.Events;

namespace Content.Publishing.Blog.Admin.Storage
{

    [ConfigurationName("storage")]
    internal class FtpStorageManager : StorageBase, IDisposable, IIntervalScheduleable
    {
        private readonly AsyncFtpClient _client;
        private readonly S3Config _storageConf;

        protected override string? BasePath => _storageConf.BaseBucket;

        public FtpStorageManager(PluginBase plugin, IConfigScope config)
        {
            _storageConf = config.Deserialize<S3Config>();

            Uri uri = new (_storageConf.ServerAddress!);

            //Init new client
            _client = new(
                uri.Host,
                uri.Port,
                //Logger in debug mode
                logger: plugin.IsDebug() ? new FtpDebugLogger(plugin.Log) : null
            );


            // If a keepalive interval is set, regularly ping the server to keep the connection alive
            int keepaliveIntervalSec = config.GetValueOrDefault("keepalive_sec", 0);
            if (keepaliveIntervalSec > 0)
            {
                plugin.ScheduleInterval(this, TimeSpan.FromSeconds(keepaliveIntervalSec), false);
            }
        }

        public override async Task ConfigureServiceAsync(PluginBase plugin)
        {
            using ISecretResult password = await plugin.Secrets().GetAsync("storage_secret");

            //Init client credentials
            _client.Credentials = new NetworkCredential(_storageConf.ClientId, password?.Result.ToString());

            //If the user forces ssl, then assume it's an implicit connection and force certificate checking
            if (_storageConf.UseSsl == true)
            {
                _client.Config.EncryptionMode = FtpEncryptionMode.Implicit;
            }
            else
            {
                _client.Config.EncryptionMode = FtpEncryptionMode.Auto;
                _client.Config.ValidateAnyCertificate = true;
            }

            plugin.Log.Information("Connecting to ftp server");

            await _client.AutoConnect(CancellationToken.None);
            plugin.Log.Information("Successfully connected to ftp server");
        }


        ///<inheritdoc/>
        public override ValueTask DeleteFileAsync(string filePath, CancellationToken cancellation)
        {
            return new(_client.DeleteFile(GetExternalFilePath(filePath), cancellation));
        }

        ///<inheritdoc/>
        public override async ValueTask<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation)
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
        public override async ValueTask WriteFileAsync(string filePath, Stream data, string ct, CancellationToken cancellation)
        {
            //Upload the file to the server
            FtpStatus status = await _client.UploadStream(
                data,
                GetExternalFilePath(filePath),
                FtpRemoteExists.Overwrite,
                createRemoteDir: true,
                token: cancellation
            );

            if (status == FtpStatus.Failed)
            {
                throw new ResourceUpdateFailedException($"Failed to update the remote resource {filePath}");
            }
        }

        ///<inheritdoc/>
        public override string GetExternalFilePath(string filePath)
        {
            return string.IsNullOrWhiteSpace(BasePath) ? filePath : $"{BasePath}/{filePath}";
        }

        public void Dispose()
        {
            _client?.Dispose();
        }

        public async Task OnIntervalAsync(ILogProvider log, CancellationToken cancellationToken)
        {
            // Ping the server on regular intervals to check if it's still connected
            await _client.IsStillConnected(token: cancellationToken);
        }

        sealed class FtpDebugLogger(ILogProvider Log) : IFtpLogger
        {
            void IFtpLogger.Log(FtpLogEntry entry)
            {
                Log.Debug("FTP [{lvl}] -> {cnt}", entry.Severity.ToString(), entry.Message);
            }
        }

    }
}
