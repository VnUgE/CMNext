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

using System;
using System.Net;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Serialization;
using VNLib.Net.Rest.Client;
using VNLib.Net.Rest.Client.Construction;

using FluentValidation;
using FluentValidation.Results;

using CMNext.Cli.Exceptions;
using CMNext.Cli.Settings;

namespace CMNext.Cli.Site
{
    public sealed class CMNextSiteAdapter : RestSiteAdapterBase
    {
        protected override RestClientPool Pool { get; }

        public CMNextSiteAdapter(AppConfig config)
        {
            Uri baseUri = new(config.BaseAddress);

            RestClientOptions options = new(baseUri)
            {
                RemoteCertificateValidationCallback = (_, _, _, err) => true,
                AutomaticDecompression = DecompressionMethods.All,
                Encoding = System.Text.Encoding.UTF8,
                ThrowOnAnyError = false,
                ThrowOnDeserializationError = true,
                FollowRedirects = false,
                UserAgent = "vnuge/cmnext-cli",
            };

            Pool = new RestClientPool(2, options);
        }

        ///<inheritdoc/>
        public override Task WaitAsync(CancellationToken cancellation = default) => Task.CompletedTask;

        ///<inheritdoc/>
        public override void OnResponse(RestResponse response)
        {
            //always see if a json web-message error was returned
            ParseErrorAndThrow(response);

            switch (response.StatusCode)
            {
                case HttpStatusCode.InternalServerError:
                    throw new CMNextApiException("The server encountered an internal error");
                case HttpStatusCode.NotFound:
                    throw new EntityNotFoundException("The requested entity was not found");
                case HttpStatusCode.Forbidden:
                    throw new CMNextPermissionException("You do not have the required permissions to perform this action. Access Denied");
                case HttpStatusCode.Unauthorized:
                    throw new CMNextPermissionException("Your credentials are invalid or expired. Access Denied");
                case HttpStatusCode.Conflict:
                    throw new CMNextApiException("The requested action could not be completed due to a conflict");
                default:
                    response.ThrowIfError();
                    break;
            }
        }

        private static void ParseErrorAndThrow(RestResponse response)
        {
            if (response.RawBytes == null || response.ContentType != "application/json")
            {
                return;
            }

            using JsonDocument doc = JsonDocument.Parse(response.RawBytes);

            //Webmessage must be an object
            if(doc.RootElement.ValueKind != JsonValueKind.Object)
            {
                return;
            }

            //Check for validation errors and raise them
            if(doc.RootElement.TryGetProperty("errors", out JsonElement errors))
            {
                //Desserilize the errors into a validation failure
                ValidationFailure[] err = errors.EnumerateArray()
                    .Select(e => e.Deserialize<ServerValidationJson>()!)
                    .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                    .ToArray();

                //Raise a fluent validation exception from the server results
                throw new ValidationException(err);
            }

            //Get result now, we don't know it's type yet
            _ = doc.RootElement.TryGetProperty("result", out JsonElement result);

            if (doc.RootElement.TryGetProperty("success", out JsonElement success))
            {
                //If the request was not successful, throw an exception, a result will be a string
                if (!success.GetBoolean())
                { 
                    throw new CMNextException(result.GetString()!);
                }
            }
        }

        internal record ServerValidationJson(
            [property: JsonPropertyName("property")] string? PropertyName, 
            [property: JsonPropertyName("message")] string? ErrorMessage
        );
    }
}