/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: IBlogFeedContext.cs 
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

namespace Content.Publishing.Blog.Admin.Model
{
    internal interface IBlogFeedContext
    {
        string PublihUrl { get; }
        string FeedPath { get; }
        string? ImageUrl { get; }
        int? MaxItems { get; }
        string? WebMaster { get; }
        string? Author { get; }
        string? Description { get; }
    }
}
