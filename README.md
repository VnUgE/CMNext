<h1 align="center">CMNext</h1> 

<p align="center">
A modern, dead simple, mulit-channel, content publishing platform (CMS) built with the VNLib.Plugins.Essentials framework, using S3 or FTP storage.
</p>

<h4 align="center">
  <a href="https://www.vaughnnugent.com/resources/software/modules/CMNext">Builds</a> |
  <a href="https://www.vaughnnugent.com/resources/software">My Software</a> |
  <a href="https://www.vaughnnugent.com/resources/software/articles?tags=_cmnext">Documentation</a>
</h4>

<h4 align="center">
  <a href="https://github.com/VnUgE/CMNext/blob/master/LICENSE.txt">
    <img src="https://img.shields.io/badge/license-AGPL3-green.svg" alt="CMNext is licensed to you with the GNU GPL Affero V3" />
  </a>
  <a href="https://github.com/VnUgE/CMNext/tags">
    <img src="https://img.shields.io/github/v/tag/vnuge/cmnext" alt="Latest version"/>
  </a>
  <a href="https://github.com/VnUgE/CMNext/tags">
    <img src="https://img.shields.io/github/last-commit/vnuge/cmnext/master" alt="Latest commit"/>
  </a>
</h4>

<img src="https://www.vaughnnugent.com/public/resources/downloads/cms/c/hsknruyxlu6wpxq7q5hjbyv72y.png" width="100%">

## Features  
 - ✔Own your content and distribute it on your own equipment (or cloud)
 - ✔Uses your existing S3 or FTP static storage systems
 - ✔Publish arbitrary content and reference it in posts
 - ✔Publish podcasts (w/ Apple and Spotify support) w/ pocast 2.0 RSS feeds
 - ✔Reference the entire system through static JSON files
 - ✔No databases (for this plugin anyway)  
 - ✔Light or dark theme!

TLDR, you can create your own file based, content publishing platform that has built in editing tools, blog post management, arbitrary content publishing to "unlimited" channels, with RSS and Apple/Spotify support for your podcast 2.0. Its essentially a fancy, self-hosted file based CMS with an admin UI.  

## What won't it do for you?  
This tool does not (and will not)  
- ❌Serve your content
- ❌Host your blog front-end
- ❌Provide good SEO results by itself
- ❌Configure/manage your public storage system (how the content is viewed)

## How does it do it?  
The user-interface interacts with the back-end plugin to store your entire blog's configuration in your storage system (S3 and FTP) in JSON files. These JSON files exist so you can access them from your blog front-end using web `fetch()`. This gives you so much freedom to develop without needing worry about hosting a new service/api since you are just accessing static files. This means you get all the performance and security benefits of static file hosting!

## Why would I use it?  
Simple - you get a CMS on your own equipment, without the headache of running another production application and trusting its security. That doesn't mean I don't take security seriously, because I do, but pre-release apps vs. production apps are very different levels of security. and tech folks are (and should be) concerned with the security of a production application!

## How do I get started?  
Use this [documentation link](https://www.vaughnnugent.com/resources/software/articles?tags=_cmnext), or at the top of the readme, and follow the instructions for users, admins, and developers.

## Developers  
For now, feel free to clone this repo and respect the license please. The front-end is just a VueJs multi page app, with vue-router. The back end is a .NET class library designed for dynamic loading by a VNLib.Plugins.Essentials compatible runtime host. The back end will be much more complicated to provide docs on, so they may come later. The front-end is rather straightforward for node/vuejs web-devs. Further instructions will be in the readme files. 

### License  
The software in this repository is licensed under the GNU Affero General Public License (or any later version). See the LICENSE files for more information.

### Contact  
Head over to my [website](https://www.vaughnnugent.com) for my contact info/community.