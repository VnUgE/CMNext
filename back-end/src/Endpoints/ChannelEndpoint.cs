/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: ChannelEndpoint.cs 
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

using System.Net;
using System.Threading.Tasks;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

using FluentValidation;

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
    [ConfigurationName("channel_endpoint")]
    internal sealed class ChannelEndpoint : ProtectedWebEndpoint
    {
        private static readonly IValidator<ChannelRequest> ChannelValidator = ChannelRequest.GetValidator();
        private static readonly IValidator<FeedMeta> FeedValidator = FeedMeta.GetValidator();

        private readonly IChannelContextManager ContentManager;


        public ChannelEndpoint(PluginBase plugin, IConfigScope config)
        {
            string? path = config["path"].GetString();

            InitPathAndLog(path, plugin.Log);

            ContentManager = plugin.GetOrCreateSingleton<ChannelManager>();
        }

        protected override async ValueTask<VfReturnType> GetAsync(HttpEntity entity)
        {
            //Check user read-permissions
            if (!entity.Session.CanRead())
            {
                return VfReturnType.Forbidden;
            }

            //Get the blog context list
            object[] contexts = await ContentManager.GetAllContextsAsync(entity.EventCancellation);

            //Return the list to the client
            entity.CloseResponseJson(HttpStatusCode.OK, contexts);
            return VfReturnType.VirtualSkip;
        }

        protected override async ValueTask<VfReturnType> PostAsync(HttpEntity entity)
        {
            ValErrWebMessage webm = new();

            //Check user write-permissions
            if (webm.Assert(entity.Session.CanWrite() == true, "You do not have permission to add channels"))
            {
                entity.CloseResponseJson(HttpStatusCode.Forbidden, webm);
                return VfReturnType.VirtualSkip;
            }

            //Get the blog context from the request body
            ChannelRequest? channel = await entity.GetJsonFromFileAsync<ChannelRequest>();

            if (webm.Assert(channel != null, "You must specify a new blog channel"))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Validate the blog context
            if (!ChannelValidator.Validate(channel, webm))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Validate the feed if its defined
            if (channel.Feed != null && !FeedValidator.Validate(channel.Feed, webm))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Add the blog context to the manager
            bool result = await ContentManager.CreateChannelAsync(channel, entity.EventCancellation);

            if (webm.Assert(result, "A blog with the given name already exists"))
            {
                entity.CloseResponseJson(HttpStatusCode.Conflict, webm);
                return VfReturnType.VirtualSkip;
            }

            //Return the new blog context to the client
            entity.CloseResponse(HttpStatusCode.Created);
            return VfReturnType.VirtualSkip;
        }

        protected override async ValueTask<VfReturnType> PatchAsync(HttpEntity entity)
        {
            ValErrWebMessage webm = new();

            //Check user write-permissions
            if (webm.Assert(entity.Session.CanWrite() == true, "You do not have permission to add channels"))
            {
                entity.CloseResponseJson(HttpStatusCode.Forbidden, webm);
                return VfReturnType.VirtualSkip;
            }

            //Get the blog context from the request body
            ChannelRequest? channel = await entity.GetJsonFromFileAsync<ChannelRequest>();

            if (webm.Assert(channel?.Id != null, "You must specify a new blog channel"))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Validate the blog context
            if (!ChannelValidator.Validate(channel, webm))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Validate the feed if its defined
            if (channel.Feed != null && !FeedValidator.Validate(channel.Feed, webm))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Make sure the blog context exists
            IChannelContext? context = await ContentManager.GetChannelAsync(channel.Id, entity.EventCancellation);

            if (webm.Assert(context != null, "The specified blog channel does not exist"))
            {
                entity.CloseResponseJson(HttpStatusCode.NotFound, webm);
                return VfReturnType.VirtualSkip;
            }

            //Update the context
            bool result = await ContentManager.UpdateChannelAsync(channel, entity.EventCancellation);

            if (webm.Assert(result, "Failed to update the channel setting"))
            {
                entity.CloseResponseJson(HttpStatusCode.Conflict, webm);
                return VfReturnType.VirtualSkip;
            }

            //Return the new blog context to the client
            entity.CloseResponse(HttpStatusCode.Created);
            return VfReturnType.VirtualSkip;
        }

        protected override async ValueTask<VfReturnType> DeleteAsync(HttpEntity entity)
        {
            //Check for user write-permissions
            if (!entity.Session.CanDelete())
            {
                return VfReturnType.Forbidden;
            }

            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? channelId))
            {
                return VfReturnType.BadRequest;
            }

            //Try to get the blog context from the id
            IChannelContext? context = await ContentManager.GetChannelAsync(channelId, entity.EventCancellation);

            if (context == null)
            {
                return VfReturnType.NotFound;
            }

            //Delete the blog context
            await ContentManager.DeleteChannelAsync(context, entity.EventCancellation);

            //Return the new blog context to the client
            entity.CloseResponse(HttpStatusCode.NoContent);
            return VfReturnType.VirtualSkip;
        }

        private sealed class ChannelRequest : BlogChannel, IJsonOnDeserialized
        {
            private static readonly Regex FileNameRegex = new(@"^[a-zA-Z0-9_\-.]+$", RegexOptions.Compiled);
            private static readonly Regex DirectoryPathRegex = new(@"^[a-zA-Z0-9_\-/]+$", RegexOptions.Compiled);

            public static IValidator<ChannelRequest> GetValidator()
            {
                InlineValidator<ChannelRequest> validationRules = new ();

                validationRules.RuleFor(x => x.BlogName)
                    .NotEmpty()
                    .AlphaNumericOnly()
                    .MaximumLength(64);

                validationRules.RuleFor(x => x.BaseDir)
                    .NotEmpty()
                    .MaximumLength(100)
                    //Must not start with a forward slash
                    .Must(static p => !p.StartsWith('/') && !p.StartsWith('\\'))
                    .WithMessage("Channel directory must not start with a forward slash")
                    .Matches(DirectoryPathRegex)
                    .WithMessage("Channel directory must be a valid directory path");

                validationRules.RuleFor(x => x.IndexPath)
                    .NotEmpty()
                    .MaximumLength(100)
                    .Must(static p => !p.StartsWith('/') && !p.StartsWith('\\'))
                    .WithMessage("Channel catalog file must not start with a forward slash")
                    //Must be a file path
                    .Matches(FileNameRegex)
                    .WithMessage("Channel catalog file path is not a valid file name");

                validationRules.RuleFor(x => x.ContentDir)
                    .NotEmpty()
                    .Must(static p => !p.StartsWith('/') && !p.StartsWith('\\'))
                    .WithMessage("Channel content directory must not start with a forward slash")
                    .MaximumLength(100);

                return validationRules;
            }

            public void OnDeserialized()
            {
                //Compute the uniqe id of the channel 
                Id = ChannelManager.ComputeContextId(this);
            }
        }
    }
}
