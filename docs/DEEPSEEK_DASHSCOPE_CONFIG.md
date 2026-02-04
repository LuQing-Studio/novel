# DeepSeek + 硅基流动 Embedding 配置指南

## 配置方案

本项目使用:
- **LLM**: DeepSeek API (OpenAI 兼容格式)
- **Embedding**: 硅基流动 SiliconFlow - BAAI/bge-m3

## 1. 获取 API Key

### DeepSeek API Key
1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册/登录账号
3. 在控制台创建 API Key
4. 复制 API Key (格式: `sk-xxxxx`)

### 硅基流动 SiliconFlow API Key
1. 访问 [硅基流动](https://siliconflow.cn/)
2. 注册/登录账号
3. 在控制台创建 API Key
4. 复制 API Key

**特点**:
- bge-m3: 多语言 Embedding 模型
- 1024 维向量
- 价格实惠

## 2. 配置文件

### 配置 LightRAG 服务 (`lightrag/.env`)

```bash
cd /path/to/novel/lightrag
```

编辑 `.env` 文件,填入你的 API Key:

```env
# LLM - DeepSeek
LLM_BINDING=openai
LLM_MODEL=deepseek-chat
LLM_BINDING_HOST=https://api.deepseek.com/v1
LLM_BINDING_API_KEY=sk-xxxxx  # 你的 DeepSeek API Key

# Embedding - 硅基流动 SiliconFlow
EMBEDDING_BINDING=openai
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIM=1024
EMBEDDING_BINDING_HOST=https://api.siliconflow.cn/v1
EMBEDDING_BINDING_API_KEY=sk-xxxxx  # 你的硅基流动 API Key

# 服务密钥(自己设置)
LIGHTRAG_API_KEY=my-secure-lightrag-key-123
```

### 配置 Next.js 应用（本地开发推荐：`.env.local`）

```bash
cd /path/to/novel
```

编辑 `.env.local` 文件:

```env
# AI Provider
AI_PROVIDER=openai
AI_MODEL=deepseek-chat
AI_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=sk-xxxxx  # 你的 DeepSeek API Key

# Database（本地用 docker compose 启动 db 时，默认映射到 15432；如你改了 DB_PORT 请同步修改）
DATABASE_URL=postgresql://postgres:postgres@localhost:15432/novle

# LightRAG
LIGHTRAG_BASE_URL=http://localhost:9621
LIGHTRAG_API_KEY=my-secure-lightrag-key-123  # 与 lightrag/.env 保持一致

# LightRAG Tech（技法库）
LIGHTRAG_TECH_BASE_URL=http://localhost:9622
LIGHTRAG_TECH_API_KEY=my-secure-lightrag-key-123  # 推荐与 lightrag/.env 保持一致
```

## 3. 启动服务

### 启动（推荐：npm dev + Docker 服务）

本仓库自带 `docker-compose.yml`，包含：
- Postgres（pgvector）
- LightRAG（剧情 `novel_story`，端口 9621）
- LightRAG Tech（技法 `novel_tech`，端口 9622）

```bash
cd /path/to/novel
docker compose up -d db lightrag lightrag_tech
npm run dev
```

> 注意：为支持 `npm run dev` 直连 Docker 服务，`db/lightrag/lightrag_tech` 端口会绑定到 `127.0.0.1`。

### 启动 LightRAG 服务（手动方式，可选）

```bash
cd /path/to/novel
lightrag-server --host 0.0.0.0 --port 9621 --working-dir ./rag_storage --workspace novel
```

### 启动 Next.js 应用

```bash
npm run dev
```

## 4. 测试

### 测试 AI API
访问: http://localhost:3000/test-ai

### 测试 LightRAG
访问: http://localhost:3000/test-lightrag

也可以直接检查 health：
- http://localhost:9621/health（story）
- http://localhost:9622/health（tech）

### 测试数据库
访问: http://localhost:3000/api/db/test

## 5. Embedding 模型说明

### text-embedding-v4 特性

- **向量维度**: 支持多种维度 (64, 128, 256, 512, 768, 1024, 1536, 2048)
- **语言支持**: 100+ 语言,包括中文、英文等
- **最大长度**: 8,192 tokens/批次
- **调用格式**: OpenAI 兼容
- **距离度量**: 余弦相似度

### 为什么选择 1024 维度?

- 平衡了性能和准确度
- 适合中等规模的知识库
- 存储和计算成本合理

如果需要更高精度,可以改为 1536 或 2048 维度:

```env
EMBEDDING_DIM=1536  # 或 2048
```

**注意**: 修改维度后需要重建向量索引!

## 6. 备选方案

### 方案 A: 使用 OpenAI Embedding

如果你有 OpenAI API Key:

```env
EMBEDDING_BINDING=openai
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIM=3072
EMBEDDING_BINDING_HOST=https://api.openai.com/v1
EMBEDDING_BINDING_API_KEY=sk-xxxxx
```

### 方案 B: 本地部署 Embedding 模型

如果想本地部署,可以使用:
- bge-large-zh-v1.5 (1024维,中文优化)
- GTE-large (768维,中英双语)

需要额外配置本地模型服务。

## 7. 成本估算

### DeepSeek
- 价格: ¥1/百万tokens (输入) + ¥2/百万tokens (输出)
- 非常便宜,适合开发和小规模使用

### DashScope Embedding
- 价格: $0.07/百万tokens
- 免费额度: 1M tokens (90天)
- 对于小说创作场景,免费额度通常够用

## 8. 故障排查

### LightRAG 启动失败

检查:
```bash
# 检查 Python 环境
python --version  # 需要 Python 3.8+

# 检查 LightRAG 安装
pip show lightrag-hku

# 检查数据库连接
psql -h localhost -U postgres -d novle
```

### API 调用失败

检查:
- API Key 是否正确
- 网络连接是否正常
- API 额度是否用完

### 向量维度不匹配

如果遇到维度错误:
```sql
-- 删除现有向量表
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS foreshadowing CASCADE;
DROP TABLE IF EXISTS world_settings CASCADE;

-- 重新运行 schema.sql
```

## 9. 下一步

配置完成后:
1. 测试 AI API 调用
2. 测试 LightRAG 文档上传和查询
3. 开始小说创作!
