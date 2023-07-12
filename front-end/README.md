# CMNext/front-end

Forked from [@vnuge/vn-acc-starter-project](https://github.com/VnUgE/vn-acc-starter-project)

A single page application front-end for managing content and publishing blog posts to your S3 storage across infinite channels. When served, gives you account access to administrate your blog publishing system.

## Getting Started

Basic repo setup and git information can be found in the [README.md](../README.md)

Setting up the front-end. This directory contains all the project code to build the admin portal for your blog. It is a vuejs, vite, tailwindcss project. It requires a few backend VNLib plugins which you can refer to the [README.md](../README.md) in the root directory for more information. A build produces a single page app and is output in the dist directory on a build.

### Project setup, install NPM dependencies

```shell
npm install
```

### Compiles and hot-reloads for development

```shell
npm run dev
```

### Build for production

```shell
npm run build
```

Finally, copy the output (dist) directory into the root of your webserver and configure routing according to the vue-router.

## Static front end hosting  

If you choose to host this front-end outside of the VNLib.Webserver backend, follow the instructions from the [vue-router documentation](https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations)

If you choose to host the static site outside of the server hosting the API, you will need to adjust the 'VITE*API*URL' in the .env file to point to the API server. This variable tells the front-end where to send API requests. You will need to configure your proxy server to route these requests to the API server at whatever routes you configured in your backend.

The backend plugin has a configuration file that allows you to adjust these api paths/routes. These endpoints must match the 'VITE*API*URL' set in your .env file.

## Third party library info  

This project injects a remote CDN script from [CKEditor](https://ckeditor.com/) (their superbuild package) to provide a robust rich text editing experience. It is quite a large package, but it is one of the best editors I have come across.

Markdown support is included with [Showdownjs](https://github.com/showdownjs/showdown) and bundled directly in the package because it is rather small compared.

The comprehensive JSON editor for feed fields is provided by [Vue-Json-Editor](https://github.com/cloydlau/json-editor-vue)

There are a number of other foss packages that make this project possible, so please check out the package file and consider supporting them.
