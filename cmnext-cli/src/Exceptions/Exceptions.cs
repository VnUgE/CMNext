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


namespace CMNext.Cli.Exceptions
{
    internal class CMNextException : Exception
    {
        public CMNextException(string message) : base(message) { }

        public CMNextException(string? message, Exception? innerException) : base(message, innerException)
        { }
    }

    internal class CMNextApiException : CMNextException
    {
        public CMNextApiException(string message) : base(message)
        { }

        public CMNextApiException(string? message, Exception? innerException) : base(message, innerException)
        { }
    }

    internal class CMNextPermissionException : CMNextApiException
    {
        public CMNextPermissionException(string message) : base(message)
        { }

        public CMNextPermissionException(string? message, Exception? innerException) : base(message, innerException)
        { }
    }

    internal sealed class EntityNotFoundException : CMNextApiException
    {
        public EntityNotFoundException(string message) : base(message)
        { }

        public EntityNotFoundException(string? message, Exception? innerException) : base(message, innerException)
        { }
    }
}