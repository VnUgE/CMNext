/*
* Copyright (c) 2023 Vaughn Nugent
* 
* Library: CMNext
* Package: Content.Publishing.Blog.Admin
* File: FeedGenerator.cs 
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
using System.Xml;
using System.Linq;
using System.Text;
using System.Collections.Generic;

using VNLib.Utils.IO;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

using Content.Publishing.Blog.Admin.Model;

namespace Content.Publishing.Blog.Admin
{
    [ConfigurationName("rss_feed", Required = false)]
    internal sealed class FeedGenerator : IRssFeedGenerator
    {
        const int defaultMaxItems = 20;
        const string ITUNES_XML_ATTR = "http://www.itunes.com/dtds/podcast-1.0.dtd";
        const string CONTENT_XML_ATTR = "http://purl.org/rss/1.0/modules/content/";
        const string PODCAST_INDEX_ATTR = "https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md";
        const string GENERATOR_NAME = "CMNext";

        public FeedGenerator(PluginBase pbase)
        { }

        public FeedGenerator(PluginBase pbase, IConfigScope config)
        { }

        public void BuildFeed(IChannelContext context, IEnumerable<PostMeta> posts, VnMemoryStream output)
        {
            _ = context.Feed ?? throw new ArgumentNullException(nameof(context.Feed));

            //Build the feed
            using XmlWriter writer = XmlWriter.Create(output, new XmlWriterSettings
            {
                Encoding = Encoding.UTF8,
                Indent = true,
                IndentChars = "  ",
                NewLineChars = "\n",
                NewLineHandling = NewLineHandling.Entitize,
                NewLineOnAttributes = false,
                CloseOutput = false,
                NamespaceHandling = NamespaceHandling.OmitDuplicates,
            });

            string currentTime = DateTime.UtcNow.ToString("R");

            //Write the feed
            writer.WriteStartDocument();
            writer.WriteStartElement("rss");
            writer.WriteAttributeString("version", "2.0");
            writer.WriteAttributeString("xmlns", "itunes", null, ITUNES_XML_ATTR);
            writer.WriteAttributeString("xmlns", "content", null, CONTENT_XML_ATTR);
            writer.WriteAttributeString("xmlns", "podcast", null, PODCAST_INDEX_ATTR);

            //Channel element
            writer.WriteStartElement("channel");

            writer.WriteElementString("title", context.BlogName);

            writer.WriteElementString("link", context.Feed.PublihUrl);

            //Description/summary
            writer.WriteElementString("description", context.Feed.Description);
            writer.WriteElementString("itunes", "summary", null, context.Feed.Description);

            writer.WriteElementString("itunes", "author", null, context.Feed.Author);

            //Itunes owner tag
            writer.WriteStartElement("itunes", "owner", null);
            writer.WriteElementString("itunes", "email", null, context.Feed.WebMaster);
            writer.WriteElementString("itunes", "name", null, context.Feed.Author);
            writer.WriteEndElement();

            //Write extended properties 
            if (context.Feed.ExtendedProperties != null)
            {
                foreach (ExtendedProperty prop in context.Feed.ExtendedProperties)
                {
                    PrintExtendedProps(prop, writer);
                }

                //Add generator tag if not set by user
                if(!context.Feed.ExtendedProperties.Any(static p => "generator".Equals(p.Name, StringComparison.OrdinalIgnoreCase)))
                {
                    writer.WriteElementString("generator", GENERATOR_NAME);
                }
            }

            //Author
            writer.WriteElementString("itunes", "author", null, context.Feed.Author);

            //Itunes image url
            if (context.Feed.ImageUrl != null)
            {
                WriteImageTag(writer, context.Feed.ImageUrl);
            }

            writer.WriteElementString("language", "en-us");

            writer.WriteElementString("pubDate", currentTime);
            writer.WriteElementString("lastBuildDate", currentTime);

            int maxItems = context.Feed.MaxItems ?? defaultMaxItems;
            //Take only the latest max items
            posts = posts.OrderByDescending(static p => p.Created).Take(maxItems);

            //Write the posts as items but sort in order of their pub date
            foreach (PostMeta post in posts)
            {
                writer.WriteStartElement("item");

                writer.WriteElementString("title", post.Title);
                writer.WriteElementString("itunes","title", null, post.Title);

                writer.WriteElementString("link", $"{context.Feed.PublihUrl}/{post.Id}");
               
                writer.WriteElementString("itunes", "author", null, post.Author);

                //Description is just the post summary
                writer.WriteElementString("itunes", "summary", null, post.Summary);

                //Allow an html description from the post meta itself
                if (post.HtmlDescription != null)
                {
                    writer.WriteStartElement("description");
                    writer.WriteCData(post.HtmlDescription);
                    writer.WriteEndElement();

                    //Add content encoded tag
                    writer.WriteStartElement("content", "encoded", null);
                    writer.WriteCData(post.HtmlDescription);
                    writer.WriteEndElement();
                }
                else
                {
                    writer.WriteElementString("description", post.Summary);
                }

                //Time as iso string from unix seconds timestamp
                string pubDate = DateTimeOffset.FromUnixTimeSeconds(post.Created).ToString("R");

                writer.WriteElementString("pubDate", pubDate);
                writer.WriteElementString("published", pubDate);

                if (post.Image != null)
                {
                    WriteImageTag(writer, post.Image);
                }

                //Add extended properties as itunes tags
                if (post.ExtendedProperties != null)
                {
                    //Recursivley add extended properties
                    foreach (ExtendedProperty prop in post.ExtendedProperties)
                    {
                        PrintExtendedProps(prop, writer);
                    }
                }

                //Set post id as the guid
                writer.WriteElementString("guid", post.Id);

                writer.WriteEndElement();
            }

            //End the feed
            writer.WriteEndElement();
            writer.WriteEndElement();
            writer.WriteEndDocument();
        }

        private static void PrintExtendedProps(ExtendedProperty? prop, XmlWriter writer)
        {
            if (prop?.Name == null)
            {
                return;
            }

            //Open the element
            writer.WriteStartElement(prop.NameSpace, prop.Name, null);

            //Write the attributes
            if (prop.Attributes != null)
            {
                foreach (KeyValuePair<string, string> attr in prop.Attributes)
                {
                    writer.WriteAttributeString(attr.Key, attr.Value);
                }
            }

            //nested child elements before closing
            if (prop.Children != null)
            {
                foreach (ExtendedProperty child in prop.Children)
                {
                    PrintExtendedProps(child, writer);
                }
            }
            else if(prop.Value != null && prop.Value.StartsWith("<![CDATA", StringComparison.OrdinalIgnoreCase))
            {
                writer.WriteCData(prop.Value);
            }
            else
            {
                //Write the value
                writer.WriteString(prop.Value);
            }
            
            //Close the element 
            writer.WriteEndElement();
        }

        private static void WriteImageTag(XmlWriter writer, string imageUrl)
        {
            writer.WriteStartElement("itunes", "image",null);
            writer.WriteAttributeString("href", imageUrl);
            writer.WriteEndElement();
        }
    }
}
