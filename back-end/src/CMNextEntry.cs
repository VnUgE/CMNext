/*
* Copyright (c) 2025 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: CMNextEntry.cs 
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

using VNLib.Plugins;
using VNLib.Utils.Logging;
using VNLib.Plugins.Extensions.Loading.Routing;
using VNLib.Plugins.Extensions.Loading.Routing.Mvc;

using Content.Publishing.Blog.Admin.Endpoints;

namespace Content.Publishing.Blog.Admin
{

    public sealed class CMNextEntry : PluginBase
    {
        public override string PluginName { get; } = "CMNext.Admin";

        protected override void OnLoad()
        { 
            this.Route<ChannelEndpoint>();

            this.Route<PostsEndpoint>();            
            
            this.Route<ContentEndpoint>();

            Log.Information("Plugin loaded");
            PrintHelloMessage();
        }

        protected override void OnUnLoad()
        {
            Log.Information("Plugin unloaded");
        }

        protected override void ProcessHostCommand(string cmd)
        { }

        private void PrintHelloMessage()
        {
            const string template =
@"
******************************************************************************
    CMNext - A dead-simple, multi-channel cms for your blog or podcast.
    By Vaughn Nugent - vnpublic@proton.me
    https://www.vaughnnugent.com/resources/software
    License: GNU Affero General Public License v3.0
    This application comes with ABSOLUTELY NO WARRANTY.

******************************************************************************";
           
            Log.Information(template);
        }
    }
}