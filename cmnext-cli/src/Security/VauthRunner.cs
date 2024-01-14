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

using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Typin.Console;
using Typin.Exceptions;

using VNLib.Utils.Logging;


namespace CMNext.Cli.Security
{
    public sealed class VauthRunner(AppSettings settings, IConsole console, ConsoleLogProvider logger)
    {
        private readonly CancellationToken cancellationToken = console.GetCancellationToken();

        public async Task<IPkiCredential> GetOptTokenAsync()
        {
            //Load app config
            AppConfig config = await settings.GetConfigAsync();

            //Get vauth command
            string[] vauth = config.VauthCommands.Split(" ");

            logger.Verbose("Executing vauth {0} with arguments", vauth[0], vauth.Skip(1));

            //Run the executable
            ProcessStartInfo psi = new(vauth[0], vauth.Skip(1))
            {
                RedirectStandardOutput = true,
                CreateNoWindow = true,
                ErrorDialog = true
            };

            Process p = Process.Start(psi)!;

            string? result = await p.StandardOutput.ReadLineAsync(cancellationToken);
            logger.Verbose("vauth returned {0}", result);

            //Wait for the process to exit
            await p.WaitForExitAsync(cancellationToken);

            if (p.ExitCode != 0)
            {
                throw new CommandException("vauth exited with a non-zero exit code");
            }

            if (string.IsNullOrWhiteSpace(result))
            {
                throw new CommandException("vauth did not return a token");
            }

            return new PkiToken(result);
        }

        sealed record class PkiToken(string Token) : IPkiCredential
        {
            public string GetToken() => Token;
        }
    }
}