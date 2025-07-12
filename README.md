## 介绍

一个管理地图瓦片数据的工具应用

功能:

- [x] 批量上传瓦片
- [x] 批量删除瓦片
- [x] 覆盖已上传瓦片
- [x] 上传进度展示
- [x] 单个瓦片预览
- [x] 地图预览
- [ ] 地图道路层展示

## 架构

- Next.js
- PostgreSQL
- MinIO
- Prisma
- Maptalks
- Ant Design

## 快速上手

初始化后端环境 (推荐安装 [OrbStack](https://orbstack.dev/) ):

```sh
docker compose up -d
```

运行命令后会运行以下容器:

### db

PostgreSQL 数据库服务, 通过 Prisma 连接并操作数据库 

连接需要[地址](https://www.prisma.io/docs/orm/overview/databases/postgresql#connection-url), 格式如下:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

分为以下几个部分:

- `postgresql://`: 连接协议, 固定不变
- `USER`: 用户名, 可在 `docker-compose.yaml` 中通过 `POSTGRES_USER` 环境变量定义, 默认是 `postgres`, 具体配置参考 [docker hub](https://hub.docker.com/_/postgres)
- `PASSWORD`: 密码, 同 `USER`, 可通过 `POSTGRES_PASSWORD` 环境变量定义, 这是必须手动配置的, 具体配置参考 [docker hub](https://hub.docker.com/_/postgres)
- `HOST`: 运行服务的地址, 比如 `localhost`、IP 地址、域名
- `PORT`: 运行服务的端口, 默认是 [5432](https://www.postgresql.org/docs/17/runtime-config-connection.html#GUC-PORT)
- `DATABASE`: 数据库名, 因为 PostgreSQL 支持管理多个数据库, 不指定 `POSTGRES_DB` 环境变量的情况下, 默认使用 `POSTGRES_USER` 环境变量的值, 具体配置参考 [docker hub](https://hub.docker.com/_/postgres)

本项目不做任何配置改动的情况下, 你会得到以下地址:

```
postgresql://postgres:postgres@localhost:5432/postgres
```

如 `.env` 文件中 `DATABASE_URL` 所示, 会被 `schema.prisma` 读取, [参考](https://www.prisma.io/docs/orm/reference/connection-urls#env)

### db-adminer

可操作数据库的后台管理 UI 界面

通过 http://localhost:8080 访问

配置参考 [docker hub](https://hub.docker.com/_/adminer)