#Copyright (c) Vaughn Nugent
#Licensed under the GNU AGPL V3.0

#use plain ubuntu latest to build native libraries in
FROM ubuntu:25.10 AS native-cont

WORKDIR /build

#download and install task (its easier and faster without npm)
ADD --checksum=sha256:9ba2f9f5f11f8429f82cf4ceaa90e6187e02e5a0c161ba0975ba621942ce20bc \
  https://github.com/go-task/task/releases/download/v3.44.1/task_linux_amd64.deb \
  task_linux_amd64.deb

RUN dpkg -i task_linux_amd64.deb

#include local artifacts
COPY app/lib lib/
COPY app/Taskfile.yaml Taskfile.yaml

#installs required dependencies and builds the native libraries and creates self-signed certs
RUN task setup-apt 
RUN task container-create-cert

#APP CONTAINER
#move into a clean dotnet ubuntu lean image
FROM mcr.microsoft.com/dotnet/runtime:8.0.18-noble AS app-cont

LABEL name="vnuge/cmnext"
LABEL maintainer="Vaughn Nugent <vnpublic@proton.me>"
LABEL description="A dead-simple, multi-channel cms for your blog or podcast built for static storage like S3 or FTP"

#pull compiled libs from build container, they must be where the taskfile expects them
COPY --from=native-cont /build/lib/vnlib_rpmalloc.so /app/lib/vnlib_rpmalloc.so
COPY --from=native-cont /build/lib/vnlib_compress.so /app/lib/vnlib_compress.so
COPY --from=native-cont /build/lib/argon2.so /app/lib/argon2.so

#also copy the task deb from native build container and install it
COPY --from=native-cont /build/task_linux_amd64.deb /usr/local/bin/task.deb
RUN dpkg -i /usr/local/bin/task.deb && rm /usr/local/bin/task.deb

#add dumb-init deb from build container
ADD --checksum=sha256:9e842e2480e1dee9f0cd482701ba89ee85b3d9c2ca249d38b6c0f49733b12f16  \
  https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_amd64.deb  \
  /usr/local/bin/dumb-init.deb
RUN dpkg -i /usr/local/bin/dumb-init.deb && rm /usr/local/bin/dumb-init.deb

#copy self signed ssl certs for first startup
COPY --from=native-cont /build/ssl /app/ssl

#copy local artifacts again in run container
COPY app/ /app

#workdir 
WORKDIR /app

#default to 8080 for TLS on TCP
EXPOSE 8080/tcp
ENV HTTP_BIND_PORT=8080

VOLUME  [ "/app/data", "/app/usr/assets" ]

#SQL Config
ENV SQL_LIB_PATH=VNLib.Plugins.Extensions.Sql.SQLite.dll \
  SQL_CONNECTION_STRING="Data Source=data/cmnext.db;" \
  CACHE_ASM_PATH=VNLib.Data.Caching.Providers.VNCache.dll \
  COMPRESSOR_ASM_PATH=lib/vnlib.net.compression/VNLib.Net.Compression.dll

#run permissions setup 
RUN task container-set-perms

#run the init script within dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["task", "container-run", "--", "--input-off"]

