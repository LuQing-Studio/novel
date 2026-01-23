# LightRAG 集成指南

## 概述

本项目使用 LightRAG 作为统一的 RAG (Retrieval-Augmented Generation) 解决方案,结合了向量检索和知识图谱的优势。

## 架构

```
Next.js App (前端)
    ↓ HTTP
Next.js API Routes (/api/lightrag/*)
    ↓ HTTP
LightRAG Python 服务 (localhost:9621)
    ↓
PostgreSQL + pgvector (Docker)
```

## 安装步骤

### 1. 安装 LightRAG 服务

```bash
# 使用 pip 安装
pip install "lightrag-hku[api]"
```

### 2. 配置环境变量

```bash
cd lightrag
cp .env.example .env
# 编辑 .env 文件,填入你的 API 密钥
```

主要配置项:
- `POSTGRES_*`: PostgreSQL 连接信息
- `LLM_BINDING`: LLM 提供商 (openai/gemini)
- `LLM_MODEL`: 模型名称
- `LLM_BINDING_API_KEY`: API 密钥
- `EMBEDDING_*`: Embedding 配置

### 3. 启动 LightRAG 服务

开发模式:
```bash
lightrag-server --host 0.0.0.0 --port 9621 --working-dir ./rag_storage --workspace novel
```

生产模式 (Linux/Mac):
```bash
lightrag-gunicorn --workers 4
```

### 4. 配置 Next.js 环境变量

在项目根目录的 `.env.local` 文件中添加:

```env
LIGHTRAG_BASE_URL=http://localhost:9621
LIGHTRAG_API_KEY=your-secure-api-key-here
```

说明:
- `/health` 返回里的 `"auth_mode"` 指的是 JWT 登录鉴权(`AUTH_ACCOUNTS`)，不是 API Key。
- 默认 `WHITELIST_PATHS=/health,/api/*`，所以 `/health` 不会要求 API Key；验证 API Key 需要请求如 `/documents/status_counts` 这类非白名单接口。

### 5. 验证集成

访问测试页面:
```
http://localhost:3000/test-lightrag
```

或使用 API:
```bash
# 健康检查
curl http://localhost:9621/health

# 查看文档状态
curl http://localhost:9621/documents/status_counts
```

## API 端点

### Next.js API Routes

- `POST /api/lightrag/query` - 查询知识库
- `POST /api/lightrag/documents` - 上传文档
- `GET /api/lightrag/documents` - 获取文档状态
- `GET /api/lightrag/health` - 健康检查

### LightRAG 服务端点

- `POST /query` - 执行 RAG 查询
- `POST /documents/upload` - 上传文档进行索引
- `POST /documents/scan` - 扫描输入目录
- `GET /documents/status_counts` - 查看索引状态统计
- `DELETE /documents/delete_document` - 删除文档 (JSON body: `{"doc_ids":["..."]}`)

## 查询模式

- `local` - 实体级检索 (快速,聚焦)
- `global` - 关系级检索 (全面)
- `hybrid` - 混合模式 (推荐)
- `naive` - 简单向量搜索
- `mix` - 高级模式 (带重排序)

## 使用示例

### 上传文档

```typescript
const response = await fetch('/api/lightrag/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '章节内容...',
    description: '第一章'
  })
});
```

### 查询知识库

```typescript
const response = await fetch('/api/lightrag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '主角的能力是什么?',
    mode: 'hybrid'
  })
});
```

## 集成到小说创作流程

### 1. 章节索引

每次创建或更新章节时,自动上传到 LightRAG:

```typescript
// 在章节保存后
await fetch('/api/lightrag/documents', {
  method: 'POST',
  body: JSON.stringify({
    content: chapter.content,
    description: `${novel.title} - 第${chapter.number}章: ${chapter.title}`
  })
});
```

### 2. 记忆系统查询

在生成新章节前,查询相关内容:

```typescript
// 查询角色信息
const characterInfo = await fetch('/api/lightrag/query', {
  method: 'POST',
  body: JSON.stringify({
    query: `关于角色${characterName}的所有信息`,
    mode: 'local'
  })
});

// 查询伏笔
const foreshadowing = await fetch('/api/lightrag/query', {
  method: 'POST',
  body: JSON.stringify({
    query: '未解决的伏笔',
    mode: 'global'
  })
});
```

### 3. 世界观一致性检查

```typescript
const worldCheck = await fetch('/api/lightrag/query', {
  method: 'POST',
  body: JSON.stringify({
    query: `关于${worldElement}的设定`,
    mode: 'hybrid'
  })
});
```

## 注意事项

1. **首次启动**: LightRAG 服务首次启动时会自动创建必要的数据库表
2. **向量维度**: 确保 `EMBEDDING_DIM` 与 embedding 模型匹配
3. **模型切换**: 更换 embedding 模型需要删除现有向量表
4. **性能优化**: 生产环境建议使用 gunicorn 多进程模式
5. **API 密钥**: 确保 LightRAG 服务的 API 密钥与 Next.js 配置一致

## 故障排查

### LightRAG 服务无法启动

检查:
- PostgreSQL 是否运行
- pgvector 扩展是否安装
- 环境变量是否正确配置

### 查询返回空结果

检查:
- 是否已上传文档
- 文档是否已完成索引 (查看 `/documents/status_counts`)
- 查询模式是否合适

### 连接错误

检查:
- LightRAG 服务是否运行在 9621 端口
- `LIGHTRAG_BASE_URL` 配置是否正确
- 防火墙设置

## 相关文档

- [LightRAG 官方文档](https://github.com/HKUDS/LightRAG)
- [LightRAG 服务配置](./lightrag/README.md)
- [数据库 Schema](./db/schema.sql)
