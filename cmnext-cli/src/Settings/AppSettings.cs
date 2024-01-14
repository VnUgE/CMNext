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


using System.Threading;
using System.Threading.Tasks;

using CMNext.Cli.Storage;

namespace CMNext.Cli.Settings
{
    /// <summary>
    /// A store for persistent application settings 
    /// </summary>
    /// <param name="store"></param>
    public sealed class AppSettings(PersistentDataStore store)
    {
        //Load the config from the disk
        private readonly Task<AppConfig> _loadtask = store.ReadJsonOrDefaultAsync<AppConfig>(Program.ConfigFileName);

        /// <summary>
        /// Gets the apps global configuration data from the disk
        /// </summary>
        /// <returns>The site configuration</returns>
        public Task<AppConfig> GetConfigAsync() => _loadtask;

        /// <summary>
        /// Saves the provided configuration data to the disk
        /// </summary>
        /// <param name="config">The configuration instannce to store</param>
        /// <returns>A task that completes when stored</returns>
        public Task SaveConfigAsync(AppConfig config)
            => store.SaveJsonAsync(Program.ConfigFileName, config);
    }
}