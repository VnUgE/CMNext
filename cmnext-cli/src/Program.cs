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

using CMNext.Cli.Model.Channels;
using CMNext.Cli.Security;
using CMNext.Cli.Settings;
using CMNext.Cli.Site;
using CMNext.Cli.Storage;

using Microsoft.Extensions.DependencyInjection;

using System.IO;
using System.Security.Principal;
using System.Threading.Tasks;

using Typin;
using Typin.Attributes;
using Typin.Console;
using Typin.Exceptions;

using VNLib.Plugins;
using VNLib.Utils;
using VNLib.Utils.Logging;
using VNLib.Utils.Memory;


namespace CMNext.Cli
{

    internal sealed class Program
    {
        internal const string StorePath = "cmnext";
        internal const string AuthFileName = "auth.json";
        internal const string ConfigFileName = "config.json";

        static int Main(string[] argsv)
        {
            return new CliApplicationBuilder()
                 .AddCommandsFromThisAssembly()
                 .UseConsole<SystemConsole>()
                 .UseTitle("CMNext Copyright (c) Vaughn Nugent")
                 .UseStartupMessage("CMNext Copyright (c) Vaughn Nugent")
                 .UseVersionText("0.1.4")
                 .ConfigureServices(services =>
                 {
                     services.AddSingleton<PersistentDataStore>()
                            .AddSingleton<AppSettings>()
                            .AddSingleton<SiteManager>()
                            .AddSingleton<VauthRunner>()
                            .AddSingleton<ChannelStore>()
                            .AddSingleton<ConsoleLogProvider>();
                 })
                 .Build()
                 .RunAsync()
                 .AsTask()
                 .GetAwaiter()
                 .GetResult();
        }
    }

    public abstract class BaseCommand : ICommand
    {
        [CommandOption("verbose", 'v', Description = "Prints verbose output")]
        public bool Verbose { get; set; }

        public virtual ValueTask ExecuteAsync(IConsole console)
        {
            throw new CommandException("You must specify a sub command listed below", showHelp: true);
        }
    }
    public abstract class ListCommand : BaseCommand
    {
        public abstract string Id { get; set; }
    }

    public abstract class DeleteCommand : BaseCommand
    {
        public abstract string Id { get; set; }
    }

    [Command("post", Description = "Performs operations against posts within your cms")]
    public sealed class PostCommand : BaseCommand
    { }



    //Sub command for posts
    [Command("post list", Description = "Lists all posts within your cms")]
    public sealed class PostListCommand : ListCommand
    {
        [CommandOption("channel", 'c', Description = "Specifies the channel to list posts from", IsRequired = true)]
        public override string Id { get; set; } = string.Empty;
    }


    public abstract class PostMetaBase : BaseCommand
    {
        [CommandOption("channel", 'c', Description = "Specifies the channel to list posts from", IsRequired = true)]
        public string Channel { get; set; } = string.Empty;

        [CommandOption("post", 'p', Description = "Specifies the id of the post to retrieve", IsRequired = true)]
        public string Id { get; set; } = string.Empty;
    }

    [Command("post meta", Description = "Interacts with post metadata")]
    public sealed class PostMetaCommand : PostMetaBase
    { }

    public enum FileFormat
    {
        Text,
        Json,
        Xml,
    }

    [Command("post meta get", Description = "Retrieves prints the metadata of a desired post to the console")]
    public sealed class PostMetaGet: PostMetaBase
    {
        [CommandOption("file", 'o', Description = "Specifies the json file to write the metadata to")]
        public FileInfo? ToFile { get; set; } = null;

        [CommandOption("format", 't', Description = "Specifies the format of the metadata to write to the console", FallbackVariableName = "json")]
        public FileFormat Format { get; set; } = FileFormat.Json;
    }

    [Command("post meta set", Description = "Sets the metadata of a desired post")]
    public sealed class PostMetaSet: PostMetaBase
    {

        [CommandOption("file", 'i', Description = "The file to read medatadata from")]
        public FileInfo? FromFile { get; set; } = null;

        [CommandOption("tags", Description = "Optional tags to set on the post meta")]
        public string[]? Tags { get; set; } = null;

        [CommandOption("description", 'd', Description = "Optional description to set on the post meta")]
        public string? Description { get; set; }

        [CommandOption("title", 't', Description = "Optional title to set on the post meta")]
        public string? Title { get; set; }

        [CommandOption("author", 'a', Description = "Optional author to set on the post meta")]
        public string? Author { get; set; }
    }

   
}