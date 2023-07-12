/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: JsonRecordDb.cs 
*
* CMNext is free software: you can redistribute it and/or modify 
* it under the terms of the GNU Affero General Public License as 
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* CMNext is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program. If not, see https://www.gnu.org/licenses/.
*/

using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Collections.Generic;

using VNLib.Utils.IO;
using VNLib.Utils.Extensions;

namespace Content.Publishing.Blog.Admin.Model
{
    /// <summary>
    /// A json backed record database
    /// </summary>
    /// <typeparam name="T">The record type</typeparam>
    internal class JsonRecordDb<T> : IRecordDb<T> where T : IRecord
    {
        private static readonly Version CurrentVersion = new (0, 1, 0);


        private DateTimeOffset _lastModified;
        private Version? _version;

        /*
         * Records in the list are only ever read from, any changes are made by 
         * creating a new list and re-ordering it.
         * 
         * We dont need any synchronization in this case
         */
        private IReadOnlyList<T> _records;

        public JsonRecordDb()
        {
            _lastModified = DateTimeOffset.UnixEpoch;
            _records = new List<T>();
        }

        ///<inheritdoc/>
        public T? GetRecord(string id)
        {
            return _records.SingleOrDefault(r => r.Id!.Equals(id, StringComparison.OrdinalIgnoreCase));
        }

        ///<inheritdoc/>
        public IEnumerable<T> GetRecords()
        {
            return _records;
        }

        ///<inheritdoc/>
        public void RemoveRecord(string id)
        {
            _ = id ?? throw new ArgumentNullException(nameof(id));

            //Create new list without the record and re-order
            _records = _records.Where(r => !id.Equals(r.Id, StringComparison.OrdinalIgnoreCase))
                        .OrderByDescending(static r => r.Date)
                        .ToList();
        }

        ///<inheritdoc/>
        public void SetRecord(T record)
        {
            _ = record?.Id ?? throw new ArgumentNullException(nameof(record));

            //Remove record if it already exists
            RemoveRecord(record.Id);

            //Add the record and re-order
            _records = _records.Append(record)
                            .OrderByDescending(static r => r.Date)
                            .ToList();

            //Update last modified time
            _lastModified = DateTimeOffset.UtcNow;
        }

        ///<inheritdoc/>
        public void Load(Stream stream)
        {
            if (stream.Length == 0)
            {
                //Set defaults
                _lastModified = DateTimeOffset.UnixEpoch;
                _records = new List<T>();
            }
            else
            {
                //Read stream into a doc
                using JsonDocument doc = JsonDocument.Parse(stream);

                //Read the last modified time
                _lastModified = DateTimeOffset.FromUnixTimeSeconds(doc.RootElement.GetProperty("last_modified").GetInt64());

                //Try to read the version
                if (doc.RootElement.TryGetProperty("version", out JsonElement versionEl))
                {
                    _ = Version.TryParse(versionEl.GetString(), out _version);
                }

                if (doc.RootElement.TryGetProperty("records", out JsonElement el))
                {
                    //Read the records array
                    _records = el.Deserialize<List<T>>() ?? new List<T>();
                }
                else
                {
                    //Set defaults
                    _records = new List<T>();
                }
            }
        }

        ///<inheritdoc/>
        public void Store(Stream stream)
        {
            using Utf8JsonWriter writer = new(stream);
            writer.WriteStartObject();

            //Write last modified time
            writer.WriteNumber("last_modified", _lastModified.ToUnixTimeSeconds());

            //Set version if not already set
            _version ??= CurrentVersion;

            //Write version
            writer.WriteString("version", _version.ToString());

            //Write the records array
            writer.WritePropertyName("records");

            JsonSerializer.Serialize(writer, _records, VNLib.Plugins.Essentials.Statics.SR_OPTIONS);

            writer.WriteEndObject();
        }

        /// <summary>
        /// Create a new <see cref="JsonRecordDb{T}"/> of a given type
        /// </summary>
        /// <returns>The new record store</returns>
        public static JsonRecordDb<T> Create()
        {
            return new JsonRecordDb<T>();
        }
    }
}
