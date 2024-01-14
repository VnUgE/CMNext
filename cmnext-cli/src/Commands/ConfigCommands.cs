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

using CMNext.Cli.Settings;

using System;
using System.Globalization;
using System.Threading.Tasks;

using Typin.Attributes;
using Typin.Console;


namespace CMNext.Cli.Commands
{
    public sealed class ConfigCommands
    {

        [Command("config", Description = "Manages this client's configuration data")]
        public class ConfigBase : BaseCommand
        { }

        [Command("config set", Description = "Sets the configuration of this client")]
        public sealed class SetConfigCommand(AppSettings state) : BaseCommand
        {
            [CommandOption("url", 'u', Description = "The url of your cmnext server")]
            public string? Url { get; set; }


            [CommandOption("channels", 'c', Description = "The path from the base-url to the channels endpoint")]
            public string? Channels { get; set; }

            [CommandOption("posts", Description = "The path from the base-url to the posts endpoint")]
            public string? Posts { get; set; }

            [CommandOption("content", Description = "The path from the base-url to the auth endpoint")]
            public string? Content { get; set; }

            [CommandOption("login", Description = "The path from the base-url to the pki login endpoint")]
            public string? Login { get; set; }

            [CommandOption("vauth", Description = "The command to use to execute vauth to generate login passcode")]
            public string? Vauth { get; set; }

            ///<inheritdoc/>
            public override async ValueTask ExecuteAsync(IConsole console)
            {
                bool modified = false;

                //get site config
                AppConfig siteConfig = await state.GetConfigAsync();

                if (!string.IsNullOrWhiteSpace(Url))
                {
                    console.Output.WriteLine($"Setting url to {Url}...");
                    siteConfig.BaseAddress = Url;
                    modified = true;
                }

                if (!string.IsNullOrWhiteSpace(Channels))
                {
                    console.Output.WriteLine($"Setting channel path to {Channels}...");
                    siteConfig.Endpoints.ChannelPath = Channels;
                    modified = true;
                }

                if (!string.IsNullOrWhiteSpace(Posts))
                {
                    console.Output.WriteLine($"Setting post path to {Posts}...");
                    siteConfig.Endpoints.PostPath = Posts;
                    modified = true;
                }

                if (!string.IsNullOrWhiteSpace(Content))
                {
                    console.Output.WriteLine($"Setting content path to {Content}...");
                    siteConfig.Endpoints.ContentPath = Content;
                    modified = true;
                }

                if (!string.IsNullOrWhiteSpace(Login))
                {
                    console.Output.WriteLine($"Setting pki endpoint path to {Login}...");
                    siteConfig.Endpoints.LoginPath = Login;
                    modified = true;
                }

                if(!string.IsNullOrWhiteSpace(Vauth))
                {
                    console.Output.WriteLine($"Setting vauth command to {Vauth}...");
                    siteConfig.VauthCommands = Vauth;
                    modified = true;
                }

                //Save config if modified
                if (modified)
                {
                    console.WithForegroundColor(ConsoleColor.Gray, io => io.Output.WriteLine("Writing configuration..."));
                    await state.SaveConfigAsync(siteConfig);
                    console.WithForegroundColor(ConsoleColor.Green, io => io.Output.WriteLine("Configuration saved."));
                }
                else
                {
                    console.Output.WriteLine("No changes to save.");
                }
            }
        }

        [Command("config set endpoints", Description = "Sets the configuration of this client")]
        public sealed class SetConfigEndpointsCommand(AppSettings state) : BaseCommand
        {

            ///<inheritdoc/>
            public override async ValueTask ExecuteAsync(IConsole console)
            {
                bool modified = false;

                //get site config
                AppConfig siteConfig = await state.GetConfigAsync();

              

                //Save config if modified
                if (modified)
                {
                    console.Output.WriteLine("Saving configuration...");
                    await state.SaveConfigAsync(siteConfig);
                    console.Output.WriteLine("Configuration saved.");
                }
                else
                {
                    console.Output.WriteLine("No changes to save.");
                }
            }
        }

        [Command("config get", Description = "Gets the configuration of this client")]
        public sealed class GetConfigCommand(AppSettings state) : BaseCommand
        {
            ///<inheritdoc/>
            public override async ValueTask ExecuteAsync(IConsole console)
            {
                //get site config
                AppConfig siteConfig = await state.GetConfigAsync();

                console.WithForegroundColor(ConsoleColor.Gray, c => c.Output.WriteLine("Current configuration:"));
                
                console.Output.WriteLine("vauth: {0}", siteConfig.VauthCommands);
                console.Output.WriteLine($"Url: {siteConfig.BaseAddress}");

                console.Output.WriteLine($"Channels: {siteConfig.Endpoints.ChannelPath}");
                console.Output.WriteLine($"Posts: {siteConfig.Endpoints.PostPath}");
                console.Output.WriteLine($"Content: {siteConfig.Endpoints.ContentPath}");
                console.Output.WriteLine($"Login: {siteConfig.Endpoints.LoginPath}");

            }
        }
    }
}