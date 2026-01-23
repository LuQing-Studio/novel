# 部署到自建服务器 (Docker Compose)

本项目包含 3 个服务：

- `web`: Next.js 应用 (3000)
- `db`: PostgreSQL + pgvector
- `lightrag`: LightRAG 服务 (内部端口 9621，仅 `web` 访问)

## 0. 服务器准备

推荐 Ubuntu 22.04/24.04。

安装 Docker + Compose（官方脚本或发行版包均可），确保能运行：

```bash
docker --version
docker compose version
```

## 1. 在服务器拉取代码

```bash
git clone <your-repo-url> novel
cd novel
```

## 2. 配置环境变量

### 2.1 Next.js 应用配置

复制根目录示例：

```bash
cp .env.example .env
```

编辑 `.env`，至少填好：

- `AI_API_KEY`
- `LIGHTRAG_API_KEY`（需要与 LightRAG 的 `LIGHTRAG_API_KEY` 保持一致）

可选：

- `AI_PROVIDER` / `AI_MODEL` / `AI_BASE_URL`
- `NEXT_PUBLIC_BASE_URL`（有域名时填 `https://your-domain.com`）

### 2.2 LightRAG 配置

```bash
cp lightrag/.env.example lightrag/.env
```

编辑 `lightrag/.env`，至少填好：

- `LLM_*` / `EMBEDDING_*`（按你的供应商配置）
- `LIGHTRAG_API_KEY`（与根目录 `.env` 一致）

> `POSTGRES_*`/`HOST`/`PORT` 在 `docker-compose.yml` 中会覆盖为容器网络配置，无需改动。

## 3. 启动服务

```bash
docker compose up -d --build
```

## 3.1 修改对外端口（可选）

如果服务器的 `3000` 已被占用，可以在根目录 `.env` 里新增：

```env
WEB_PORT=3001
```

然后重启：

```bash
docker compose up -d
```

此时访问：`http://<server-ip>:3001`

查看状态：

```bash
docker compose ps
docker compose logs -f --tail=200
```

## 4. 验证

### 4.1 Web

浏览器访问：`http://<server-ip>:3000`

### 4.2 数据库

```bash
curl -fsS http://localhost:3000/api/db/test
```

### 4.3 LightRAG（通过 Next.js 代理）

```bash
curl -fsS http://localhost:3000/api/lightrag/health
curl -fsS http://localhost:3000/api/lightrag/documents
```

## 5. 上域名 + HTTPS（推荐）

建议用 Nginx/Caddy 反向代理到 `127.0.0.1:3000`，并用 Let’s Encrypt 配置证书。

## 6. 更新版本（手动）

```bash
git pull
docker compose up -d --build
```

## 7. 下一步：CI/CD

后续可以用 GitHub Actions：

- `push` 到 `main` 后构建镜像并推送到 GHCR
- 通过 SSH 到服务器执行 `docker compose pull && docker compose up -d`
