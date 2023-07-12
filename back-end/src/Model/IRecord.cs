﻿/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: IRecord.cs 
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


namespace Content.Publishing.Blog.Admin.Model
{
    /// <summary>
    /// A simple record to store in a <see cref="IRecordDb{T}"/>
    /// </summary>
    internal interface IRecord
    {
        /// <summary>
        /// The record id
        /// </summary>
        string? Id { get; set; }

        /// <summary>
        /// The date the record was last modified
        /// </summary>
        long Date { get; set; }
    }
}
