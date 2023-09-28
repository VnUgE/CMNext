/*
* Copyright (c) 2023 Vaughn Nugent
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
using System.Threading;
using System.Threading.Tasks;

using Minio;
using Minio.DataModel;

using VNLib.Utils.Memory;
using VNLib.Utils.Extensions;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

using static Content.Publishing.Blog.Admin.Model.PostManager;

namespace Content.Publishing.Blog.Admin.Storage
{

    [ConfigurationName("s3_config")]
    internal sealed class MinioClientManager : StorageBase
    {
        private readonly MinioClient Client;
        private readonly S3Config Config;

        public MinioClientManager(PluginBase pbase, IConfigScope s3Config)
        {
            //Deserialize the config
            Config = s3Config.Deserialze<S3Config>();
            Client = new();
        }

        ///<inheritdoc/>
        protected override string? BasePath => Config.BaseBucket;

        ///<inheritdoc/>
        public override async Task ConfigureServiceAsync(PluginBase plugin)
        {
            using ISecretResult? secret = await plugin.GetSecretAsync("s3_secret");

            Client.WithEndpoint(Config.ServerAddress)
                    .WithCredentials(Config.ClientId, secret.Result.ToString());

            Client.WithSSL(Config.UseSsl.HasValue && Config.UseSsl.Value);

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
        public override Task DeleteFileAsync(string filePath, CancellationToken cancellation)
        {
            RemoveObjectArgs args = new();
            args.WithBucket(Config.BaseBucket)
                .WithObject(filePath);

            //Remove the object
            return Client.RemoveObjectAsync(args, cancellation);
        }

        ///<inheritdoc/>
        public override Task WriteFileAsync(string filePath, Stream data, string ct, CancellationToken cancellation)
        {
            PutObjectArgs args = new();
            args.WithBucket(Config.BaseBucket)
                .WithContentType(ct)
                .WithObject(filePath)
                .WithObjectSize(data.Length)
                .WithStreamData(data);

            //Upload the object
            return Client.PutObjectAsync(args, cancellation);
        }

        ///<inheritdoc/>
        public override async Task<long> ReadFileAsync(string filePath, Stream output, CancellationToken cancellation)
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
            }
            catch (Minio.Exceptions.ObjectNotFoundException)
            {
                //File not found
                return -1;
            }
            return output.Position;
        }
    }
}
