/*
* Copyright (c) 2026 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: MinioClientManager.cs 
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
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Minio;
using Minio.Handlers;
using Minio.DataModel;
using Minio.DataModel.Args;
using Minio.DataModel.Response;
using Minio.DataModel.Tracing;

using VNLib.Utils.Memory;
using VNLib.Utils.Logging;
using VNLib.Utils.Extensions;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Loading.Configuration;

namespace Content.Publishing.Blog.Admin.Storage
{

    [ConfigurationName("storage")]
    internal sealed class MinioClientManager(PluginBase plugin, IConfigScope s3Config) : StorageBase
    {
        private readonly MinioClient Client = new();
        //Method name retains vnlib 0.1.5 spelling, renamed in 0.2.0
        private readonly S3StorageConfig Config = s3Config.DeserialzeAndValidate<S3StorageConfig>();

        ///<inheritdoc/>
        protected override string? BasePath => Config.BaseBucket;

        ///<inheritdoc/>
        public override async Task ConfigureServiceAsync(PluginBase plugin)
        {
            //GetAsync raises KeyNotFoundException when the secret is not configured
            using ISecretResult secret = await plugin.Secrets().GetAsync("storage_secret");

            Client.WithEndpoint(Config.ServerAddress)
                    .WithCredentials(Config.ClientId, secret.Result.ToString())
                    .WithSSL(Config.UseSsl == true);

            //Accept optional region
            if (!string.IsNullOrWhiteSpace(Config.Region))
            {
                Client.WithRegion(Config.Region);
            }

            //10 second timeout
            Client.WithTimeout(10 * 1000);

            //Setup debug trace
            if (plugin.IsDebug())
            {
                Client.SetTraceOn(new ReqLogger(plugin.Log));
            }

            //Build client
            Client.Build();
        }

        ///<inheritdoc/>
        public override ValueTask DeleteFileAsync(string filePath, CancellationToken cancellation)
        {
            RemoveObjectArgs args = new();
            args.WithBucket(Config.BaseBucket)
                .WithObject(filePath);

            //Remove the object
            return new ValueTask(Client.RemoveObjectAsync(args, cancellation));
        }

        ///<inheritdoc/>
        public override async ValueTask WriteFileAsync(string filePath, Stream data, string ct, CancellationToken cancellation)
        {
            PutObjectArgs args = new();
            args.WithBucket(Config.BaseBucket)
                .WithContentType(ct)
                .WithObject(filePath)
                .WithObjectSize(data.Length)
                .WithStreamData(data);

            //Upload the object and record the server ETag for traceability
            PutObjectResponse response = await Client.PutObjectAsync(args, cancellation);

            plugin.Log.Debug("Uploaded {path} ETag {etag}", filePath, response.Etag);
        }

        ///<inheritdoc/>
        public override async ValueTask<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation)
        {
            //Get the item
            GetObjectArgs args = new();
            args.WithBucket(Config.BaseBucket)
                .WithObject(filePath)
                .WithCallbackStream(async (stream, cancellation) =>
                {
                    //Read the object to memory
                    await stream.CopyToAsync(output, 16384, MemoryUtil.Shared, cancellation);
                });

            try
            {
                //Get the post content file 
                ObjectStat stat = await Client.GetObjectAsync(args, cancellation);
                return stat.Size;
            }
            catch (Minio.Exceptions.ObjectNotFoundException)
            {
                //File not found
                return -1L;
            }
        }

        internal record class ReqLogger(ILogProvider Log) : IRequestLogger
        {
            public void LogRequest(RequestToLog requestToLog, ResponseToLog responseToLog, double durationMs)
            {
                Log.Debug("S3 result\n{method} {uri} HTTP {ms}ms\nHTTP {status} {message}\n{content}",
                    requestToLog.Method, requestToLog.Resource, durationMs,
                    responseToLog.StatusCode, responseToLog.ErrorMessage, responseToLog.Content
                );
            }
        }

        //Private storage configuration, validated at load
        private sealed class S3StorageConfig : IOnConfigValidation
        {
            [JsonPropertyName("server_address")]
            public string ServerAddress { get; init; } = string.Empty;

            [JsonPropertyName("access_key")]
            public string ClientId { get; init; } = string.Empty;

            [JsonPropertyName("bucket")]
            public string BaseBucket { get; init; } = string.Empty;

            [JsonPropertyName("use_ssl")]
            public bool? UseSsl { get; init; }

            [JsonPropertyName("region")]
            public string? Region { get; init; }

            public void OnValidate()
            {
                Validate.NotNull(ServerAddress, "S3 storage requires a server address");
                Validate.NotNull(ClientId, "S3 storage requires a client id");
                Validate.NotNull(BaseBucket, "S3 storage requires a base bucket");
            }
        }
    }
}
