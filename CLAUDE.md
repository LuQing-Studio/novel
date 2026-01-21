# Novel AI - Claude 开发指南

## 项目概述

Novel AI 是一个 AI 驱动的小说创作助手,专注于解决长篇小说创作中的长期一致性问题。

**PRD 文档**: [docs/prd/2026-01-22-novel.md](docs/prd/2026-01-22-novel.md)
**进度跟踪**: [docs/progress/2026-01-22-novel.md](docs/progress/2026-01-22-novel.md)

## 开发流程规范

### 1. 必须使用 project-kickstart Skill

在开发过程中,**必须**使用 `project-kickstart` skill 来管理开发进度:

```bash
# 初始化项目跟踪
/project-kickstart init

# 开始新功能开发
/project-kickstart start <功能名称>

# 完成功能开发
/project-kickstart complete <功能名称>

# 更新进度
/project-kickstart update
```

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

### 5. Git 提交规范

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
- **AI**: Claude API (Anthropic)
- **数据库**: PostgreSQL + pgvector
- **部署**: Vercel
- **版本控制**: GitHub (LuQing-Studio/novel)

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 本地访问
http://localhost:3000

# 局域网访问(移动端测试)
http://192.168.1.191:3000
```

## 当前开发阶段

**Milestone 1: MVP** (Week 1-4)

当前进度: Phase 1 完成 (基础架构搭建)

下一步:
- [ ] 创建小说详情页面和章节阅读
- [ ] 创建记忆系统 UI(人物卡、伏笔、设定)
- [ ] 配置 PostgreSQL + pgvector
- [ ] 集成 Claude API

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
- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Claude API 文档](https://docs.anthropic.com/)
