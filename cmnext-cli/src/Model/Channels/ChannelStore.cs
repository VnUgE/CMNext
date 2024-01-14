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
using System.Text.Json.Serialization;

using CMNext.Cli.Site;

using VNLib.Net.Rest.Client.Construction;
using System.Linq;


namespace CMNext.Cli.Model.Channels
{
    public sealed class ChannelStore(SiteManager site) : ICMNextStore<ChannelMeta>
    {

        ///<inheritdoc/>
        public async Task CreateAsync(ChannelMeta entity, CancellationToken cancellation)
        {
            CMNextSiteAdapter cmSite = await site.GetAdapterAsync();

            await cmSite.BeginRequest(new CreateChannelRequest(entity))
                .ExecAsync(cancellation);
        }

        ///<inheritdoc/>
        public async Task<ChannelMeta?> GetAsync(string id, CancellationToken cancellation)
        {
            ChannelMeta[] all = await ListAsync(cancellation);
            return all.FirstOrDefault(c => c.Id == id);
        }

        ///<inheritdoc/>
        public async Task<ChannelMeta[]> ListAsync(CancellationToken cancellation)
        {
            CMNextSiteAdapter cmSite = await site.GetAdapterAsync();

            ChannelMeta[]? index = await cmSite
                .BeginRequest(new ListChannelRequest())
                .ExecAsync(cancellation)
                .AsJson<ChannelMeta[]>();

            return index ?? [];
        }

        ///<inheritdoc/>
        public async Task DeleteAsync(string id, CancellationToken cancellation)
        {
            CMNextSiteAdapter cmSite = await site.GetAdapterAsync();

            await cmSite.BeginRequest(new DeleteChannelRequest(id))
                .ExecAsync(cancellation);
        }

        ///<inheritdoc/>
        public async Task UpdateAsync(ChannelMeta entity, CancellationToken cancellation)
        {
            CMNextSiteAdapter cmSite = await site.GetAdapterAsync();

            await cmSite.BeginRequest(new SetChannelRequest(entity))
                .ExecAsync(cancellation);
        }

        private sealed class ChannelIndex : ICMNextIndex<ChannelMeta>
        {
            [JsonPropertyName("date")]
            public long Date { get; set; }

            [JsonPropertyName("records")]
            public ChannelMeta[] Records { get; set; } = [];

            [JsonPropertyName("version")]
            public string Version { get; set; } = "0.0.0";
        }
    }
}