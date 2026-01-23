# LightRAG 服务安装和启动指南

## 1. 安装 LightRAG

```bash
# 使用 pip 安装(推荐使用虚拟环境)
pip install "lightrag-hku[api]"
```

## 2. 配置环境变量

```bash
cd lightrag
cp .env.example .env
# 编辑 .env 文件,填入你的 API 密钥
```

## 3. 启动服务

### 开发模式
```bash
lightrag-server --host 0.0.0.0 --port 9621 --working-dir ./rag_storage --workspace novel
```

### 生产模式(Linux/Mac)
```bash
lightrag-gunicorn --workers 4
```

## 4. 验证服务

```bash
# 健康检查
curl http://localhost:9621/health

# 查看文档状态
curl http://localhost:9621/documents/status_counts
```

说明:
- `/health` 返回里的 `"auth_mode"` 指的是 JWT 登录鉴权(`AUTH_ACCOUNTS`)，不是 API Key。
- 默认 `WHITELIST_PATHS=/health,/api/*`，所以 `/health` 不会要求 API Key；验证 API Key 需要请求如 `/documents/status_counts` 这类非白名单接口。

## 5. API 端点

- `POST /documents/upload` - 上传文档进行索引
- `POST /documents/scan` - 扫描输入目录
- `GET /documents/status_counts` - 查看索引状态统计
- `POST /query` - 执行 RAG 查询
- `DELETE /documents/delete_document` - 删除文档 (JSON body: `{"doc_ids":["..."]}`)

## 6. 查询模式

- `local` - 实体级检索(快速,聚焦)
- `global` - 关系级检索(全面)
- `hybrid` - 混合模式(推荐)
- `naive` - 简单向量搜索
- `mix` - 高级模式(带重排序)

## 7. 配置说明

### LLM Provider 选择

**OpenAI:**
```env
LLM_BINDING=openai
LLM_MODEL=gpt-4o
LLM_BINDING_HOST=https://api.openai.com/v1
LLM_BINDING_API_KEY=sk-...
```

**Anthropic (Claude):**
```env
LLM_BINDING=openai
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_BINDING_HOST=https://api.anthropic.com/v1
LLM_BINDING_API_KEY=sk-ant-...
```

**Google Gemini:**
```env
LLM_BINDING=gemini
LLM_MODEL=gemini-2.0-flash
LLM_BINDING_API_KEY=...
```

### Embedding Provider 选择

**OpenAI (推荐):**
```env
EMBEDDING_BINDING=openai
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIM=3072
```

**Gemini:**
```env
EMBEDDING_BINDING=gemini
EMBEDDING_MODEL=models/text-embedding-004
EMBEDDING_DIM=768
```

## 8. 注意事项

- 确保 PostgreSQL 已安装 pgvector 扩展
- 首次启动会自动创建必要的表
- 向量维度(EMBEDDING_DIM)必须与 embedding 模型匹配
- 更换 embedding 模型需要删除现有向量表
