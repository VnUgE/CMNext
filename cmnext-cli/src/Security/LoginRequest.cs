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


using System.Text.Json.Serialization;

namespace CMNext.Cli.Security
{
    sealed record class LoginRequest(string Login, ISecurityCredential Cred)
    {
        [JsonPropertyName("login")]
        public string Login { get; set; } = Login;

        [JsonPropertyName("clientid")]
        public string CliendId { get; set; } = Cred.ClientId;

        [JsonPropertyName("pubkey")]
        public string PublicKey { get; set; } = Cred.PublicKey;
    }
}