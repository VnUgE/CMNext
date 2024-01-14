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


using RestSharp;
using System.Threading;
using System.Threading.Tasks;
using System.Security.Authentication;

using VNLib.Plugins;
using VNLib.Net.Rest.Client.Construction;

using Typin.Console;

using CMNext.Cli.Exceptions;
using CMNext.Cli.Settings;
using CMNext.Cli.Security;
using CMNext.Cli.Storage;

namespace CMNext.Cli.Site
{
    public sealed class SiteManager(AppSettings state, PersistentDataStore data, ConsoleLogProvider logger, IConsole console) 
    {
        readonly Task<WebAuthenticator> _lazyAuth = GetAuthenticatorAsync(state, data);
        readonly CancellationToken cancellation = console.GetCancellationToken();
       
        static async Task<WebAuthenticator> GetAuthenticatorAsync(AppSettings Config, PersistentDataStore Data)
        {
            //Load site configuration
            AppConfig site = await Config.GetConfigAsync();

            WebAuthenticator wa = new(new(site.BaseAddress));

            //try to load the auth data from the store
            _ = await Data.RestoreAsync(Program.AuthFileName, wa);

            //Return the authenticator regardless of success
            return wa;
        }

        public async Task<bool> HasValidAuth() => (await _lazyAuth).HasValidLogin();

        /// <summary>
        /// Gets the site adapter for the current site and configures
        /// it
        /// </summary>
        /// <returns></returns>
        public async Task<CMNextSiteAdapter> GetAdapterAsync()
        {
            //Get the site configuration
            AppConfig config = await state.GetConfigAsync();
            WebAuthenticator man = await _lazyAuth;

            //Init endpoint routes
            CMNextEndpointDefintion endpoints = new(config.Endpoints, man, logger);

            //Create a new site adapter and build the endpoints
            CMNextSiteAdapter adapter = new(config);
            adapter.BuildEndpoints(endpoints);

            //Set internal poke endpoint
            adapter.DefineSingleEndpoint()
                .WithEndpoint<ServerPokeRequest>()
                .WithUrl("/")
                .WithMethod(Method.Get)
                .WithModifier((_, r) => r.CookieContainer = man.Cookies)
                .WithLogger(logger);

            //Set login endpoint
            adapter.DefineSingleEndpoint()
                .WithEndpoint<LoginRequest>()
                .WithUrl(config.Endpoints.LoginPath)
                .WithMethod(Method.Post)
                .WithBody(r => r)
                .WithModifier((_, r) => r.CookieContainer = man.Cookies)
                .WithLogger(logger);

            return adapter;
        }        

        /// <summary>
        /// Attempts to authenticate the provided site with the provided credentials
        /// </summary>
        /// <param name="site">The cmnext site adapter to connect to</param>
        /// <param name="auth">The authenticator to use for the connection</param>
        /// <param name="token"></param>
        /// <param name="cancellation"></param>
        /// <returns></returns>
        /// <exception cref="AuthenticationException"></exception>
        public async Task AuthenticateAsync(IPkiCredential token)
        {
            //Wait for web auth
            WebAuthenticator auth = await _lazyAuth;
            CMNextSiteAdapter adapter = await GetAdapterAsync();

            //Prepare new login credentials
            ISecurityCredential cred = auth.PrepareLogin();

            /*
             * We must poke the server before we can send the login 
             * request to make sure we have a valid session cookie
             * ready for an upgrade
             */
            await PokeServerAsync(adapter);

            //Create a new login request
            LoginRequest request = new(token.GetToken(), cred);

            //Send the login request
            WebMessage response = (await adapter.ExecuteAsync(request, cancellation).AsJson<WebMessage>())!;

            //Check for success and throw result string if not
            if (!response.Success)
            {
                throw new AuthenticationException(response.Result!.ToString());
            }

            //Finalize the login
            auth.FinalizeLogin(cred, response);
        }

        /// <summary>
        /// Destroys the current authentication session
        /// </summary>
        /// <returns></returns>
        public async Task LogoutAsync()
        {
            //Wait for web auth
            WebAuthenticator auth = await _lazyAuth;
            auth.Destroy();
        }

        private async Task PokeServerAsync(CMNextSiteAdapter site)
        {
            try
            {
                await site.BeginRequest(new ServerPokeRequest())
                    .ExecAsync(cancellation);
            }
            catch (CMNextPermissionException)
            {
                //its okay if there was a permission exception during poke
            }
        }

        public async Task SaveStateAsync()
        {
            //Save the authenticator state
            WebAuthenticator auth = await _lazyAuth;
            await data.SaveAsync(Program.AuthFileName, auth);
        }

        sealed record class ServerPokeRequest();

    }
}