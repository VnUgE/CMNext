<h1 align="center">CMNext</h1> 

<p align="center">
A self-hosted, mulit-channel, content publishing platform (CMS) built with my [Essentials](https://github.com/VnUgE/VNLib.Core) framework, using your existing S3 or FTP storage.
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

## What's the TLDR?
CMNext is essentially a fancy admin web-ui, that turns your existing S3 or FTP static hosting service into a powerfull mutli-channel CMS, with Podcast 2.0 support. Your S3 or FTP becomes a headless/serverless CMS you can access your content from using web `fetch()` or the inlcuded JavaScript client library.  

## Features  
 - ✔Own your content and distribute it on your own equipment (or cloud)  
 - ✔Publish podcasts w/ pocast 2.0 enabled RSS feeds  
 - ✔Turn it on only when you need to edit your content  
 - ✔Uses your existing S3 or FTP static storage systems  
 - ✔Publish arbitrary content and reference it in posts  
 - ✔Configurable RSS feeds for all channels  
 - ✔Built in WYSWYG and markdown conversion for easy editing  
 - ✔Reference the entire system through static JSON files  
 - ✔No databases (for this plugin anyway)  
 - ✔Light or dark theme!  

## What won't it do for you?  
This tool does not (and will not)  
- ❌Serve your content  
- ❌Host your blog front-end  
- ❌Provide good SEO results by itself  
- ❌Configure/manage your public storage system (how the content is viewed)  

## How does it do it?  
When installed, you get self contained server application with a web-ui that you will use to create channels, publish posts, and add content. All of these actions are stored in json files within your S3 or FTP filesystem (or xml RSS feeds). These json files will be referenced by the client using fetch() or the included JavaScript client library to fetch your content and metadata. You can add custom xml elements to your feeds, per channel, and per post (as an item). There are also easy podcast integrations such as adding an enclosure file from existing content, and html content for the podcast description. [CKEdtior](https://github.com/ckeditor/ckeditor5) is the WYSWYG editor of choice for this project, and [showdownjs](https://github.com/showdownjs/showdown) for easy markdown-html conversions.  

## Why would I use it?  
Simple - you get a CMS on your own equipment, without the headache of running another production application and trusting its security. That doesn't mean I don't take security seriously, because I do, but pre-release apps vs. production apps are very different levels of security. Tech folks are (and should be) concerned with the security of a production application!

## How do I get started?  
Use this [documentation link](https://www.vaughnnugent.com/resources/software/articles?tags=_cmnext), or at the top of the readme, and follow the instructions for users, admins, and developers.

## Developers  
For now, feel free to clone this repo and respect the license please. The front-end is just a VueJs multi page app, with vue-router. The back end is a .NET class library designed for dynamic loading by a VNLib.Plugins.Essentials compatible runtime host. The back end will be much more complicated to provide docs on, so they may come later. The front-end is rather straightforward for node/vuejs web-devs. Further instructions will be in the readme files. 

### License  
The software in this repository is licensed under the GNU Affero General Public License (or any later version). See the LICENSE files for more information.  

### Contact  
Head over to my [website](https://www.vaughnnugent.com) for my contact info/community.  