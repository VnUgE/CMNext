/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: ContentEndpoint.cs 
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
using System.Threading.Tasks;

using FluentValidation;

using VNLib.Utils.IO;
using VNLib.Net.Http;
using VNLib.Plugins;
using VNLib.Plugins.Essentials;
using VNLib.Plugins.Essentials.Accounts;
using VNLib.Plugins.Essentials.Endpoints;
using VNLib.Plugins.Essentials.Extensions;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Validation;

using Content.Publishing.Blog.Admin.Model;

namespace Content.Publishing.Blog.Admin.Endpoints
{

    [ConfigurationName("content_endpoint")]
    internal sealed class ContentEndpoint : ProtectedWebEndpoint
    {
        private static readonly IValidator<ContentMeta> MetaValidator = ContentMeta.GetValidator();

        private readonly ContentManager _content;
        private readonly IChannelContextManager _blogContextManager;

        private readonly int MaxContentLength;

        public ContentEndpoint(PluginBase plugin, IConfigScope config)
        {
            string? path = config["path"].GetString();

            InitPathAndLog(path, plugin.Log);

            //Get the max content length
            MaxContentLength = (int)config["max_content_length"].GetUInt32();

            _content = plugin.GetOrCreateSingleton<ContentManager>();
            _blogContextManager = plugin.GetOrCreateSingleton<ChannelManager>();
        }


        protected override async ValueTask<VfReturnType> GetAsync(HttpEntity entity)
        {
            if (!entity.Session.CanRead())
            {
                return VfReturnType.Forbidden;
            }

            //Get the channel id 
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? channelId))
            {
                entity.CloseResponse(HttpStatusCode.BadRequest);
                return VfReturnType.VirtualSkip;
            }

            //Get the channel
            IChannelContext? channel = await _blogContextManager.GetChannelAsync(channelId, entity.EventCancellation);

            if (channel == null)
            {
                entity.CloseResponse(HttpStatusCode.NotFound);
                return VfReturnType.VirtualSkip;
            }

            //Get the content id, if not set get all content meta items
            if (!entity.QueryArgs.TryGetNonEmptyValue("id", out string? contentId))
            {
                //Get all content items
                ContentMeta[] items = await _content.GetAllContentItemsAsync(channel, entity.EventCancellation);

                //Return the items
                entity.CloseResponseJson(HttpStatusCode.OK, items);
                return VfReturnType.VirtualSkip;

            }

