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

using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

using CMNext.Cli.Site;
using CMNext.Cli.Storage;

namespace CMNext.Cli.Settings
{
    public sealed class AppConfig : IStorable
    {
        [JsonPropertyName("url")]
        public string BaseAddress { get; set; } = string.Empty;

        [JsonPropertyName("endpoints")]
        public CMNextEndpointMap Endpoints { get; set; } = new();

        [JsonPropertyName("auth")]
        public string VauthCommands { get; set; } = "vauth --silent";

        bool IStorable.Load(Stream data)
        {
            if (data.Length == 0)
            {
                return false;
            }

            AppConfig config = JsonSerializer.Deserialize<AppConfig>(data) ?? new();
            
            //Set values
            Endpoints = config.Endpoints;
            BaseAddress = config.BaseAddress;
            return true;
        }

        void IStorable.Save(Stream data)
        {
            //Write the instance to the stream
            JsonSerializer.Serialize(data, this);
        }
    }

    public sealed class CMNextEndpointMap : ICMNextEndpointMap
    {
        [JsonPropertyName("channels")]
        public string ChannelPath { get; set; } = "/blog/channels";

        [JsonPropertyName("posts")]
        public string PostPath { get; set; } = "/blog/posts";

        [JsonPropertyName("content")]
        public string ContentPath { get; set; } = "/blog/content";

        [JsonPropertyName("login")]
        public string LoginPath { get; set; } = "/account/pki";

        [JsonPropertyName("logout")]
        public string LogoutPath { get; set; } = "/account/logout";
    }
}