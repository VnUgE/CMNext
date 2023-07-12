/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: IRecordDb.cs 
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


using System.IO;
using System.Collections.Generic;

namespace Content.Publishing.Blog.Admin.Model
{
    /// <summary>
    /// Represents a simple primary-key record based database
    /// </summary>
    /// <typeparam name="T">The record type</typeparam>
    internal interface IRecordDb<T>
    {
        /// <summary>
        /// Sets a record in the database. Adds or overwrites the entire record if it already exists.
        /// </summary>
        /// <param name="record">The record to set</param>
        void SetRecord(T record);

        /// <summary>
        /// Removes a record from the database by its id
        /// </summary>
        /// <param name="id">The id of the record to delete</param>
        void RemoveRecord(string id);

        /// <summary>
        /// Gets a record from the database by its id
        /// </summary>
        /// <param name="id">The id of the item to get</param>
        /// <returns>The item if found, null otherwise</returns>
        T? GetRecord(string id);

        /// <summary>
        /// Gets all records in the database
        /// </summary>
        /// <returns>A enumeration of the current collection of records</returns>
        IEnumerable<T> GetRecords();

        /// <summary>
        /// Writes the entire state of the current store to the given stream
        /// </summary>
        /// <param name="stream">The stream to write the state data to</param>
        void Store(Stream stream);

        /// <summary>
        /// Loads the entire state of the store from the given stream
        /// </summary>
        /// <param name="stream">The stream to read the state from</param>
        void Load(Stream stream);
    }
}
