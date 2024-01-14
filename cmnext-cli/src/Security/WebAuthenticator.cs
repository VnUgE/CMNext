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


using System;
using System.IO;
using System.Net;
using System.Linq;
using System.Text.Json;
using System.Security.Cryptography;
using System.Security.Authentication;

using RestSharp;

using FluentValidation;
using VNLib.Utils;
using VNLib.Utils.Memory;
using VNLib.Utils.Extensions;
using VNLib.Plugins;
using VNLib.Hashing;
using VNLib.Hashing.IdentityUtility;
using VNLib.Net.Rest.Client.Construction;

using CMNext.Cli.Storage;

namespace CMNext.Cli.Security
{
    internal sealed class WebAuthenticator(Uri SiteBaseAddress) :
        VnDisposeable,
        IAuthAdapter,
        IWebAuthenticator,
        IStorable
    {
        const string OtpHeaderName = "X-Web-Token";
        const string StatusCookieName = "li";

        public CookieContainer Cookies { get; } = new();

        private LoginSession _session;


        /// <summary>
        /// Determines whether the current session has a valid login
        /// or needs to re-authenticate
        /// </summary>
        /// <returns></returns>
        public bool HasValidLogin()
        {
            //Find the status cookie and see if its still valid
            Cookie? statusCookie = Cookies.GetAllCookies()
                        .Where(c => !c.Expired)
                        .Where(c => c.Name == StatusCookieName)
                        .FirstOrDefault();

            //Only if we have session data an a valid status cookie
            return _session.Initialized && statusCookie != null;
        }

        ///<inheritdoc/>
        protected override void Free()
        {
            _session.Destroy();
        }

        ///<inheritdoc/>
        public void SetModifiersForEndpoint<T>(IRestRequestBuilder<T> builder)
        {
            //Set cookies for the request
            builder.WithModifier((_, req) => req.CookieContainer = Cookies);

            //Also add the auth token
            builder.WithModifier((_, req) => req.AddHeader(OtpHeaderName, ComputeOtp(req)));

            //Set origin header to be safe
            builder.WithHeader("Origin", SiteBaseAddress.GetLeftPart(UriPartial.Authority));
        }

        public void Destroy()
        {
            //Expire all cookies
            Cookies.GetAllCookies().TryForeach(static c => c.Expired = true);
            _session.Destroy();
        }

        private string ComputeOtp(RestRequest request)
        {
            if (!_session.Initialized)
            {
                return string.Empty;
            }

            //Get the origin and path from the server uri
            string nonce = RandomHash.GetRandomBase32(16);

            using JsonWebToken jwt = new();

            jwt.InitPayloadClaim(4)
                .AddClaim("nonce", nonce)
                .AddClaim("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds())
                .AddClaim("aud", SiteBaseAddress.GetLeftPart(UriPartial.Authority))
                .AddClaim("path", request.Resource)
                .CommitClaims();

            //Sign the jwt with the session data
            _session.ComputeSignature(jwt);
            return jwt.Compile();
        }

        ///<inheritdoc/>
        public ISecurityCredential PrepareLogin() => Credential.Create();

        ///<inheritdoc/>
        public void FinalizeLogin(ISecurityCredential credential, WebMessage message)
        {
            if (credential is not Credential cred)
            {
                throw new ArgumentException("The provided credential is not a valid credential", nameof(credential));
            }

            //Create a new login session from the credential and store it
            _session = LoginSession.FromCredential(cred, message);
        }

        ///<inheritdoc/>
        public void Save(Stream stream)
        {
            using Utf8JsonWriter writer = new(stream);

            writer.WriteStartObject();

            //Write cookies to stream
            {
                writer.WriteStartArray("cookies");

                foreach (Cookie c in Cookies.GetAllCookies().Where(c => !c.Expired))
                {
                    writer.WriteStartObject();

                    writer.WriteString("name", c.Name);
                    writer.WriteString("value", c.Value);
                    writer.WriteString("domain", c.Domain);
                    writer.WriteString("path", c.Path);
                    writer.WriteBoolean("http_only", c.HttpOnly);
                    writer.WriteBoolean("secure", c.Secure);
                    writer.WriteNumber("expires", new DateTimeOffset(c.Expires).ToUnixTimeMilliseconds());

                    writer.WriteEndObject();
                }

                writer.WriteEndArray();
            }

            //Write secret data
            _session.Save(writer);

            writer.WriteEndObject();
            writer.Flush();
        }

        ///<inheritdoc/>
        public bool Load(Stream stream)
        {
            if (stream.Length == 0)
            {
                return false;
            }

            using JsonDocument doc = JsonDocument.Parse(stream);

            //Get cookies element
            Cookie[] cookies = doc.RootElement.GetProperty("cookies")
                .EnumerateArray()
                .Select(c => new Cookie
                {
                    Name = c.GetPropString("name")!,
                    Value = c.GetPropString("value"),
                    Domain = c.GetPropString("domain"),
                    Path = c.GetPropString("path"),
                    HttpOnly = c.GetProperty("http_only").GetBoolean(),
                    Secure = c.GetProperty("secure").GetBoolean(),
                })
                .ToArray();

            //Add cookies back to the collection
            Array.ForEach(cookies, Cookies.Add);

            //recover session data
            _session = LoginSession.Load(doc.RootElement);
            return _session.Initialized;
        }

        private sealed class Credential : ISecurityCredential
        {
            private readonly RSA _alg;

            private Credential(RSA alg) => _alg = alg;

            ///<inheritdoc/>
            public string PublicKey { get; set; } = string.Empty;

            ///<inheritdoc/>
            public string ClientId { get; set; } = string.Empty;

            public static Credential Create()
            {
                //Init a fresh credential
                RSA rsa = RSA.Create();
                byte[] publicKey = rsa.ExportSubjectPublicKeyInfo();

                return new(rsa)
                {
                    ClientId = RandomHash.GetRandomHex(16),
                    PublicKey = Convert.ToBase64String(publicKey)
                };
            }

            public byte[] ExporPrivateKeyAndErase()
            {
                byte[] key = _alg.ExportRSAPrivateKey();
                _alg.Dispose();
                return key;
            }

            public byte[] DecryptSharedKey(WebMessage response)
            {
                //Alloc temp buffer for decoding
                using UnsafeMemoryHandle<byte> buffer = MemoryUtil.UnsafeAllocNearestPage(4000, true);
                using UnsafeMemoryHandle<byte> decryptBuffer = MemoryUtil.UnsafeAllocNearestPage(4000, true);

                //recover base64 encoded shared key
                ERRNO read = VnEncoding.TryFromBase64Chars(response.Token, buffer.Span);

                if (read < 1)
                {
                    throw new AuthenticationException("Failed to decode server's shared data");
                }

                if (!_alg.TryDecrypt(buffer.AsSpan(0, read), decryptBuffer.Span, RSAEncryptionPadding.OaepSHA256, out int written))
                {
                    throw new AuthenticationException("Failed to decrypt the server's shared data");
                }

                //Return the decrypted data
                return decryptBuffer.AsSpan(0, written).ToArray();
            }
        }


        private readonly struct LoginSession
        {
            const string SecretsKey = "secrets";

            /// <summary>
            /// Gets whether the login session has been initialized
            /// </summary>
            public readonly bool Initialized => _privateLKey != null;

            private readonly byte[] _privateLKey;
            private readonly byte[] _sharedKey;

            private LoginSession(byte[] privateLKey, byte[] sharedKey)
            {
                _privateLKey = privateLKey;
                _sharedKey = sharedKey;
            }

            /// <summary>
            /// Writes the login session to the provided json writer
            /// </summary>
            /// <param name="writer"></param>
            /// <exception cref="InvalidOperationException"></exception>
            public readonly void Save(Utf8JsonWriter writer)
            {
                if (!Initialized)
                {
                    return;
                }

                //Create a secrets element and write the keys to it
                writer.WriteStartObject(SecretsKey);
                writer.WriteBase64String("private_key", _privateLKey);
                writer.WriteBase64String("shared_key", _sharedKey);
                writer.WriteEndObject();
            }

            /// <summary>
            /// Destroys any secret data
            /// </summary>
            public readonly void Destroy()
            {
                //Clean up keys
                if (Initialized)
                {
                    MemoryUtil.InitializeBlock(_privateLKey);
                    MemoryUtil.InitializeBlock(_sharedKey);
                }
            }


            /*
             * This function will be used to sign on-time passwords
             * that are sent in the header fields for authentication
             * by the Essentials.Accounts plugin.
             */

            ///<inheritdoc/>
            public readonly void ComputeSignature(JsonWebToken jwt)
            {
                if (!Initialized)
                {
                    throw new InvalidOperationException("Cannot compute signature from an uninitialized login session");
                }


                /*
                 * This much match the server's implementation. Currently configured 
                 * for HMAC-SHA256.
                 */
                jwt.Sign(_sharedKey, HashAlg.SHA256);
            }

            /// <summary>
            /// Gets a SPKI encoded public key from the stored private key which matches the 
            /// server format
            /// </summary>
            /// <returns>The base64 encoded public key string</returns>
            /// <exception cref="InvalidOperationException"></exception>
            public readonly AsymmetricAlgorithm GetAlgorithm()
            {
                if (!Initialized)
                {
                    throw new InvalidOperationException("Cannot get public key from an uninitialized login session");
                }

                //Create RSA and import the stored private key
                RSA rsa = RSA.Create();
                rsa.ImportRSAPrivateKey(_privateLKey, out _);
                return rsa;
            }

            /// <summary>
            /// Loads the secret session data from the provided json element
            /// </summary>
            /// <param name="data">The previously stored json data object that contains the secrets element</param>
            /// <returns>The recovered <see cref="LoginSession"/></returns>
            public static LoginSession Load(JsonElement data)
            {
                //Get secrets element
                if(!data.TryGetProperty(SecretsKey, out JsonElement secretsEl))
                {
                    return default;
                }

                //Recover keys from element
                byte[] privateKey = secretsEl.GetProperty("private_key").GetBytesFromBase64();
                byte[] sharedKey = secretsEl.GetProperty("shared_key").GetBytesFromBase64();
                return new LoginSession(privateKey, sharedKey);
            }

            /// <summary>
            /// Creates a new login session from the provided credential server 
            /// response web message
            /// </summary>
            /// <param name="credential">The existing credential that initiated the login</param>
            /// <param name="webm">The webmessage server response</param>
            /// <returns>The new <see cref="LoginSession"/> structure containing secret data</returns>
            public static LoginSession FromCredential(Credential credential, WebMessage webm)
            {
                //Recover the shared key and private key from the credential
                byte[] sharedKey = credential.DecryptSharedKey(webm);
                byte[] privKey = credential.ExporPrivateKeyAndErase();

                //Init new session from keys
                return new LoginSession(privKey, sharedKey);
            }
        }
    }
}