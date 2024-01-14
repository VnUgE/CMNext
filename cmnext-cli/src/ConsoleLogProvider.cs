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
using VNLib.Utils.Logging;
using Typin.Console;

namespace CMNext.Cli
{
    public sealed class ConsoleLogProvider(IConsole console) : ILogProvider
    {
        private LogLevel _level = LogLevel.Information;

        ///<inheritdoc/>
        public void Flush() => console.Output.Flush();

        ///<inheritdoc/>
        public object GetLogProvider() => console.Output;

        ///<inheritdoc/>
        public bool IsEnabled(LogLevel level) => level >= _level;

     
        public void SetLogLevel(LogLevel level) => _level = level;
        public void SetVerbose(bool verbose) => SetLogLevel(verbose ? LogLevel.Verbose : LogLevel.Information);
        public void SetDebug(bool debug) => SetLogLevel(debug ? LogLevel.Debug : LogLevel.Information);

        ///<inheritdoc/>
        public void Write(LogLevel level, string value)
        {
            if (!IsEnabled(level)) return;

            console.Output.WriteLine("[{0}]: {1}", level, value);
        }

        ///<inheritdoc/>
        public void Write(LogLevel level, Exception exception, string value = "")
        {
            if (!IsEnabled(level)) return;

            console.Output.WriteLine("[{0}]: {1}", level, $"{value}\n{exception}");
        }

        ///<inheritdoc/>
        public void Write(LogLevel level, string value, params object?[] args)
        {
            if (!IsEnabled(level)) return;

            console.Output.WriteLine("[{0}]: {1}", level, string.Format(value, args));
        }

        ///<inheritdoc/>
        public void Write(LogLevel level, string value, params ValueType[] args)
        {
            if (!IsEnabled(level)) return;

            console.Output.WriteLine("[{0}]: {1}", level, string.Format(value, args));
        }
    }
}