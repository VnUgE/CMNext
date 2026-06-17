/*
* Copyright (c) 2026 Vaughn Nugent
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

using System;
using System.Diagnostics;

using Content.Publishing.Blog.Admin.Endpoints;

using VNLib.Plugins;
using VNLib.Plugins.Essentials.Accounts;
using VNLib.Plugins.Essentials.Users;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Loading.Routing;
using VNLib.Plugins.Extensions.Loading.Routing.Mvc;
using VNLib.Plugins.Extensions.Loading.Users;
using VNLib.Utils;
using VNLib.Utils.Logging;
using VNLib.Utils.Memory;

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

            // Setup debug user
            ConfigureDevUser();

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

        // Only include on debug builds
        [Conditional("DEBUG")]
        private void ConfigureDevUser()
        {
            string? devUserName = Environment.GetEnvironmentVariable("CMNEXT_DEBUG_USERNAME");
            string? devUserPass = Environment.GetEnvironmentVariable("CMNEXT_DEBUG_PASSWORD");

            // See if the user defined a debug user for startup
            if (!HostArgs.HasArgument("--cmnext-debug-setup"))
            {
                return;
            }

            if (!this.IsDebug())
            {
                Log.Error("Plugin is not in debug mode, cannot setup debug user. Restart the server with plugins in debug mode");
                return;
            }

            UserManager users = this.GetOrCreateSingleton<UserManager>();          

            if (string.IsNullOrWhiteSpace(devUserName))
            {
                Log.Error("CMNext debug username is empty or whitespace");
                return;
            }

            if (string.IsNullOrWhiteSpace(devUserPass))
            {
                Log.Error("CMNext debug password is empty or whitespace");
                return;
            }

            Log.Information("Setting up new cmnext debug user account");

            _ = this.ObserveWork(async () =>
            {
                using (IUser? user = await users.GetUserFromUsernameAsync(devUserName))
                {
                    // Deletes user and recreates it
                    if (user is not null)
                    {
                        if (!HostArgs.HasArgumentValue("--cmnext-debug-reset"))
                        {
                            Log.Warn("Debug account exists but '--cmnext-debug-reset' is not set. User account will not be re-created");
                            return;
                        }

                        Log.Warn("User account exists and will be deleted and reset");

                        user.Delete();
                        await user.ReleaseAsync();
                    }
                }

                //Create the user creation request
                UserCreationRequest creation = new()
                {
                    Username        = devUserName,
                    InitialStatus   = UserStatus.Active,
                    Privileges      = AccountUtil.MINIMUM_LEVEL,
                    Password        = PrivateString.ToPrivateString(devUserPass, false)
                };

                using (IUser user = await users.CreateUserAsync(creation, null, users.GetHashProvider()))
                {
                    //Set local account
                    user.SetAccountOrigin(AccountUtil.LOCAL_ACCOUNT_ORIGIN);
                    user.EmailAddress = devUserPass;

                    await user.ReleaseAsync();
                }

                Log.Information("Successfully created user {id}", devUserName);
            });
        }
    }
}
