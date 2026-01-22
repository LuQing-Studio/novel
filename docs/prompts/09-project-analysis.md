# Phase 9: 项目分析

## 提示词 21: 深度项目分析

**日期**: 2026-01-22

**原始提示词**:
```
请使用 repomix mcp 和 sequential mcp 来把目前这个项目通读一遍，
看看哪些东西需要记录在日志里，那些需要记录在知识库里，详细看看
```

**背景**:
- 项目已完成 MVP + 完整版 + P2 功能
- 需要系统性回顾整个项目
- 需要识别可记录的知识和问题

**执行过程**:

### 1. 使用 repomix MCP 打包代码库
- 打包 80 个文件
- 总计 73,884 tokens
- 生成 XML 格式的代码快照

### 2. 使用 sequential-thinking MCP 深度分析
- 执行 12 轮思考
- 系统性分析技术架构
- 识别关键决策和最佳实践

### 3. 分析结果

**记录到知识库 (dev-knowledge)** - 8 条:
1. Multi AI Provider 架构设计 (Factory + Adapter 模式)
2. LightRAG 存储后端选择 (NetworkXStorage vs PGGraphStorage)
3. PostgreSQL 数据库抽象层设计
4. Next.js API Routes 错误处理模式
5. Tailwind CSS v4 新语法
6. Next.js 15 Promise-based params
7. react-force-graph-2d 可视化实现
8. Embedding 模型选择 (bge-m3 vs OpenAI)

**已记录到日志 (dev-journal)** - 4 条:
1. LightRAG 认证问题
2. 知识图谱边生成问题
3. 数据库字段名不匹配
4. Context7 MCP 使用问题

**关键特点**:
- 使用专业工具进行系统性分析
- 明确区分知识库和日志的内容
- 强调"详细看看"，要求深度分析

**技术洞察**:
- 成本优化决策: DeepSeek (¥1-2/百万tokens) vs OpenAI ($30/百万tokens)
- 简单性优先: NetworkXStorage vs PGGraphStorage (避免 Apache AGE 依赖)
- 一致性模式: 267 处 try-catch 错误处理
- 类型安全: 使用泛型的数据库查询函数

---

## 提示词 22: 整理用户提示词

**日期**: 2026-01-22

**原始提示词**:
```
你来回顾一下咱们的这个，就是从开发这个项目开始。
呃，我发出的那些提示词。就是 prompt。
把它们整理一下。就我感觉就是咱们整理一下放到本地这个文件夹目录里面去
你先整理出来，我看一下，先不着急往文件夹里面放。
```

**背景**:
- 项目开发过程中积累了大量用户提示词
- 需要系统性整理这些提示词
- 作为项目经验和模板参考

**执行过程**:

### 1. 回顾整个开发过程
- 从项目初始化到完成
- 识别所有关键提示词
- 总计 22 个提示词

### 2. 组织提示词结构
- 按开发阶段分为 9 个 Phase
- 每个 Phase 包含相关提示词
- 添加背景、执行结果、关键特点

### 3. 创建文档结构
```
docs/prompts/
├── README.md
├── 01-project-initialization.md
├── 02-basic-architecture.md
├── 03-page-features.md
├── 04-database-api.md
├── 05-core-workflow.md
├── 06-complete-features.md
├── 07-p2-features.md
├── 08-code-management.md
└── 09-project-analysis.md
```

### 4. 用户反馈
```
满意，不用再调整什么
```

**关键特点**:
- 口语化表达 ("你来回顾一下咱们的这个")
- 渐进式确认 ("先整理出来，我看一下")
- 明确输出位置 ("放到本地这个文件夹目录里面去")
- 用户参与决策 (先展示，确认后再保存)

**提示词分析**:

### 风格特点
1. **简洁直接**: 大多数提示词都很简短
2. **口语化**: "你来把那个服务运行起来"
3. **渐进式**: 先实现基础功能，再逐步完善
4. **测试驱动**: 经常要求测试功能是否正常

### 常用模式
1. **"你来..."**: 直接指示执行某个任务
2. **"实现..."**: 明确功能需求
3. **"使用...测试"**: 指定测试工具和方法
4. **"严格按照..."**: 强调遵循规范

### 技术决策
1. 优先使用成本低的方案 (DeepSeek, 硅基流动)
2. 选择简单易用的方案 (NetworkXStorage vs PGGraphStorage)
3. 重视移动端体验
4. 注重代码规范和文档

---

## 阶段总结

### 提示词特点
1. **系统性分析**: 使用专业工具进行深度分析
2. **知识沉淀**: 区分知识库和日志内容
3. **经验总结**: 整理提示词作为模板参考
4. **渐进式确认**: 先展示结果，确认后再执行

### 分析工具
- **repomix MCP**: 代码库打包和分析
- **sequential-thinking MCP**: 结构化深度思考
- **dev-knowledge skill**: 本地知识库管理
- **dev-journal skill**: GitHub Issues 问题跟踪

### 项目统计
- **总提示词数**: 22 个
- **开发阶段**: 9 个
- **开发周期**: 2026-01-22 (1天完成 MVP + 完整版 + P2功能)
- **主要工具**: Chrome DevTools MCP, Context7 MCP, repomix MCP, sequential-thinking MCP

### 使用建议
这些提示词可以作为:
1. **项目复盘**: 回顾开发过程和决策
2. **经验总结**: 提取有效的提示词模式
3. **团队培训**: 教导团队成员如何与 AI 协作
4. **模板参考**: 为新项目提供提示词模板