            //See if the user wants to get a link to the content
            if (entity.QueryArgs.IsArgumentSet("getlink", "true"))
            {
                WebMessage webm = new()
                {
                    //Get the content link
                    Result = await _content.GetExternalPathForItemAsync(channel, contentId, entity.EventCancellation)
                };

                //Set success if the link exists
                webm.Success = webm.Result != null;
                webm.Result ??= "The requested content item was not found in the database";

                //Return the link
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }
            else
            {
                //Get content for single item
                VnMemoryStream vms = new();
                try
                {
                    //Get the content from the store
                    ContentMeta? meta = await _content.GetContentAsync(channel, contentId, vms, entity.EventCancellation);

                    //it may not exist, cleanuup
                    if (meta?.ContentType == null)
                    {
                        vms.Dispose();
                        entity.CloseResponse(HttpStatusCode.NotFound);
                        return VfReturnType.VirtualSkip;
                    }
                    else
                    {
                        //rewind the stream
                        vms.Seek(0, SeekOrigin.Begin);

                        //Return the content
                        entity.CloseResponse(HttpStatusCode.OK, HttpHelpers.GetContentType(meta.ContentType), vms);
                        return VfReturnType.VirtualSkip;
                    }
                }
                catch
                {
                    vms.Dispose();
                    throw;
                }
            }
        }

        /*
         * Patch allows updating content meta data without having to upload the content again
         */
        protected override async ValueTask<VfReturnType> PatchAsync(HttpEntity entity)
        {

            //Get channel id
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? channelId))
            {
                return VfReturnType.NotFound;
            }

            ValErrWebMessage webm = new();

            if (webm.Assert(entity.Session.CanWrite(), "You do not have permissions to update content"))
            {
                entity.CloseResponseJson(HttpStatusCode.Forbidden, webm);
                return VfReturnType.VirtualSkip;
            }

            //Make sure there is content attached
            if (webm.Assert(entity.Files.Count > 0, "No content was attached to the entity body"))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Get the channel
            IChannelContext? channel = await _blogContextManager.GetChannelAsync(channelId, entity.EventCancellation);

            if (webm.Assert(channel != null, "The channel does not exist"))
            {
                entity.CloseResponseJson(HttpStatusCode.NotFound, webm);
                return VfReturnType.VirtualSkip;
            }

            //Read meta from request
            ContentMeta? requestedMeta = await entity.GetJsonFromFileAsync<ContentMeta>();

            if (webm.Assert(requestedMeta?.Id != null, "You must supply a content id"))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Validate the meta
            if (!MetaValidator.Validate(requestedMeta, webm))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Get the original content meta
            ContentMeta? meta = await _content.GetMetaAsync(channel, requestedMeta.Id, entity.EventCancellation);
            if (webm.Assert(meta != null, "The requested content item does not exist"))
            {
                entity.CloseResponseJson(HttpStatusCode.NotFound, webm);
                return VfReturnType.VirtualSkip;
            }

            //Currently only allow chaning the file name
            meta.FileName = requestedMeta.FileName;

            //Set the meta item
            await _content.SetMetaAsync(channel, meta, entity.EventCancellation);

            //Return the updated meta
            webm.Result = meta;
            webm.Success = true;

            entity.CloseResponse(webm);
            return VfReturnType.VirtualSkip;
        }

        /*
         * Put adds or updates content
         */
        protected override async ValueTask<VfReturnType> PutAsync(HttpEntity entity)
        {
            //Get channel id
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? channelId))
            {
                return VfReturnType.NotFound;
            }

            ValErrWebMessage webm = new();

            if (webm.Assert(entity.Session.CanWrite(), "You do not have permissions to update content"))
            {
                entity.CloseResponseJson(HttpStatusCode.Forbidden, webm);
                return VfReturnType.VirtualSkip;
            }

            //Make sure there is content attached
            if (webm.Assert(entity.Files.Count > 0, "No content was attached to the entity body"))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Check content length
            if (webm.Assert(entity.Files[0].FileData.Length <= MaxContentLength, $"The content length is too long, max length is {MaxContentLength} bytes"))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Get the first file
            FileUpload file = entity.Files[0];

            //Get the channel
            IChannelContext? channel = await _blogContextManager.GetChannelAsync(channelId, entity.EventCancellation);

            if (webm.Assert(channel != null, "The channel does not exist"))
            {
                entity.CloseResponseJson(HttpStatusCode.NotFound, webm);
                return VfReturnType.VirtualSkip;
            }

            ContentMeta? meta;

            //Get the content id if its an update
            if (entity.QueryArgs.TryGetNonEmptyValue("id", out string? contentId))
            {
                //Get the original content meta
                meta = await _content.GetMetaAsync(channel, contentId, entity.EventCancellation);

                if (webm.Assert(meta != null, "The request item does not exist"))
                {
                    entity.CloseResponseJson(HttpStatusCode.NotFound, webm);
                    return VfReturnType.VirtualSkip;
                }

                //May want to change the content name
                meta.FileName = entity.Server.Headers["X-Content-Name"];
            }
            else
            {
                //Get the content name, may be null
                string? cName = entity.Server.Headers["X-Content-Name"];

                //New item
                meta = _content.GetNewMetaObject(file.FileData.Length, cName, file.ContentType);
            }

            //Validate the meta after updating file name
            if (!MetaValidator.Validate(meta, webm))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Add or update the content
            await _content.SetContentAsync(channel, meta, file.FileData, file.ContentType, entity.EventCancellation);

            //Return the meta
            webm.Result = meta;
            webm.Success = true;

            entity.CloseResponse(webm);
            return VfReturnType.VirtualSkip;
        }

        protected override async ValueTask<VfReturnType> DeleteAsync(HttpEntity entity)
        {
            if (!entity.Session.CanRead())
            {
                return VfReturnType.Forbidden;
            }

            //Get the channel id
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? channelId))
            {
                entity.CloseResponse(HttpStatusCode.BadRequest);
                return VfReturnType.VirtualSkip;
            }

            //get the content id
            if (!entity.QueryArgs.TryGetNonEmptyValue("id", out string? contentId))
            {
                entity.CloseResponse(HttpStatusCode.BadRequest);
                return VfReturnType.VirtualSkip;
            }

            //Get channel
            IChannelContext? channel = await _blogContextManager.GetChannelAsync(channelId, entity.EventCancellation);
            if (channel == null)
            {
                return VfReturnType.NotFound;
            }

            //Try to delete the content
            bool deleted = await _content.DeleteContentAsync(channel, contentId, entity.EventCancellation);

            if (deleted)
            {
                entity.CloseResponse(HttpStatusCode.OK);
                return VfReturnType.VirtualSkip;
            }
            else
            {
                return VfReturnType.NotFound;
            }
        }
    }

}
