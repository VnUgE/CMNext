/*
* Copyright (c) 2024 Vaughn Nugent
* 
* Package: CMNext.Cli
* File: Program.cs 
*
* CMNext.Cli is free software: you can redistribute it and/or modify 
* it under the terms of the GNU General Public License as published
* by the Free Software Foundation, either version 2 of the License,
* or (at your option) any later version.
*
* CMNext.Cli is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
* General Public License for more details.
*
* You should have received a copy of the GNU General Public License 
* along with CMNext.Cli. If not, see http://www.gnu.org/licenses/.
*/


using RestSharp;

using System;
using System.Net;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using VNLib.Utils.Extensions;
using VNLib.Utils.Logging;
using VNLib.Net.Rest.Client.Construction;

using CMNext.Cli.Exceptions;
using CMNext.Cli.Security;
using System.Diagnostics;

namespace CMNext.Cli.Site
{
    public interface ICMNextEndpointMap
    {
        string ChannelPath { get; }

        string PostPath { get; }

        string ContentPath { get; }

        string LoginPath { get; }
    }
    

    public sealed class CMNextEndpointDefintion(ICMNextEndpointMap Endpoints, IAuthAdapter Auth, ILogProvider Logger) : IRestEndpointDefinition
    {
        public void BuildRequest(IRestSiteAdapter site, IRestEndpointBuilder builder)
        {
            builder.WithEndpoint<ListChannelRequest>()
                .WithUrl(Endpoints.ChannelPath)
                .AcceptJson()
                .WithMethod(Method.Get)
                .WithAccessDeniedHandler("You do not have the required permissions to list channels. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<GetChannelRequest>()
                .WithUrl(Endpoints.ChannelPath)
                .AcceptJson()
                .WithMethod(Method.Get)
                .WithQuery("id", p => p.ChannelId)
                .WithAccessDeniedHandler("You do not have the required permissions to get a channel. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<SetChannelRequest>()
                .WithUrl(Endpoints.ChannelPath)
                .AcceptJson()
                .WithMethod(Method.Patch)
                .WithBody(r => r.Channel)
                .WithAccessDeniedHandler("You do not have the required permissions to update a channel. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<CreateChannelRequest>()
                .WithUrl(Endpoints.ChannelPath)
                .AcceptJson()
                .WithMethod(Method.Post)
                .WithBody(r => r.Channel)
                .WithAccessDeniedHandler("You do not have the required permissions to create a channel. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<DeleteChannelRequest>()
                .WithUrl(Endpoints.ChannelPath)
                .AcceptJson()
                .WithMethod(Method.Delete)
                .WithQuery("channel", p => p.ChannelId)
                .WithAccessDeniedHandler("You do not have the required permissions to delete a channel. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            //Setup post endpoints
            builder.WithEndpoint<ListPostMetaRequest>()
                .WithUrl(Endpoints.PostPath)
                .AcceptJson()
                .WithMethod(Method.Get)
                .WithQuery("channel", p => p.ChannelId)
                .WithAccessDeniedHandler("You do not have the required permissions to list all posts. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<GetPostMetaRequest>()
                .WithUrl(Endpoints.PostPath)
                .AcceptJson()
                .WithMethod(Method.Get)
                .WithQuery("channel", p => p.ChannelId)
                .WithQuery("post", p => p.PostId)
                .WithAccessDeniedHandler("You do not have the required permissions to get a post. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<SetPostMetaRequest>()
                .WithUrl(Endpoints.PostPath)
                .AcceptJson()
                .WithMethod(Method.Patch)
                .WithBody(r => r.Post)
                .WithQuery("channel", p => p.ChannelId)
                .WithAccessDeniedHandler("You do not have the required permissions to modify a post. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<CreatePostMetaRequest>()
                .WithUrl(Endpoints.PostPath)
                .AcceptJson()
                .WithMethod(Method.Post)
                .WithBody(r => r.Post)
                .WithQuery("channel", p => p.ChannelId)
                .WithAccessDeniedHandler("You do not have the required permissions to create a post. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<DeletePostMetaRequest>()               
                .WithUrl(Endpoints.PostPath)
                .AcceptJson()
                .WithMethod(Method.Delete)
                .WithQuery("channel", p => p.ChannelId)
                .WithQuery("post", p => p.PostId)
                .WithAccessDeniedHandler("You do not have the required permissions to delete a post. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            //Setup content endpoints
            builder.WithEndpoint<ListContentRequest>()                
                .WithUrl(Endpoints.ContentPath)
                .AcceptJson()
                .WithMethod(Method.Get)
                .WithQuery("channel", p => p.ChannelId)
                .WithAccessDeniedHandler("You do not have the required permissions to list all content. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<SetContentMetaRequest>()               
               .WithUrl(Endpoints.ContentPath)
               .AcceptJson()
               .WithMethod(Method.Patch)
               .WithQuery("channel", p => p.ChannelId)
               .WithBody(r => r.Content)
               .WithAccessDeniedHandler("You do not have the required permissions to modify content metadata. Access denied")
               .WithAuth(Auth)
               .WithLogger(Logger);

            builder.WithEndpoint<GetContentLinkRequest>()
                .WithUrl(Endpoints.ContentPath)
                .AcceptJson()
                .WithMethod(Method.Get)
                .WithQuery("channel", p => p.ChannelId)
                .WithQuery("id", p => p.ContentId)
                .WithQuery("getlink", "true")
                .WithAccessDeniedHandler("You do not have the required permissions to get content. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<DeleteContentRequest>()
                .WithUrl(Endpoints.ContentPath)
                .AcceptJson()
                .WithMethod(Method.Delete)
                .WithQuery("channel", p => p.ChannelId)
                .WithQuery("id", p => p.ContentId)
                .WithAccessDeniedHandler("You do not have the required permissions to delete content. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<DeleteBulkContentRequest>()
                .WithUrl(Endpoints.ContentPath)
                .AcceptJson()
                .WithMethod(Method.Delete)
                .WithQuery("channel", p => p.ChannelId)
                .WithQuery("ids", p => string.Join(',', p.ContentIds))
                .WithAccessDeniedHandler("You do not have the required permissions to delete content. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            builder.WithEndpoint<UploadFileRequest>()
                .WithUrl(Endpoints.ContentPath)
                .AcceptJson()
                .WithMethod(Method.Put)
                .WithQuery("channel", p => p.ChannelId)
                .WithQuery("id", p => p.ContentId!) //Allowed to be null, it will be ignored
                .WithHeader("X-Content-Name", p => p.Name)
                .WithModifier((r, req) => req.AddFile("file", r.LocalFile.FullName))    //Add the file from its fileinfo
                .WithAccessDeniedHandler("You do not have the required permissions to upload content. Access denied")
                .WithAuth(Auth)
                .WithLogger(Logger);

            //Setup server poke endpoint
        }
    }

    

    internal static class EndpointExtensions
    {
        /// <summary>
        /// Specifes that the desired response Content-Type is of application/json
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="builder"></param>
        /// <returns></returns>
        public static IRestRequestBuilder<T> AcceptJson<T>(this IRestRequestBuilder<T> builder)
        {
            return builder.WithHeader("Accept", "application/json");
        }

        public static IRestRequestBuilder<T> WithAccessDeniedHandler<T>(this IRestRequestBuilder<T> builder, string message)
        {
            return builder.OnResponse((_, res) =>
            {
                if (res.StatusCode == HttpStatusCode.Forbidden)
                {
                    throw new CMNextPermissionException(message);
                }
            });
        }

        public static IRestRequestBuilder<T> WithBody<T, TBody>(this IRestRequestBuilder<T> builder, Func<T, TBody> body) where TBody : class 
        {
            return builder.WithModifier((t, req) => req.AddJsonBody(body(t)));
        }

        public static IRestRequestBuilder<T> WithLogger<T>(this IRestRequestBuilder<T> builder, ILogProvider logger)
        {
            builder.WithModifier((t, req) =>
            {
                Debug.Assert(req.CookieContainer != null);
                string[] cookies = req.CookieContainer!.GetAllCookies().Select(c => $"{c.Name}={c.Value}").ToArray();
                string cookie = string.Join("\n", cookies);

                //List all headers
                string[] headers = req.Parameters.Where(p => p.Type == ParameterType.HttpHeader)
                                        .Select(p => $"{p.Name}: {p.Value}")
                                        .ToArray();

                string h = string.Join("\n", headers);

                logger.Verbose("Sending: {0} {1} HTTP/1.1\n{2}\n{3}\n{4}", req.Method, req.Resource, h, cookie, t);
            });

            builder.OnResponse((_, res) => 
            {
                string[] cookies = res.Cookies!.Select(c => $"{c.Name}={c.Value}").ToArray();
                string cookie = string.Join("\n", cookies);

                //list response headers
                string[]? headers = res.Headers?.Select(h => $"{h.Name}: {h.Value}").ToArray();
                string h = string.Join("\n", headers ?? []);


                logger.Verbose("Received: {0} {1} {2} -> {3} bytes \n{4}\n{5}\n{6}",
                    res.Request.Resource,
                    (int)res.StatusCode, 
                    res.StatusCode.ToString(), 
                    res.RawBytes?.Length,
                    h,
                    cookie, 
                    res.Content
                );
            });

            return builder;
        }

        /// <summary>
        /// Specifies the authentication adapter for the endpoint
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="buider"></param>
        /// <param name="adapter">The auth adapter to set for the endpoint</param>
        /// <returns></returns>
        public static IRestRequestBuilder<T> WithAuth<T>(this IRestRequestBuilder<T> buider, IAuthAdapter adapter)
        {
            //Specify adapter for desired endpoint
            adapter.SetModifiersForEndpoint(buider);
            return buider;
        }
        
        public static PendingRequest<T> BeginRequest<T>(this IRestSiteAdapter site, T request) 
            => new (site, request);

        public sealed class PendingRequest<T>(IRestSiteAdapter Adapter, T request)
        {

            private readonly LinkedList<Action<T>> _beforeExecChain = new();

            public PendingRequest<T> BeforeRequest(Action<T> beforeRequest)
            {
                _beforeExecChain.AddLast(beforeRequest);
                return this;
            }

            public Task<RestResponse> ExecAsync(CancellationToken cancellation)
            {
                _beforeExecChain.TryForeach(p => p.Invoke(request));
                return Adapter.ExecuteAsync(request, cancellation);
            }

            public Task<RestResponse<TJson>> ExecAsync<TJson>(CancellationToken cancellation)
            {
                return Adapter.ExecuteAsync<T, TJson>(request, cancellation);
            }
        }
    }
}