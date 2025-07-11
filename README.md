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

初始化后端环境:

```sh
docker compose up -d
```

运行命令后会运行以下容器:

- db: PostgreSQL 数据库, 端口 `5432` ,
- db-adminer: 管理数据库的客户端界面, 通过 http://localhost:8080 访问
