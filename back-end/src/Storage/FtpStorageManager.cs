/*
* Copyright (c) 2026 Vaughn Nugent
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
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using FluentFTP;
using FluentFTP.Exceptions;

using VNLib.Utils.Extensions;
using VNLib.Utils.Logging;
using VNLib.Utils.Resources;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Loading.Configuration;
using VNLib.Plugins.Extensions.Loading.Events;

namespace Content.Publishing.Blog.Admin.Storage
{

    [ConfigurationName("storage")]
    internal class FtpStorageManager : StorageBase, IDisposable
    {
        private readonly AsyncFtpClient _client;
        private readonly FtpStorageConfig _storageConf;

        //Serializes all control-connection use, FluentFTP clients are not thread-safe
        private readonly SemaphoreSlim _clientLock = new(1, 1);

        protected override string? BasePath => _storageConf.BaseBucket;

        public FtpStorageManager(PluginBase plugin, IConfigScope config)
        {
            //Method name retains vnlib 0.1.5 spelling, renamed in 0.2.0
            _storageConf = config.DeserialzeAndValidate<FtpStorageConfig>();

            Uri uri = new (_storageConf.ServerAddress!);

            //Init new client
            _client = new(
                uri.Host,
                uri.Port,
                //Logger in debug mode
                logger: plugin.IsDebug() ? new FtpDebugLogger(plugin.Log) : null
            );


        }

        public override async Task ConfigureServiceAsync(PluginBase plugin)
        {
            // Hold the lock for the entire configuration so no operations
            // can run on an unconfigured client
            using SemSlimReleaser _ = await _clientLock.GetReleaserAsync(CancellationToken.None);

            using ISecretResult password = await plugin.Secrets().GetAsync("storage_secret");

            //Init client credentials
            _client.Credentials = new NetworkCredential(
                _storageConf.Username, 
                password.Result.ToString()
            );

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

            //FluentFTP 54+ sanitizes every remote path, fail loudly on
            //unsafe input instead of silently renaming it server-side
            _client.Config.SanitizeMode = FtpSanitize.Throw;

            //Bound stalled uploads instead of hanging indefinitely
            _client.Config.WriteTimeout = 10 * 1000;

            //Send periodic NOOPs on idle control connections instead of a manual ping schedule
            _client.Config.Noop = _storageConf.KeepaliveSeconds > 0;
            _client.Config.NoopInterval = _storageConf.KeepaliveSeconds * 1000;

            plugin.Log.Information("Connecting to ftp server");

            await _client.AutoConnect(CancellationToken.None);
            plugin.Log.Information("Successfully connected to ftp server");
        }


        ///<inheritdoc/>
        public override async ValueTask DeleteFileAsync(string filePath, CancellationToken cancellation)
        {
            using SemSlimReleaser _ = await _clientLock.GetReleaserAsync(cancellation);

            await _client.DeleteFile(GetExternalFilePath(filePath), cancellation);
        }

        ///<inheritdoc/>
        public override async ValueTask<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation)
        {
            using SemSlimReleaser _ = await _clientLock.GetReleaserAsync(cancellation);

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
            using SemSlimReleaser _ = await _clientLock.GetReleaserAsync(cancellation);

            string remotePath = GetExternalFilePath(filePath);

            //Upload the file to the server without deleting it first
            FtpStatus status = await _client.UploadStream(
                data,
                remotePath,
                FtpRemoteExists.OverwriteInPlace,
                createRemoteDir: true,
                token: cancellation
            );

            if (status == FtpStatus.Failed)
            {
                throw new ResourceUpdateFailedException($"Failed to update the remote resource {filePath}");
            }

            //Streams have no checksum API, so verify the transfer by size
            if (data.CanSeek && await _client.GetFileSize(remotePath, -1, cancellation) != data.Length)
            {
                throw new ResourceUpdateFailedException($"Uploaded file size mismatch for {filePath}");
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
            _clientLock.Dispose();
        }

        sealed class FtpDebugLogger(ILogProvider Log) : IFtpLogger
        {
            void IFtpLogger.Log(FtpLogEntry entry)
            {
                Log.Debug("FTP [{lvl}] -> {cnt}", entry.Severity.ToString(), entry.Message);
            }
        }

        //Private storage configuration, validated at load
        private sealed class FtpStorageConfig : IOnConfigValidation
        {
            [JsonPropertyName("server_address")]
            public string ServerAddress { get; init; } = string.Empty;

            [JsonPropertyName("username")]
            public string Username { get; init; } = string.Empty;

            [JsonPropertyName("bucket")]
            public string? BaseBucket { get; init; }

            [JsonPropertyName("use_ssl")]
            public bool? UseSsl { get; init; }

            [JsonPropertyName("keepalive_sec")]
            public int KeepaliveSeconds { get; init; }

            public void OnValidate()
            {
                Validate.NotNull(ServerAddress, "FTP storage requires a server address");
                Validate.NotNull(Username, "FTP storage requires a username");
                Validate.Assert(KeepaliveSeconds >= 0, "FTP keepalive interval cannot be negative");
            }
        }

    }
}
