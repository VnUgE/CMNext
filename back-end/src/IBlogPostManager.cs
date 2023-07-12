/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: IBlogPostManager.cs 
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
    interface IBlogPostManager
    {
        Task PublishPostAsync(IChannelContext context, PostMeta post, CancellationToken cancellation);

        Task<PostMeta?> GetPostAsync(IChannelContext context, string postId, CancellationToken cancellation);

        Task<PostMeta[]> GetPostsAsync(IChannelContext context, CancellationToken cancellation);

        Task<bool> UpdatePostAsync(IChannelContext context, PostMeta post, CancellationToken cancellation);

        Task DeletePostAsync(IChannelContext context, string postId, CancellationToken cancellation);
    }
}
