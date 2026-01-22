# Phase 3: 数据库和 API 集成

## 提示词 6: 配置数据库和 LightRAG

```
配置 PostgreSQL + pgvector
集成 DeepSeek API
配置硅基流动 bge-m3 Embedding
安装和启动 LightRAG 服务
```

### 执行结果
- ✅ 配置 PostgreSQL + pgvector (Docker 容器)
- ✅ 创建数据库 Schema
- ✅ 集成多 AI Provider 支持 (OpenAI/Anthropic/Gemini)
- ✅ 配置 DeepSeek API (¥1-2/百万tokens)
- ✅ 配置硅基流动 bge-m3 Embedding (1024维)
- ✅ 安装和启动 LightRAG 服务

### 关键决策
- 使用 LightRAG 替代单独的 pgvector + GraphRAG
- 使用 DeepSeek API 降低成本
- 使用 NetworkXStorage 替代 PGGraphStorage (避免 AGE 扩展)

### 技术细节
- 修复 OpenAI adapter 的 baseURL 路径拼接问题
- LightRAG 配置文件放在项目根目录
- 存储配置: PGKVStorage + PGVectorStorage + NetworkXStorage + PGDocStatusStorage

### Git 提交
- `a9f46e7`: feat: 集成 LightRAG 知识图谱和向量检索
- `70d8b99`: fix: 修复 DeepSeek API baseURL 路径拼接问题
- `3bd2b41`: feat: 配置硅基流动 Embedding API
- `2569cc9`: feat: 成功启动 LightRAG 服务

---

## 提示词 7: 实现 CRUD API

```
实现所有记忆系统的 CRUD API
- 小说 API
- 章节 API
- 人物 API
- 伏笔 API
- 世界观设定 API
```

### 执行结果
- ✅ 实现小说 CRUD API (GET, POST, PUT, DELETE)
- ✅ 实现章节 CRUD API
- ✅ 实现人物 CRUD API
- ✅ 实现伏笔 CRUD API
- ✅ 实现世界观设定 CRUD API
- ✅ 更新所有 UI 页面从 API 获取数据

### 技术实现
- API 路由结构: `/api/novels/[id]/characters/[characterId]`
- 使用 Next.js 15 async params 模式
- 数据库字段使用 snake_case
- 统一错误处理模式: try-catch + NextResponse.json

### 验证方式
- 使用 Chrome DevTools MCP 测试所有页面
- 测试首页、详情页、章节页、记忆系统页面
