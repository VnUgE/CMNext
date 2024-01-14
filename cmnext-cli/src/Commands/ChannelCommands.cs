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

using CMNext.Cli.Exceptions;
using CMNext.Cli.Model.Channels;

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Typin.Attributes;
using Typin.Console;
using Typin.Utilities;


namespace CMNext.Cli.Commands
{
    public sealed class ChannelCommands
    {
        [Command("channels", Description = "Performs operations against blog channels within your cms")]
        public sealed class ChannelCommand : BaseCommand
        { }

        [Command("channels list", Description = "Lists all blog channels within your cms")]
        public sealed class ChannelList(ChannelStore store, ConsoleLogProvider logger) : ListCommand
        {
            public override string Id { get; set; } = string.Empty;

            [CommandOption("search", 's', Description = "Show only results for a channel by it's name")]
            public string Search { get; set; } = string.Empty;

            public override async ValueTask ExecuteAsync(IConsole console)
            {
                CancellationToken cancellation = console.GetCancellationToken();
                logger.SetVerbose(Verbose);

                ChannelMeta[]? channels = await store.ListAsync(cancellation);

                if (channels is null)
                {
                    console.Error.WriteLine("No channels found");
                    return;
                }

                if(!string.IsNullOrWhiteSpace(Search))
                {
                    channels = channels.Where(c => c.Name.Contains(Search, StringComparison.OrdinalIgnoreCase)).ToArray();
                }

                console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine($"Found {channels.Length} channels"));

                TableUtils.Write(
                        console.Output,
                        channels,
                        ["Id", "Name", "Path", "Index", "Content", "Feed"],
                        null,
                        c => c.Id,
                        c => c.Name,
                        c => c.Path,
                        c => $"/{c.IndexFileName}",
                        c => $"/{c.ContentDir}",
                        c => (c.Feed != null) ? "*" : ""
                    );
            }
        }

        [Command("channels delete", Description = "Deletes a channel by it's id")]
        public sealed class ChannelDelete(ChannelStore store, ConsoleLogProvider logger) : DeleteCommand
        {
            [CommandOption("channel", 'c', Description = "Specifies the channel to delete", IsRequired = true)]
            public override string Id { get; set; } = string.Empty;

