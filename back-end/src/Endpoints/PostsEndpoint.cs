/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: PostsEndpoint.cs 
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
using System.Net;
using System.Threading.Tasks;
using Content.Publishing.Blog.Admin.Model;

using FluentValidation;

using VNLib.Plugins;
using VNLib.Plugins.Essentials;
using VNLib.Plugins.Essentials.Accounts;
using VNLib.Plugins.Essentials.Endpoints;
using VNLib.Plugins.Essentials.Extensions;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Validation;

namespace Content.Publishing.Blog.Admin.Endpoints
{

    [ConfigurationName("post_endpoint")]
    internal sealed class PostsEndpoint : ProtectedWebEndpoint
    {
        private static readonly IValidator<BlogPost> PostValidator = BlogPost.GetValidator();

        private readonly IBlogPostManager PostManager;
        private readonly IChannelContextManager ContentManager;

        public PostsEndpoint(PluginBase plugin, IConfigScope config)
        {
            string? path = config["path"].GetString();

            InitPathAndLog(path, plugin.Log);

            //Get post manager and context manager
            PostManager = plugin.GetOrCreateSingleton<PostManager>();
            ContentManager = plugin.GetOrCreateSingleton<ChannelManager>();
        }

        protected override async ValueTask<VfReturnType> GetAsync(HttpEntity entity)
        {
            //Check for read permissions
            if (!entity.Session.CanRead())
            {
                WebMessage webm = new()
                {
                    Result = "You do not have permission to read content"
                };
                entity.CloseResponseJson(HttpStatusCode.Forbidden, webm);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the blog id from the query
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? contextId))
            {
                entity.CloseResponse(HttpStatusCode.BadRequest);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the blog context from the id
            IChannelContext? context = await ContentManager.GetChannelAsync(contextId, entity.EventCancellation);
            if (context == null)
            {
                entity.CloseResponse(HttpStatusCode.NotFound);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the post id from the query
            if (entity.QueryArgs.TryGetNonEmptyValue("post", out string? postId))
            {
                //Try to get single post
                PostMeta? post = await PostManager.GetPostAsync(context, postId, entity.EventCancellation);

                if (post != null)
                {
                    entity.CloseResponseJson(HttpStatusCode.OK, post);
                }
                else
                {
                    entity.CloseResponse(HttpStatusCode.NotFound);
                }

                return VfReturnType.VirtualSkip;
            }

            //Get the post meta list
            PostMeta[] posts = await PostManager.GetPostsAsync(context, entity.EventCancellation);
            entity.CloseResponseJson(HttpStatusCode.OK, posts);
            return VfReturnType.VirtualSkip;
        }

        protected override async ValueTask<VfReturnType> PostAsync(HttpEntity entity)
        {
            ValErrWebMessage webm = new();

            //Check for write permissions
            if (webm.Assert(entity.Session.CanWrite() == true, "You do not have permission to publish posts"))
            {
                entity.CloseResponseJson(HttpStatusCode.Forbidden, webm);
                return VfReturnType.VirtualSkip;
            }

            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? contextId))
            {
                webm.Result = "No blog channel was selected";
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the blog context from the id
            IChannelContext? context = await ContentManager.GetChannelAsync(contextId, entity.EventCancellation);

            if (webm.Assert(context != null, "A blog with the given id does not exist"))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Get the post from the request body
            BlogPost? post = await entity.GetJsonFromFileAsync<BlogPost>();

            if (webm.Assert(post != null, "Message body was empty"))
            {
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Validate post
            if (!PostValidator.Validate(post, webm))
            {
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }

            //Publish post to the blog
            await PostManager.PublishPostAsync(context, post, entity.EventCancellation);

            //Success
            webm.Result = post;
            webm.Success = true;

            //Return updated post to client
            entity.CloseResponse(webm);
            return VfReturnType.VirtualSkip;
        }

        protected override async ValueTask<VfReturnType> PatchAsync(HttpEntity entity)
        {
            ValErrWebMessage webm = new();

            //Check for write permissions
            if (webm.Assert(entity.Session.CanWrite() == true, "You do not have permissions to update posts"))
            {
                entity.CloseResponseJson(HttpStatusCode.Forbidden, webm);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the blog id from the query
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? contextId))
            {
                webm.Result = "You must select a blog channel to update posts";
                entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the blog context from the id
            IChannelContext? channel = await ContentManager.GetChannelAsync(contextId, entity.EventCancellation);

            if (webm.Assert(channel != null, "The channel you selected does not exist"))
            {
                entity.CloseResponseJson(HttpStatusCode.NotFound, webm);
                return VfReturnType.VirtualSkip;
            }

            //Get the blog post object
            BlogPost? post = await entity.GetJsonFromFileAsync<BlogPost>();

            if (webm.Assert(post != null, "Message body was empty"))
            {
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }

            //Validate post
            if (!PostValidator.Validate(post, webm))
            {
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }

            //Update post against manager
            bool result = await PostManager.UpdatePostAsync(channel, post, entity.EventCancellation);

            if (webm.Assert(result, "Failed to update post because it does not exist or the blog channel was not found"))
            {
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }

            //Success
            webm.Result = post;
            webm.Success = true;

            entity.CloseResponse(webm);
            return VfReturnType.VirtualSkip;
        }

        protected override async ValueTask<VfReturnType> DeleteAsync(HttpEntity entity)
        {
            //Check for delete permissions
            if (!entity.Session.CanDelete())
            {
                WebMessage webm = new()
                {
                    Result = "You do not have permission to delete content"
                };
                entity.CloseResponseJson(HttpStatusCode.Forbidden, webm);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the blog id from the query
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? contextId))
            {
                entity.CloseResponse(HttpStatusCode.BadRequest);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the blog context from the id
            IChannelContext? context = await ContentManager.GetChannelAsync(contextId, entity.EventCancellation);
            if (context == null)
            {
                entity.CloseResponse(HttpStatusCode.NotFound);
                return VfReturnType.VirtualSkip;
            }

            //Try to get the post id from the query
            if (!entity.QueryArgs.TryGetNonEmptyValue("post", out string? postId))
            {
                entity.CloseResponse(HttpStatusCode.NotFound);
                return VfReturnType.VirtualSkip;
            }

            //Delete post
            await PostManager.DeletePostAsync(context, postId, entity.EventCancellation);

            //Success
            entity.CloseResponse(HttpStatusCode.OK);
            return VfReturnType.VirtualSkip;
        }

    }
}
