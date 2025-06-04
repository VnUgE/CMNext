/*
* Copyright (c) 2025 Vaughn Nugent
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

using VNLib.Net.Http;
using VNLib.Plugins;
using VNLib.Plugins.Essentials;
using VNLib.Plugins.Essentials.Accounts;
using VNLib.Plugins.Essentials.Endpoints;
using VNLib.Plugins.Essentials.Extensions;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Validation;
using VNLib.Plugins.Extensions.Loading.Routing.Mvc;
using static VNLib.Plugins.Essentials.Endpoints.ResourceEndpointBase;

using Content.Publishing.Blog.Admin.Model;

namespace Content.Publishing.Blog.Admin.Endpoints
{

    [ConfigurationName("api")]
    internal sealed class ChannelEndpoint(PluginBase plugin) : IHttpController
    {
        private static readonly IValidator<ChannelRequest> ChannelValidator = ChannelRequest.GetValidator();
        private static readonly IValidator<FeedMeta> FeedValidator = FeedMeta.GetValidator();

        private readonly ChannelManager ContentManager = plugin.GetOrCreateSingleton<ChannelManager>();
        private readonly PostManager PostManager = plugin.GetOrCreateSingleton<PostManager>();

        ///<inheritdoc/>
        public ProtectionSettings GetProtectionSettings() => default;

        [HttpStaticRoute("{{ path }}/channels", HttpMethod.GET)]
        [HttpRouteProtection(AuthorzationCheckLevel.Critical)]
        public async ValueTask<VfReturnType> OnGetChannelsAsync(HttpEntity entity)
        {
            //Check user read-permissions
            if (!entity.Session.CanRead())
            {
                return VfReturnType.Forbidden;
            }

            object[] contexts = await ContentManager.GetAllContextsAsync(entity.EventCancellation);

            return VirtualOkJson(entity, contexts);
        }

        [HttpStaticRoute("{{ path }}/channels", HttpMethod.POST)]
        [HttpRouteProtection(AuthorzationCheckLevel.Critical)]
        public async ValueTask<VfReturnType> OnCreateChannelAsync(HttpEntity entity)
        {
            WebMessage webm = new();

            if (webm.Assert(entity.Session.CanWrite(), "You do not have permission to add channels"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.Forbidden);
            }

            //Get the blog context from the request body
            ChannelRequest? channel = await entity.GetJsonFromFileAsync<ChannelRequest>();
            if (webm.Assert(channel != null, "You must specify a new blog channel"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            if (!ChannelValidator.Validate(channel, webm))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            if (webm.AssertError(channel.Feed != null, "No feed object was received"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            if (!FeedValidator.Validate(channel.Feed, webm))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            //Add the channel to the manager
            bool result = await ContentManager.CreateChannelAsync(channel, entity.EventCancellation);

            if (webm.Assert(result, "A blog with the given name already exists"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.Conflict);
            }

            return VirtualClose(entity, HttpStatusCode.Created);
        }

        [HttpStaticRoute("{{ path }}/channels", HttpMethod.PATCH)]
        [HttpRouteProtection(AuthorzationCheckLevel.Critical)]
        public async ValueTask<VfReturnType> OnUpdateChannelAsync(HttpEntity entity)
        {
            WebMessage webm = new();

            if (webm.Assert(entity.Session.CanWrite(), "You do not have permission to add channels"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.Forbidden);
            }

            //Get the blog context from the request body
            ChannelRequest? channel = await entity.GetJsonFromFileAsync<ChannelRequest>();

            if (webm.Assert(channel?.Id != null, "You must specify a new blog channel"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            if (!ChannelValidator.Validate(channel, webm))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            if (webm.AssertError(channel.Feed != null, "No feed object was received"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            if (!FeedValidator.Validate(channel.Feed, webm))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            //Make sure the blog context exists
            IChannelContext? context = await ContentManager.GetChannelAsync(channel.Id, entity.EventCancellation);

            if (webm.Assert(context != null, "The specified blog channel does not exist"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.NotFound);
            }

            bool result = await ContentManager.UpdateChannelAsync(channel, entity.EventCancellation);

            if (webm.Assert(result, "Failed to update the channel setting"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.Conflict);
            }

            //Update post feeds since the channel was updated
            await PostManager.UpdateFeedForChannelAsync(channel, entity.EventCancellation);

            return VirtualClose(entity, HttpStatusCode.Created);
        }

        [HttpStaticRoute("{{ path }}/channels", HttpMethod.DELETE)]
        [HttpRouteProtection(AuthorzationCheckLevel.Critical)]
        public async ValueTask<VfReturnType> DeleteAsync(HttpEntity entity)
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

            return VirtualClose(entity, HttpStatusCode.NoContent);
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