            public override async ValueTask ExecuteAsync(IConsole console)
            {
                CancellationToken cancellation = console.GetCancellationToken();
                logger.SetVerbose(Verbose);
                try
                {
                    await store.DeleteAsync(Id, cancellation);
                    console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine($"Deleted channel {Id}"));
                }
                catch (EntityNotFoundException)
                {
                    console.WithForegroundColor(ConsoleColor.Red, c => c.Error.WriteLine($"Channel {Id} does not exist"));
                    return;
                }
            }
        }

        [Command("channels create", Description = "Creates a new channel")]
        public sealed class ChannelCreateCommand(ChannelStore store, ConsoleLogProvider logger) : BaseCommand
        {
            [CommandOption("name", 'n', Description = "Specifies the name of the channel", IsRequired = true)]
            public string Name { get; set; } = string.Empty;

            [CommandOption("path", 'p', Description = "Specifies the path of the channel", IsRequired = true)]
            public string Path { get; set; } = string.Empty;

            [CommandOption("index", 'i', Description = "Specifies the index file name of the channel")]
            public string Index { get; set; } = "index.json";

            [CommandOption("content", 'c', Description = "Specifies the content directory of the channel", IsRequired = true)]
            public string Content { get; set; } = string.Empty;

            public async override ValueTask ExecuteAsync(IConsole console)
            {
                CancellationToken cancellation = console.GetCancellationToken();
                logger.SetVerbose(Verbose);

                ChannelMeta channel = new ()
                {
                    Name = Name,
                    Path = Path,
                    IndexFileName = Index,
                    ContentDir = Content,
                };

                await store.CreateAsync(channel, cancellation);
                console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine("New channel created successfully"));
            }
        }

        [Command("channels set", Description = "Updates a channel")]
        public sealed class ChannelUpdateCommand(ChannelStore store, ConsoleLogProvider logger) : BaseCommand
        {
            [CommandOption("channel", 'c', Description = "Specifies the channel to update", IsRequired = true)]
            public string Channel { get; set; } = string.Empty;

            [CommandOption("name", 'n', Description = "Specifies the name of the channel")]
            public string Name { get; set; } = string.Empty;

            [CommandOption("index", 'i', Description = "Specifies the index file name of the channel")]
            public string Index { get; set; } = string.Empty;

            [CommandOption("content", Description = "Specifies the content directory of the channel")]
            public string Content { get; set; } = string.Empty;

            public async override ValueTask ExecuteAsync(IConsole console)
            {
                CancellationToken cancellation = console.GetCancellationToken();
                logger.SetVerbose(Verbose);

                ChannelMeta? channel = await store.GetAsync(Channel, cancellation);

                if (channel is null)
                {
                    console.WithForegroundColor(ConsoleColor.Red, c => c.Error.WriteLine($"Channel {Channel} does not exist"));
                    return;
                }

                console.Output.WriteLine($"Found channel {Channel}");

                if (!string.IsNullOrWhiteSpace(Name))
                {
                    channel.Name = Name;
                    console.Output.WriteLine($"Setting channel name to {Name}");
                }

                if (!string.IsNullOrWhiteSpace(Index))
                {
                    channel.IndexFileName = Index;
                    console.Output.WriteLine($"Setting channel index file name to {Index}");
                }

                if (!string.IsNullOrWhiteSpace(Content))
                {
                    channel.ContentDir = Content;
                    console.Output.WriteLine($"Setting channel content directory to {Content}");
                }

                await store.UpdateAsync(channel, cancellation);
                console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine("Channel updated successfully"));
            }
        }

        [Command("channels feed get", Description = "Gets the RSS feed data for a channel if its set")]
        public sealed class ChannelFeedGetCommand(ChannelStore store, ConsoleLogProvider logger) : BaseCommand
        {
            [CommandOption("channel", 'c', Description = "Specifies the channel to get the feed for", IsRequired = true)]
            public string Channel { get; set; } = string.Empty;

            public async override ValueTask ExecuteAsync(IConsole console)
            {
                CancellationToken cancellation = console.GetCancellationToken();
                logger.SetVerbose(Verbose);

                ChannelMeta? channel = await store.GetAsync(Channel, cancellation);

                if (channel is null)
                {
                    console.WithForegroundColor(ConsoleColor.Red, c => c.Error.WriteLine($"Channel {Channel} does not exist"));
                    return;
                }

                console.Output.WriteLine($"Found channel {Channel}");

                if (channel.Feed is null)
                {
                    console.WithForegroundColor(ConsoleColor.Red, c => c.Error.WriteLine($"Channel {Channel} does not have a feed"));
                    return;
                }
                
                console.Output.WriteLine($"Found feed for channel {Channel}");

                console.ForegroundColor = ConsoleColor.Gray;
                console.Output.WriteLine($"  Path: {channel.Feed.Path}");
                console.Output.WriteLine($"  Description: {channel.Feed.Description}");
                console.Output.WriteLine($"  Author: {channel.Feed.Author}");
                console.Output.WriteLine($"  Contact: {channel.Feed.Contact}");
                console.Output.WriteLine($"  Image: {channel.Feed.ImagePath}");               
                console.Output.WriteLine($"  Link: {channel.Feed.Url}");

                console.ResetColor();
            }
        }

        [Command("channels feed set", Description = "Sets the RSS feed data for a channel")]
        public sealed class ChannelFeedSetCommand(ChannelStore store, ConsoleLogProvider logger) : BaseCommand
        {
            [CommandOption("channel", 'c', Description = "Specifies the channel to set the feed for", IsRequired = true)]
            public string Channel { get; set; } = string.Empty;

            [CommandOption("path", 'p', Description = "Specifies the path of the feed")]
            public string Path { get; set; } = string.Empty;

            [CommandOption("description", 'd', Description = "Specifies the description of the feed")]
            public string Description { get; set; } = string.Empty;

            [CommandOption("author", 'a', Description = "Specifies the author of the feed")]
            public string Author { get; set; } = string.Empty;

            [CommandOption("contact", Description = "Specifies the contact email address of the feed")]
            public string Contact { get; set; } = string.Empty;

            [CommandOption("image", 'i', Description = "Specifies the image of the feed")]
            public string Image { get; set; } = string.Empty;

            [CommandOption("link", 'l', Description = "Specifies the link of the feed")]
            public string Link { get; set; } = string.Empty;

            public async override ValueTask ExecuteAsync(IConsole console)
            {
                CancellationToken cancellation = console.GetCancellationToken();
                logger.SetVerbose(Verbose);

                ChannelMeta? channel = await store.GetAsync(Channel, cancellation);

                if (channel is null)
                {
                    console.WithForegroundColor(ConsoleColor.Red, c => c.Error.WriteLine($"Channel {Channel} does not exist"));
                    return;
                }

                console.Output.WriteLine($"Found channel {Channel}");

                bool modified = false;

                //Allow creating a new feed if the channel doesn't have one
                channel.Feed ??= new ChannelFeed();

                if (!string.IsNullOrWhiteSpace(Path))
                {
                    channel.Feed.Path = Path;
                    console.Output.WriteLine($"Setting feed path to {Path}");
                    modified = true;
                }
                if (!string.IsNullOrWhiteSpace(Contact))
                {
                    channel.Feed.Contact = Contact;
                    console.Output.WriteLine($"Setting feed contact to {Contact}");
                    modified = true;
                }

                if (!string.IsNullOrWhiteSpace(Description))
                {
                    channel.Feed.Description = Description;
                    console.Output.WriteLine($"Setting feed description to {Description}");
                    modified = true;
                }

                if (!string.IsNullOrWhiteSpace(Author))
                {
                    channel.Feed.Author = Author;
                    console.Output.WriteLine($"Setting feed author to {Author}");
                    modified = true;
                }

                if (!string.IsNullOrWhiteSpace(Image))
                {
                    channel.Feed.ImagePath = Image;
                    console.Output.WriteLine($"Setting feed image to {Image}");
                    modified = true;
                }

                if (!string.IsNullOrWhiteSpace(Link))
                {
                    channel.Feed.Url = Link;
                    console.Output.WriteLine($"Setting feed link to {Link}");
                    modified = true;
                }

                if (!modified)
                {
                    console.WithForegroundColor(ConsoleColor.Yellow, c => c.Error.WriteLine($"No changes made to channel {Channel}"));
                    return;
                }

                await store.UpdateAsync(channel, cancellation);
                console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine("Channel feed updated successfully"));
            }

            [Command("channels feed delete", Description = "Deletes the RSS feed data for a channel")]
            public sealed class ChannelFeedDeleteCommand(ChannelStore store, ConsoleLogProvider logger) : BaseCommand
            {
                [CommandOption("channel", 'c', Description = "Specifies the channel to delete the feed for", IsRequired = true)]
                public string Channel { get; set; } = string.Empty;

                public async override ValueTask ExecuteAsync(IConsole console)
                {
                    CancellationToken cancellation = console.GetCancellationToken();
                    logger.SetVerbose(Verbose);

                    ChannelMeta? channel = await store.GetAsync(Channel, cancellation);

                    if (channel is null)
                    {
                        console.WithForegroundColor(ConsoleColor.Red, c => c.Error.WriteLine($"Channel {Channel} does not exist"));
                        return;
                    }

                    console.Output.WriteLine($"Found channel {Channel}");

                    if (channel.Feed is null)
                    {
                        console.WithForegroundColor(ConsoleColor.Red, c => c.Error.WriteLine($"Channel {Channel} does not have a feed"));
                        return;
                    }

                    console.Output.WriteLine($"Found feed for channel {Channel}");

                    channel.Feed = null;

                    await store.UpdateAsync(channel, cancellation);
                    console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine("Channel feed deleted successfully"));
                }
            }

        }
    }

    

}