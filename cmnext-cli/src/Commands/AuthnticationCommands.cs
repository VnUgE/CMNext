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

using CMNext.Cli.Security;
using CMNext.Cli.Site;

using System;
using System.Security.Authentication;
using System.Threading;
using System.Threading.Tasks;

using Typin.Attributes;
using Typin.Console;
using Typin.Exceptions;


namespace CMNext.Cli.Commands
{
    public sealed class AuthnticationCommands
    {

        [Command("auth", Description = "Manages your local authentication data")]
        public sealed class AuthCommand : BaseCommand
        { }

        [Command("auth login", Description = "Authenticates this client against your CMNext server")]
        public sealed class AuthLoginCommand(SiteManager siteManager, VauthRunner vauth, ConsoleLogProvider logger) : BaseCommand
        {
            [CommandOption("stdin", 's', Description = "Reads the token from stdin instead of using vauth")]
            public bool FromStdin { get; set; }

            [CommandOption("force", 'f', Description = "Forces a login even if you already have a valid authorization")]
            public bool Force { get; set; }

            ///<inheritdoc/>
            public override async ValueTask ExecuteAsync(IConsole console)
            {
                logger.SetVerbose(Verbose);

                //global cancel
                CancellationToken cancellation = console.GetCancellationToken();

                IPkiCredential token;

                //See if current auth is valid
                if(await siteManager.HasValidAuth())
                {
                    if (!Force)
                    {
                        console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine("You already have a valid authorization!"));
                        return;
                    }
                }

                if (FromStdin)
                {
                    console.Output.WriteLine("Please enter your PKI token:");

                    //Read the token in from stdin
                    string? otp = await console.Input.ReadLineAsync(cancellation);

                    if (string.IsNullOrWhiteSpace(otp))
                    {
                        throw new CommandException("You must enter a one time login token to continue");
                    }

                    token = new PkiToken(otp);
                }
                else
                {
                    console.Output.WriteLine("Getting token from vauth");
                    //Get the token from vauth
                    token = await vauth.GetOptTokenAsync();
                }


                console.Output.WriteLine("Logging in...");

                try
                {
                    await siteManager.AuthenticateAsync(token);
                    console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine("Login successful!"));
                }
                catch (AuthenticationException ae)
                {
                    console.WithForegroundColor(ConsoleColor.Red, c => c.Output.WriteLine($"Authentication failed: {ae.Message}"));
                }
                finally
                {
                    await siteManager.SaveStateAsync();
                }
            }

            sealed record class PkiToken(string Token) : IPkiCredential
            {
                public string GetToken() => Token;
            }
        }

        [Command("auth logout", Description = "Destroys any local previous login state")]
        public sealed class AuthLogoutCommand(SiteManager siteManager, ConsoleLogProvider logger) : BaseCommand
        {
            ///<inheritdoc/>
            public override async ValueTask ExecuteAsync(IConsole console)
            {
                logger.SetVerbose(Verbose);

                console.Output.WriteLine("Logging out...");

                try
                { 
                    //See if current auth is valid
                    await siteManager.LogoutAsync();
                    console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine("Logout successful!"));
                }
                finally
                {
                    await siteManager.SaveStateAsync();
                }
            }

            sealed record class PkiToken(string Token) : IPkiCredential
            {
                public string GetToken() => Token;
            }
        }

        [Command("auth status", Description = "Gets you client's current authorization status")]
        public sealed class AuthStatusCommand(SiteManager siteManager) : BaseCommand
        {
            public override async ValueTask ExecuteAsync(IConsole console)
            {
                //global cancel
                CancellationToken cancellation = console.GetCancellationToken();

                console.Output.WriteLine("Checking login status...");

                if (await siteManager.HasValidAuth())
                {
                    console.WithForegroundColor(ConsoleColor.Green, c => c.Output.WriteLine("You have a valid authorization"));
                }
                else
                {
                    console.WithForegroundColor(ConsoleColor.Red, c => c.Output.WriteLine("You do not have a valid authorization"));
                }
            }
        }
    }
}