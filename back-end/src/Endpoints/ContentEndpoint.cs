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
using System.Linq;
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
        private static readonly IValidator<string[]> MultiDeleteValidator = GetMultiDeleteValidator();

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
                return VirtualClose(entity, HttpStatusCode.BadRequest);
            }

            //Get the channel
            IChannelContext? channel = await _blogContextManager.GetChannelAsync(channelId, entity.EventCancellation);

            if (channel == null)
            {
                return VfReturnType.NotFound;
            }

            //Get the content id, if not set get all content meta items
            if (!entity.QueryArgs.TryGetNonEmptyValue("id", out string? contentId))
            {
                //Get all content items
                ContentMeta[] items = await _content.GetAllContentItemsAsync(channel, entity.EventCancellation);

                //Return the items
                return VirtualCloseJson(entity, items, HttpStatusCode.OK);
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

                //Return the link in webmessage result
                return VirtualOk(entity, webm);
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
                        return VfReturnType.NotFound;
                    }
                    else
                    {
                        //rewind the stream
                        vms.Seek(0, SeekOrigin.Begin);

                        //Return the content stream
                        return VirtualClose(entity, HttpStatusCode.OK, HttpHelpers.GetContentType(meta.ContentType), vms);
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
                return VirtualClose(entity, webm, HttpStatusCode.Forbidden);
            }

            //Make sure there is content attached
            if (webm.Assert(entity.Files.Count > 0, "No content was attached to the entity body"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //Get the channel
            IChannelContext? channel = await _blogContextManager.GetChannelAsync(channelId, entity.EventCancellation);

            if (webm.Assert(channel != null, "The channel does not exist"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.NotFound);
            }

            //Read meta from request
            ContentMeta? requestedMeta = await entity.GetJsonFromFileAsync<ContentMeta>();

            if (webm.Assert(requestedMeta?.Id != null, "You must supply a content id"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //Validate the meta
            if (!MetaValidator.Validate(requestedMeta, webm))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            //Get the original content meta
            ContentMeta? meta = await _content.GetMetaAsync(channel, requestedMeta.Id, entity.EventCancellation);
            if (webm.Assert(meta != null, "The requested content item does not exist"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.NotFound);
            }

            //Currently only allow chaning the file name
            meta.FileName = requestedMeta.FileName;

            //Set the meta item
            await _content.SetMetaAsync(channel, meta, entity.EventCancellation);

            //Return the updated meta
            webm.Result = meta;
            webm.Success = true;

            return VirtualOk(entity, webm);
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
                return VirtualClose(entity, webm, HttpStatusCode.Forbidden);
            }

            //Make sure there is content attached
            if (webm.Assert(entity.Files.Count > 0, "No content was attached to the entity body"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //Get the first file
            FileUpload file = entity.Files[0];

            //Check content length
            if (webm.Assert(file.FileData.Length <= MaxContentLength, $"The content length is too long, max length is {MaxContentLength} bytes"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //the http layer should protect from this but just in case
            if(webm.Assert(file.ContentType != ContentType.NonSupported, "The uploaded file is not a supported system content type"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //Get the channel
            IChannelContext? channel = await _blogContextManager.GetChannelAsync(channelId, entity.EventCancellation);

            if (webm.Assert(channel != null, "The channel does not exist"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.NotFound);
            }

            ContentMeta? meta;

            //Get the content id if its an update
            if (entity.QueryArgs.TryGetNonEmptyValue("id", out string? contentId))
            {
                //Get the original content meta
                meta = await _content.GetMetaAsync(channel, contentId, entity.EventCancellation);

                if (webm.Assert(meta != null, "The request item does not exist"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.NotFound);
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
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            //Add or update the content
            await _content.SetContentAsync(channel, meta, file.FileData, file.ContentType, entity.EventCancellation);

            //Return the meta
            webm.Result = meta;
            webm.Success = true;

            return VirtualOk(entity, webm);
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
                return VfReturnType.BadRequest;
            }

            //Get channel
            IChannelContext? channel = await _blogContextManager.GetChannelAsync(channelId, entity.EventCancellation);
            if (channel == null)
            {
                return VfReturnType.NotFound;
            }

            //get the single content id
            if (entity.QueryArgs.TryGetNonEmptyValue("id", out string? contentId))
            {
                //Try to delete the content
                bool deleted = await _content.DeleteContentAsync(channel, contentId, entity.EventCancellation);

                return deleted ? VirtualOk(entity) : VfReturnType.NotFound;
            }

            //Check for bulk delete
            if (entity.QueryArgs.TryGetNonEmptyValue("ids", out string? multiIds))
            {
                ValErrWebMessage webm = new();

                string[] allIds = multiIds.Split(',');

                //validate the ids
                if (!MultiDeleteValidator.Validate(allIds, webm))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
                }

                //Delete all async at the same time, then filter out the nulls
                Task<string>[] deleted = allIds.Select(async id =>
                {
                    return await _content.DeleteContentAsync(channel, id, entity.EventCancellation) ? id : null;

                }).Where(id => id != null).ToArray()!;

                //Get the deleted ids
                string[] deletedIds = await Task.WhenAll(deleted);

                webm.Result = deletedIds;
                webm.Success = true;

                return VirtualOk(entity, webm);
            }

            return VfReturnType.BadRequest;
          
        }

        static IValidator<string[]> GetMultiDeleteValidator()
        {
            InlineValidator<string[]> val = new();

            val.RuleForEach(p => p)
                .NotEmpty()
                .Length(0, 64)
                .AlphaNumericOnly();

            return val;
        } 
    }

}
