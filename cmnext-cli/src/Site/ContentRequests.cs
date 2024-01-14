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

using System.IO;

using CMNext.Cli.Model.Content;

namespace CMNext.Cli.Site
{
    sealed record class ListContentRequest(string ChannelId);

    sealed record class GetContentLinkRequest(string ChannelId, string ContentId);

    sealed record class DeleteContentRequest(string ChannelId, string ContentId);

    sealed record class DeleteBulkContentRequest(string ChannelId, string[] ContentIds);

    internal sealed record class UploadFileRequest(string ChannelId, string? ContentId, string Name, FileInfo LocalFile);

    internal sealed record class SetContentMetaRequest(string ChannelId, ContentMeta Content);
}