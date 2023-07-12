/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: IChannelContextManager.cs 
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

using System.Threading;
using System.Threading.Tasks;

using Content.Publishing.Blog.Admin.Model;

namespace Content.Publishing.Blog.Admin
{
    internal interface IChannelContextManager
    {
        /// <summary>
        /// Gets a channel context by id.
        /// </summary>
        /// <param name="id">The id of the context to get</param>
        /// <returns></returns>
        Task<IChannelContext?> GetChannelAsync(string id, CancellationToken cancellation);

        /// <summary>
        /// Gets the entire channel collection.
        /// </summary>
        /// <returns>Opaque objects that represent channel context objects</returns>
        Task<object[]> GetAllContextsAsync(CancellationToken cancellation);

        /// <summary>
        /// Creates a new channel context.
        /// </summary>
        /// <param name="context">The new blog channel to create</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>The result of the operation</returns>
        Task<bool> CreateChannelAsync(BlogChannel context, CancellationToken cancellation);

        /// <summary>
        /// Updates an existing channel context.
        /// </summary>
        /// <param name="context">The channel context to update</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>The result of the operation</returns>
        Task<bool> UpdateChannelAsync(BlogChannel context, CancellationToken cancellation);

        /// <summary>
        /// Delets a channel context from the store.
        /// </summary>
        /// <param name="context">The context to delete</param>
        /// <param name="cancellation">A token to cancel the operation</param>
        /// <returns>A task that completes when the channel was deleted</returns>
        Task DeleteChannelAsync(IChannelContext context, CancellationToken cancellation);
    }
}
