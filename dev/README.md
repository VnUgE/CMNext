# CMNext Development Setup

Instructions for configuring the CMNext development environment for contributors.

CMNext uses [mise](https://mise.jdx.dev/) to establish cross-platform development environments for development and CI use cases.

## Moving Parts

CMNext uses vnlib as its backend framework. VNLib is a polyglot application relying mostly on C and C# (.NET 8.0) programming languages. Its designed to be mostly portable with optimizations primarily for x86-64 systems. The CMNext frontend uses Vue.js on the Node.js runtime.

### Build Tools

Mise handles the installation of all of these tools, including required system packages (bootstrapping).

| Tool                         | Purpose                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| curl                         | Required for bootstrapping and vnbuild dependency installs                                         |
| vnbuild                      | In-house build orchestration tool and dependency installer                                         |
| [task](https://taskfile.dev) | High-level script runner, alternative to gnu make, for cross-platform scripting and reusable tasks |
| cmake                        | Required for building vnlib native C libraries                                                     |
| gcc/clang/msvc               | Native compiler (platform dependent)                                                               |
| .NET 8.0 SDK                 | For building the CMNext backend plugin(s) for vnlib                                                |
| nodejs                       | For the frontend libraries and web interface                                                       |

### Runtime Services

| Service         | Purpose                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| process-compose | Development server management (similar to docker-compose but for bare metal) |
| MinIO           | Development content storage                                                  |

## Guide

A `mise` shell script is included in this directory that will automatically download and install mise from their CDN servers. The script verifies checksums for the executables — feel free to inspect the `mise` script before running it.

Directly after cloning and cd'ing into this directory, you can simply use the `mise` script, and it will take care of itself.

> [NOTE]
> You might need to use `chmod +x ./mise` before using it

```shell
dev $> ./mise
```

### Bootstrapping

Mise has a helpful feature called bootstrapping that allows us to install any system-level dependencies such as gcc, build-essentials, etc. This step is optional if you are already comfortable using mise and have the native dependencies installed.

> [NOTE]
> Curl or wget must be installed on your machine prior to running the local mise script. It's used to download the mise executable for your platform.

**You might need to enable experimental mode before using bootstrapping, it's technically still an experimental feature.**

```shell
./mise settings experimental=true
```

**Bootstrap**

```shell
./mise bootstrap
```

The full installation should have been kicked off and dependencies will be downloaded and installed locally.

#### Install (skip if using bootstrapping)

As mentioned above, if you wish to use a standard installation without experimental bootstrapping, you can just use:

```shell
./mise install
```

Which should download and install the required dependencies and fire off postinstall tasks.

> [NOTE]
> As mentioned above, you might need to install some system-level dependencies like build-essential, gcc, and ICU libs (libicu).

#### Automatic Post-Install Scripts

A postinstall task is used to execute vnbuild which downloads all of the backend-server dependencies: native library source code, shared libraries, webserver, plugins, and dynamic assets. If you have postinstall scripts disabled, parts of the installation will fail. You can manually run the installation directly using the task if you wish.

> [WARNING]
> If you allow postinstall scripts, you should not need to run this manually. It's already done.

```shell
./mise exec -- task mise-postinstall
```

### Setup (one-time)

There are some one-time setup tasks required before you can start developing that are useful to run manually (not in post-install). This will shuffle some files to the correct places and build the native libraries for use.

```shell
./mise setup
```

### Development Server

Start the development environment with hot-reloading enabled across frontend and backend components. MinIO, VNLib WebServer, and the Node.js (Vite dev) servers will be initialized and spawned. A startup task will run before all servers start to prime the backend plugin and frontend libraries before initial startup.

> [WARNING]
> If the CMNext plugin fails to build during startup, the VNLib.WebServer will not load or register the plugin for hot-reload. The startup task should fail in this condition, but it's important to understand vnlib basics.

```shell
./mise dev
```

### Done?

You can hit `ctrl + c` at any time to stop the servers.

### Debugging the Backend

If you want to debug the VNLib.WebServer backend, you can use a mise task to start a standalone backend instance in the mise environment so you can interact with the server's REPL interface on your terminal.

```shell
./mise dev-debug-server
```

You can type `stop` or press `ctrl + c` to stop the server process when you're done.

### Development Credentials

| Service         | Username                | Password  |
| --------------- | ----------------------- | --------- |
| CMNext (SQLite) | cmnext@vaughnnugent.com | Test123!  |
| MinIO           | cmnextdev               | cmnextdev |

## FAQ

#### SQLite errors on shutdown?

This bug is patched in vnlib v0.2.0 which is currently not released. It should not harm your development environment. Remember you can (and should regularly) reset the database back to the committed version using `git restore cmnext-debug.db`.
