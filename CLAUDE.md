# Novel AI - Claude 开发指南

## ⚠️ AI 必读提醒

**在开始任何工作前，AI 必须：**

1. 📖 阅读本文件的完整内容
2. ✅ 在完成功能后，严格执行「功能完成标准」
3. 🔄 自动提交代码并更新进度文档
4. 📝 记录 Git 提交哈希到进度文档
5. 🎯 使用 TodoWrite 工具追踪任务进度

---

## 项目概述

Novel AI 是一个 AI 驱动的小说创作助手,专注于解决长篇小说创作中的长期一致性问题。

**PRD 文档**: [docs/prd/2026-01-22-novel.md](docs/prd/2026-01-22-novel.md)
**进度跟踪**: [docs/progress/2026-01-22-novel.md](docs/progress/2026-01-22-novel.md)
**提示词整理**: [docs/prompts/README.md](docs/prompts/README.md)

## 开发流程规范

### 1. 项目文档管理

项目使用三个核心文档来指导开发：

**PRD 文档** (`docs/prd/YYYY-MM-DD-<project>.md`)
- 定义项目目标、功能需求、验收标准
- 作为项目的"北极星"，避免开发跑偏
- 在项目启动时创建，需求变更时更新

**进度跟踪文档** (`docs/progress/YYYY-MM-DD-<project>.md`)
- 记录每个 Phase 的完成情况
- 记录关键决策、技术细节、问题解决方案
- 每完成一个功能后更新
- **必须记录 Git 提交哈希**，便于追踪代码变更

**提示词整理** (`docs/prompts/`)
- 记录开发过程中使用的提示词
- 按开发阶段组织
- 作为经验总结和模板参考

### 2. 功能完成标准

每个功能完成后,必须:

1. ✅ **代码实现完成** - 功能代码已编写并测试
2. ✅ **提交到 Git** - 代码已提交并推送到 GitHub
3. ✅ **更新进度文档** - 在 `docs/progress/2026-01-22-novel.md` 中勾选对应项
4. ✅ **验证功能** - 在本地或部署环境验证功能正常工作

### 3. 开发工作流

```
开始功能 → 实现代码 → 测试验证 → Git 提交 → 更新进度文档 → 下一个功能
```

### 4. 功能验证流程

**主要验证工具: Chrome DevTools MCP**

每个功能开发完成后,必须使用 Chrome DevTools MCP 进行验证:

1. 启动本地开发服务器
2. 使用 Chrome DevTools MCP 工具进行自动化测试
3. 点击所有交互元素,验证功能正常
4. 检查页面渲染、主题切换、响应式布局
5. 确认无 404 错误、无 JavaScript 错误

**移动端验收测试**

Chrome DevTools MCP 验证通过后,在移动端进行最终验收:

- 访问 http://192.168.1.191:3000
- 浏览所有页面,确认功能正常
- 测试主题切换
- 验证移动端适配效果

### 5. 进度文档更新规则

在 `docs/progress/2026-01-22-novel.md` 中:

- 将 `- [ ]` 改为 `- [x]` 表示完成
- 在"已完成功能"部分添加详细记录
- 更新"总体进度"百分比
- 记录关键决策和问题解决方案
- 记录 Git 提交哈希

### 6. Git 提交规范

提交信息格式:

```
<类型>: <简短描述>

<详细说明>

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
```

类型:
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构
- `style`: 样式调整
- `docs`: 文档更新
- `test`: 测试相关

## 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **AI 服务**:
  - LLM: DeepSeek API (兼容 OpenAI 格式)
  - Embedding: 硅基流动 bge-m3 (1024维)
  - 知识图谱: LightRAG (NetworkXStorage + PGVectorStorage)
- **数据库**: PostgreSQL + pgvector
- **部署**: Vercel
- **版本控制**: GitHub (LuQing-Studio/novel)

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动 LightRAG 服务
cd lightrag
python server.py

# 本地访问
http://localhost:3000

# 局域网访问(移动端测试)
http://192.168.1.191:3000
```

## 代码规范

### TypeScript

- 使用严格模式
- 所有函数必须有类型注解
- 优先使用 interface 而非 type
- 使用 const 而非 let

### React

- 使用函数组件和 Hooks
- 组件文件使用 PascalCase
- 优先使用 Server Components
- 需要交互时使用 'use client'

### Tailwind CSS

- 使用 Tailwind 工具类
- 避免自定义 CSS
- 使用 dark: 前缀支持暗色主题
- 使用响应式前缀(md:, lg:)适配移动端

## 注意事项

1. **长期一致性优先** - 这是项目的核心价值,所有功能都要服务于此
2. **分章节生成** - 不要一次性生成大量内容,保证质量
3. **记忆系统是关键** - 人物卡、伏笔、世界观设定必须准确维护
4. **移动端优先** - 确保所有功能在移动端可用
5. **主题切换** - 所有新页面都要支持暗色/亮色主题

## 参考资料

- [PRD 文档](docs/prd/2026-01-22-novel.md)
- [进度跟踪](docs/progress/2026-01-22-novel.md)
- [提示词整理](docs/prompts/README.md)
- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [DeepSeek API 文档](https://platform.deepseek.com/docs)
