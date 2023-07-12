# CM*Next*

*A modern, dead simple, mulit-channel, content publishing platform (CMS) built with the VNLib.Plugins.Essentials framework, using S3 or FTP storage.*

### Features  
 - ✔Own your content and distribute it on your own equipment (or cloud)
 - ✔Uses your existing S3 or FTP static storage systems
 - ✔Publish arbitrary content and reference it in posts
 - ✔Publish podcasts (w/ Apple and Spotify Support) w/ using rss feeds
 - ✔Reference the entire system through static JSON files
 - ✔No databases (for this plugin anyway)  

TLDR, you can create your own file based, content publishing platform that has built in editing tools, blog post management, arbitrary content publishing to "unlimited" channels, with RSS and Apple/Spotify support for your podcast 2.0. Its essentially a fancy, self-hosted file based CMS with an admin ui.  

## What won't it do for you?  
This tool does not (and will not)  
- ❌Serve your content
- ❌Host your blog front-end
- ❌Provide good SEO results (or any at all) :(
- ❌Configure/manage your public storage system (how the content is viewed)

## How does it do it?  
The user-interface interacts with the back-end plugin to store your entire blog's configuration in your storage system (S3 and FTP) in JSON files. These JSON files exist so you can access them from your blog front-end using web `fetch()`. This gives you so much freedom to develop without needing worry about hosting a new service/api since you are just accessing static files. This means you get all the performance and security benefits of static file hosting!

## Why would I use it?  
Simple - you get a CMS on your own equipment, without the headache of running another production application and trusting its security. That doesn't mean I don't take security seriously, because I do, but pre-release apps vs. production apps are very different levels of security. and tech folks are (and should be) concerned with the security of a production application!

## How do I get started?  
Head over to my website to check our the documentation and setup guides for development and management. Fun fact, the documentation is hosted on the platform itself!  

[Docs and articles](https://www.vaughnnugent.com/resources/software/articles?tags=_Content.Publishing.Blog)

## Developers  
For now, feel free to clone this repo and respect the license please. The front-end is just a VueJs multi page app, with vue-router. The back end is a .NET class library designed for dynamic loading by a VNLib.Plugins.Essentials compatible runtime host. The back end will be much more complicated to provide docs on, so they may come later. The front-end is rather straightforward for node/vuejs web-devs. Further instructions will be in the readme files. 

### License  
The software in this repository is licensed under the GNU Affero General Public License (or any later version). See the LICENSE files for more information.

### Contact  
Head over to my [website](https://www.vaughnnugent.com) for my contact info/community.