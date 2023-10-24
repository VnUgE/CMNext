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
                return VirtualClose(entity, webm, HttpStatusCode.Forbidden);
            }

            //Try to get the blog id from the query
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? contextId))
            {
                return VfReturnType.BadRequest;
            }

            //Try to get the blog context from the id
            IChannelContext? context = await ContentManager.GetChannelAsync(contextId, entity.EventCancellation);
            if (context == null)
            {
                return VfReturnType.NotFound;
            }

            //Try to get the post id from the query
            if (entity.QueryArgs.TryGetNonEmptyValue("post", out string? postId))
            {
                //Try to get single post
                PostMeta? post = await PostManager.GetPostAsync(context, postId, entity.EventCancellation);

                return post != null ? VirtualOkJson(entity, post) : VfReturnType.NotFound;
            }

            //Get the post meta list
            PostMeta[] posts = await PostManager.GetPostsAsync(context, entity.EventCancellation);
            return VirtualOkJson(entity, posts);
        }

        protected override async ValueTask<VfReturnType> PostAsync(HttpEntity entity)
        {
            ValErrWebMessage webm = new();

            //Check for write permissions
            if (webm.Assert(entity.Session.CanWrite() == true, "You do not have permission to publish posts"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.Forbidden);
            }

            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? contextId))
            {
                webm.Result = "No blog channel was selected";
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //Try to get the blog context from the id
            IChannelContext? context = await ContentManager.GetChannelAsync(contextId, entity.EventCancellation);

            if (webm.Assert(context != null, "A blog with the given id does not exist"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.NotFound);
            }

            //Get the post from the request body
            BlogPost? post = await entity.GetJsonFromFileAsync<BlogPost>();

            if (webm.Assert(post != null, "Message body was empty"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //Validate post
            if (!PostValidator.Validate(post, webm))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            //Publish post to the blog
            await PostManager.PublishPostAsync(context, post, entity.EventCancellation);

            //Success
            webm.Result = post;
            webm.Success = true;

            //Return updated post to client
            return VirtualOk(entity, webm);
        }

        protected override async ValueTask<VfReturnType> PatchAsync(HttpEntity entity)
        {
            ValErrWebMessage webm = new();

            //Check for write permissions
            if (webm.Assert(entity.Session.CanWrite() == true, "You do not have permissions to update posts"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.Forbidden);
            }

            //Try to get the blog id from the query
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? contextId))
            {
                webm.Result = "You must select a blog channel to update posts";
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //Try to get the blog context from the id
            IChannelContext? channel = await ContentManager.GetChannelAsync(contextId, entity.EventCancellation);

            if (webm.Assert(channel != null, "The channel you selected does not exist"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.NotFound);
            }

            //Get the blog post object
            BlogPost? post = await entity.GetJsonFromFileAsync<BlogPost>();

            if (webm.Assert(post != null, "Message body was empty"))
            {
                return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
            }

            //Validate post
            if (!PostValidator.Validate(post, webm))
            {
                return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
            }

            //Update post against manager
            bool result = await PostManager.UpdatePostAsync(channel, post, entity.EventCancellation);

            if (webm.Assert(result, "Failed to update post because it does not exist or the blog channel was not found"))
            {
                return VirtualOk(entity, webm);
            }

            //Success
            webm.Result = post;
            webm.Success = true;

            return VirtualOk(entity, webm);
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
                return VirtualClose(entity, webm, HttpStatusCode.Forbidden);
            }

            //Try to get the blog id from the query
            if (!entity.QueryArgs.TryGetNonEmptyValue("channel", out string? contextId))
            {
                return VfReturnType.BadRequest;
            }

            //Try to get the blog context from the id
            IChannelContext? context = await ContentManager.GetChannelAsync(contextId, entity.EventCancellation);
            if (context == null)
            {
                return VfReturnType.NotFound;
            }

            //Try to get the post id from the query
            if (!entity.QueryArgs.TryGetNonEmptyValue("post", out string? postId))
            {
                return VfReturnType.NotFound;
            }

            //Delete post
            await PostManager.DeletePostAsync(context, postId, entity.EventCancellation);

            //Success
            return VirtualOk(entity);
        }

    }
}
