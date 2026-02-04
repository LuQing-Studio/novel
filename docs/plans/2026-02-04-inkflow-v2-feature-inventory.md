# Novel.AI / InkFlow v2 功能清单（用于前端重构）

**生成日期**：2026-02-04  
**范围**：基于当前仓库（`/Users/luhui/novel`）代码与现有 PRD  
- v1 PRD：`docs/prd/2026-01-22-novel.md`  
- v2 PRD：`docs/prd/2026-02-04-inkflow.md`  

> 目的：给“前端页面重构/信息架构重排”提供一个**可落地的功能盘点**：哪些已经有了、哪些缺 UI、哪些仍是 TODO，以及哪些点最容易在重构时回归。

---

## 0. 使用方式（给“重构前端页面”用）

每个功能条目尽量包含：
- **状态**：`DONE` / `PARTIAL` / `TODO`
- **UI 入口**：页面路由（App Router）
- **核心交互**：用户在 UI 上做什么
- **API**：对应 `app/api/**/route.ts`
- **DB**：主要数据表
- **重构风险点**：重构时最容易被破坏的地方

---

## 1. 系统现状（架构与依赖）

### 1.1 技术栈（代码现状）
- 前端：Next.js App Router（`app/`），React 19，TypeScript，Tailwind
- 后端：Next.js Route Handlers（`app/api/**`）
- 数据库：PostgreSQL + pgvector（docker 里用 `pgvector/pgvector:pg16`）
- RAG：LightRAG 双实例（剧情/技法分离）
- LLM：可切换 provider（OpenAI/Anthropic/Gemini），用环境变量驱动

### 1.2 Docker / 服务编排
`docker-compose.yml` 包含：
- `db`（Postgres + pgvector）
- `lightrag`（9621，workspace=`novel_story`）
- `lightrag_tech`（9622，workspace=`novel_tech`）
- `web`（Next.js 生产容器，暴露 3000）

### 1.3 关键环境变量（后端能力的开关）
- DB：`DATABASE_URL`
- AI：`AI_PROVIDER`、`AI_API_KEY`、`AI_MODEL`、`AI_BASE_URL`
- RAG：
  - Story：`LIGHTRAG_BASE_URL`、`LIGHTRAG_API_KEY`
  - Tech：`LIGHTRAG_TECH_BASE_URL`、`LIGHTRAG_TECH_API_KEY`

---

## 2. UI 路由导航图（现有页面）

### 2.1 账号
- `/login`：登录页（`app/login/page.tsx`）
- `/register`：注册页（`app/register/page.tsx`）

### 2.2 主流程
- `/`：小说列表主页（需要登录，`app/page.tsx`）
- `/novels/new`：InkFlow 新建小说向导（`app/novels/new/page.tsx`）
- `/novels/[id]`：重定向到 Workbench（`app/novels/[id]/page.tsx`）
- `/novels/[id]/workbench`：Workbench 三栏写作工坊（`app/novels/[id]/workbench/page.tsx`）

### 2.3 写作/审阅相关（v1 页面仍在）
- `/novels/[id]/chapters/[chapterId]`：章节阅读/编辑页（`app/novels/[id]/chapters/[chapterId]/page.tsx`）

### 2.4 记忆系统 & 图谱
- `/novels/[id]/memory`：记忆系统首页（`app/novels/[id]/memory/page.tsx`）
- `/novels/[id]/memory/characters`：人物卡列表（只读 UI）
- `/novels/[id]/memory/foreshadowing`：伏笔列表（只读 UI）
- `/novels/[id]/memory/settings`：世界观列表（只读 UI）
- `/novels/[id]/knowledge-graph`：知识图谱 2D（`react-force-graph-2d`）

### 2.5 技法库
- `/techniques`：全局技法库（列表/编辑/版本/恢复/同步状态）

### 2.6 测试页（开发用）
- `/test-ai`：AI 接口测试
- `/test-lightrag`：LightRAG 查询/上传/状态测试

---

## 3. 功能清单（按模块）

> 说明：下面“状态”是基于代码实现与页面可操作性评估。  
> - `DONE`：功能链路可走通（UI + API + DB）  
> - `PARTIAL`：有实现但缺口明显（例如只有 API 没 UI，或有 UI 但缺关键能力）  
> - `TODO`：在 PRD/计划中，但当前代码未体现  

### 3.1 账号与权限（Auth + 资源隔离）

#### 3.1.1 注册 / 登录 / 退出 / 当前用户
- 状态：`DONE`
- UI 入口：`/login`、`/register`
- API：
  - `POST /api/auth/register`（`app/api/auth/register/route.ts`）
  - `POST /api/auth/login`（`app/api/auth/login/route.ts`）
  - `POST /api/auth/logout`（`app/api/auth/logout/route.ts`）
  - `GET /api/auth/me`（`app/api/auth/me/route.ts`）
- DB：`users`、`sessions`
- 关键交互：
  - 注册成功后自动登录（写 session cookie）
  - 登录成功后跳转主页
- 备注：
  - `register` 会在“首个用户”注册时把历史 `novels.user_id IS NULL` 的小说归属给该用户（便于从单机 v1 迁移）

#### 3.1.2 Novel 级权限控制（owner-only）
- 状态：`DONE`
- API 保护：`lib/auth/api.ts`
  - `requireApiNovelOwner(novelId)`：大部分写接口使用
  - `requireApiNovel(novelId)`：读 novel 并返回 `novel` 对象
- DB：`novels.user_id` 外键到 `users`
- 重构风险点：
  - 前端重构不要把“跨用户可见”的资源列表/详情写出来（目前默认按 user_id 过滤）

---

### 3.2 小说生命周期（列表/创建/更新/删除）

#### 3.2.1 小说列表（主页）
- 状态：`DONE`
- UI 入口：`/`（`app/page.tsx`）
- API：`GET /api/novels`（`app/api/novels/route.ts`）
- DB：`novels`
- 关键交互：
  - 展示每本小说：标题/类型/简介/章数/字数/更新时间
  - 点击进入：`/novels/[id]/workbench`
- 重构风险点：
  - 列表卡片点击目标路由要保持 `workbench`（目前已切换）

#### 3.2.2 新建小说（InkFlow 向导式）
- 状态：`DONE`
- UI 入口：`/novels/new`（`app/novels/new/page.tsx`）
- 核心交互：
  1) 输入 `idea`（必填）、`genre`（必填）、可选书名
  2) 点击“生成 3 个总纲候选”
  3) 选择其一并可编辑后创建
  4) 创建成功跳转 Workbench
- API：
  - `POST /api/novels/blueprints`（`app/api/novels/blueprints/route.ts`）
  - `POST /api/novels`（`app/api/novels/route.ts`）
- DB：`novels`、`volumes`
- 备注：
  - `POST /api/novels` 在创建后会尝试预建 5 个默认卷（1..5）

#### 3.2.3 小说信息更新 / 删除
- 状态：`PARTIAL`
- API：`GET/PUT/DELETE /api/novels/[id]`（`app/api/novels/[id]/route.ts`）
- DB：`novels`
- 缺口（前端）：
  - 目前没有专门的“小说设置/编辑”页面（Workbench 上也未提供编辑 `overallOutline` 的 UI）
- 重构建议（前端）：
  - 在 Workbench 顶部/右栏加入“小说设置抽屉”或“总纲编辑”入口

---

### 3.3 InkFlow v2：分形大纲（Book → Volume → ChapterPlan）

#### 3.3.1 分卷 Volumes：创建/编辑/列表
- 状态：`DONE`
- UI 入口：Workbench 左侧大纲（卷列表 + 选中编辑）
- API：
  - `GET/POST /api/novels/[id]/volumes`（`app/api/novels/[id]/volumes/route.ts`）
  - `PUT /api/novels/[id]/volumes/[volumeId]`（`app/api/novels/[id]/volumes/[volumeId]/route.ts`）
- DB：`volumes`
- 关键交互：
  - 编辑卷名、卷纲、目标章数（targetChapters）
- 重构风险点：
  - 保持卷的 `number` 顺序语义（UI 显示“第 N 卷”）

#### 3.3.2 AI 生成卷纲（5 卷）
- 状态：`DONE`
- UI 入口：Workbench 左侧大纲顶部按钮“AI 生成卷纲”
- API：`POST /api/novels/[id]/volumes/generate`（`app/api/novels/[id]/volumes/generate/route.ts`）
- DB：`volumes`（先确保 1..count 存在，然后 update 标题/纲要/目标章数）

#### 3.3.3 章纲 Chapter Plans：创建/编辑/列表
- 状态：`DONE`
- UI 入口：Workbench（选中某章计划后在中栏编辑 title/outline）
- API：
  - `GET/POST /api/novels/[id]/chapter-plans`（`app/api/novels/[id]/chapter-plans/route.ts`）
  - `GET/PUT /api/novels/[id]/chapter-plans/[planId]`（`app/api/novels/[id]/chapter-plans/[planId]/route.ts`）
- DB：`chapter_plans`
- 关键约束（代码已落地）：
  - `status`：`draft` | `confirmed` | `drafted` | `done`
  - **严格锁定**：当 plan 不是 `draft` 时更新会：
    1) 写入 `chapter_plan_versions` 旧版本快照
    2) 把 plan 回退到 `draft`（要求重新确认）

#### 3.3.4 章纲确认（confirmed gate）
- 状态：`DONE`
- UI 入口：Workbench 中栏按钮“确认章纲”（仅 draft 可点）
- API：`POST /api/novels/[id]/chapter-plans/[planId]/confirm`（`app/api/novels/[id]/chapter-plans/[planId]/confirm/route.ts`）
- DB：`chapter_plans`

#### 3.3.5 AI 批量生成章纲（默认 10）
- 状态：`DONE`
- UI 入口：Workbench 中栏（选中卷后输入数量并点“生成章纲”）
- API：`POST /api/novels/[id]/volumes/[volumeId]/chapter-plans/generate`（`app/api/novels/[id]/volumes/[volumeId]/chapter-plans/generate/route.ts`）
- DB：`chapter_plans`
- 行为要点：
  - 自动从全书最大章节号继续编号（全书连续 number）
  - 若卷设置了 `targetChapters`，会限制生成数量

#### 3.3.6 章纲版本历史（查看/恢复）
- 状态：`PARTIAL`
- DB：`chapter_plan_versions` 已存在且写入逻辑已实现（在锁定编辑时写旧版本）
- 缺口：
  - 目前没有“列出章纲版本/恢复”的 API 与 UI
- TODO（若按 v2 PRD 完整实现）：
  - `GET /api/novels/[id]/chapter-plans/[planId]/versions`
  - `POST /api/novels/[id]/chapter-plans/[planId]/versions/restore`

---

### 3.4 InkFlow v2：Workbench（三栏写作工坊）

#### 3.4.1 Workbench 聚合加载
- 状态：`DONE`
- UI 入口：`/novels/[id]/workbench`（`app/novels/[id]/workbench/page.tsx`）
- API：`GET /api/novels/[id]/workbench`（`app/api/novels/[id]/workbench/route.ts`）
- 返回：`novel + volumes + chapterPlans + chapters(meta)`
- 重构风险点：
  - Workbench 页面是 v2 主入口，任何导航/布局重构要保证该路由稳定

#### 3.4.2 桌面/移动端布局策略
- 状态：`PARTIAL`
- 现状（代码）：
  - 桌面端：3 列 Grid（左大纲 / 中编辑 / 右助手）
  - 移动端：左侧大纲通过按钮打开 Drawer；右侧助手目前在布局上变成“下方区域”（不是底部 Tabs）
- v2 PRD 目标：
  - 移动端右侧助手应是底部 Tabs 或 Drawer 形态（更像工坊）
- 重构风险点：
  - 不要让移动端出现内容溢出、按钮被遮挡、无法编辑/选中

#### 3.4.3 写作助手：技法标签注入（Tech RAG tags）
- 状态：`DONE`
- UI 入口：Workbench 右栏“写作”Tab 输入 tags
- 行为：
  - tags 会注入：
    - “章纲生成正文”
    - “选中文本 AI 改写”
    - “批注 AI 改写”
- API（间接）：
  - `POST /api/novels/[id]/chapter-plans/[planId]/generate?stream=1`（`app/api/novels/[id]/chapter-plans/[planId]/generate/route.ts`）
  - `POST /api/novels/[id]/chapters/[chapterId]/rewrite`（`app/api/novels/[id]/chapters/[chapterId]/rewrite/route.ts`）
  - `POST /api/novels/[id]/chapters/[chapterId]/annotations/[annotationId]/apply`（`app/api/novels/[id]/chapters/[chapterId]/annotations/[annotationId]/apply/route.ts`）
- 备注：
  - tags 仅是检索提示；真正写作技法来自 `Tech LightRAG`

#### 3.4.4 记忆/伏笔/批注 Tab（Workbench 右栏）
- 状态：`PARTIAL`
- 现状：
  - `memory`：提供跳转链接到记忆系统和图谱（DONE）
  - `foreshadowing`：仅说明文案（TODO：做真正“伏笔提醒面板”）
  - `annotations`：提示“入口在章节原地编辑里”（DONE 但偏弱）
- v2 PRD 目标：
  - 在 Workbench 右栏提供更强“伏笔追踪/批注管理/记忆查询”面板（目前仅部分实现）

---

### 3.5 正文（Chapter）生成、编辑、版本、审核（v2 + v1 共存）

#### 3.5.1 章纲绑定正文生成（严格 gate + 流式）
- 状态：`DONE`
- UI 入口：Workbench 中栏按钮“生成正文（流式）”
- API：`POST /api/novels/[id]/chapter-plans/[planId]/generate?stream=1`（`app/api/novels/[id]/chapter-plans/[planId]/generate/route.ts`）
- DB：`chapters`、`chapter_plans`、`novels`，并自动触发人物提取
- 关键约束（代码已实现）：
  - plan 必须是 `confirmed` 才能生成
  - `chapters` 对 `(novel_id, plan_id)` 唯一：同一章纲只能生成一次
  - 生成完：plan 状态更新为 `drafted`
- 上下文与注入（代码已实现）：
  - 最近已生成的前文 N 章（支持跳写，只取 `< plan.number` 的已成文章节）
  - DB Top-K：人物/世界观
  - DB：伏笔分层（铺垫/待揭示/长期未回收）
  - Story LightRAG：基于本章 outline 检索注入
  - Tech LightRAG：基于 techniqueTags + “任务描述”检索注入
- 流式协议：
  - `application/x-ndjson`，逐行 JSON（`{type:'delta', text:'...'}`）

#### 3.5.2 v1 旧式“按 outline 直接生成下一章”
- 状态：`DONE`（但在 v2 里是“备用/历史路径”）
- 入口（UI 组件）：`components/GenerateChapterButton.tsx`
- API：`POST /api/novels/[id]/generate?stream=1`（`app/api/novels/[id]/generate/route.ts`）
- DB：`chapters`、`novels`，并自动人物提取 + Story RAG 上传
- 重构建议：
  - 前端重构时先保留，但可以弱化入口（避免用户绕开章纲确认机制）

#### 3.5.3 章节阅读页（v1 legacy 页面）
- 状态：`DONE`
- UI 入口：`/novels/[id]/chapters/[chapterId]`（`app/novels/[id]/chapters/[chapterId]/page.tsx`）
- 核心功能（页面组合）：
  - 原地编辑（`components/InlineChapterEditor.tsx`）
  - 版本历史（`components/VersionHistoryButton.tsx`）
  - 自动提取记忆（`components/AutoExtractButton.tsx`）
  - 毒舌编辑审核 + 应用建议重生成（`components/ReviewChapterButton.tsx`）
  - 导出单章 TXT（`components/ExportChapterButton.tsx`）

#### 3.5.4 原地编辑 + 选中文本局部改写（写作“肌肉放大器”）
- 状态：`DONE`
- UI 入口：`components/InlineChapterEditor.tsx`
- API：
  - `PUT /api/novels/[id]/chapters/[chapterId]`（`app/api/novels/[id]/chapters/[chapterId]/route.ts`）
  - `POST /api/novels/[id]/chapters/[chapterId]/versions`（`app/api/novels/[id]/chapters/[chapterId]/versions/route.ts`）
  - `POST /api/novels/[id]/chapters/[chapterId]/rewrite`（`app/api/novels/[id]/chapters/[chapterId]/rewrite/route.ts`）
- Tech RAG：
  - rewrite 时可传 `techniqueTags`，会走 Tech LightRAG 检索并注入
- 关键交互：
  - 编辑模式下选择文本区间 → 调用 rewrite → 预览 replacement → 应用到正文 → 保存

#### 3.5.5 章节版本历史（正文版本）
- 状态：`DONE`
- UI 入口：`components/VersionHistoryButton.tsx`
- API：
  - `GET /api/novels/[id]/chapters/[chapterId]/versions`（`app/api/novels/[id]/chapters/[chapterId]/versions/route.ts`）
  - `POST /api/novels/[id]/chapters/[chapterId]/versions/[versionId]/restore`（`app/api/novels/[id]/chapters/[chapterId]/versions/[versionId]/restore/route.ts`）
- DB：`chapter_versions`
- 备注：
  - Inline 编辑保存、批注应用都会自动写版本快照（见下）

#### 3.5.6 毒舌编辑审核 + 根据建议重生成
- 状态：`DONE`（但审核 prompt 仍偏 v1 风格）
- UI 入口：`components/ReviewChapterButton.tsx`
- API：
  - `POST /api/novels/[id]/chapters/[chapterId]/review`（`app/api/novels/[id]/chapters/[chapterId]/review/route.ts`）
  - `POST /api/novels/[id]/chapters/[chapterId]/regenerate`（`app/api/novels/[id]/chapters/[chapterId]/regenerate/route.ts`）
- DB：`chapters`（直接覆盖 content/word_count），并自动人物提取
- 重构风险点：
  - review/regenerate 目前不自动落版本（如果你希望“任何覆盖都落版本”，需要改后端逻辑；目前只在编辑/批注时落）

#### 3.5.7 导出 TXT（全书/选章/单章）
- 状态：`DONE`
- UI 入口：
  - `components/ExportButton.tsx`（导出全文或选章）
  - `components/ExportChapterButton.tsx`（单章导出）
- API：`GET /api/novels/[id]/export`（`app/api/novels/[id]/export/route.ts`）
- DB：`chapters`
- 行为：
  - 支持 query：`chapterIds=` 或多 `chapterId=`

---

### 3.6 Reviewer Loop：批注审阅流（Word-style 注释 → AI 定点改写 → 落版本）

#### 3.6.1 创建批注（基于选区）
- 状态：`DONE`
- UI 入口：InlineChapterEditor 编辑模式 → 输入批注 → “添加批注(选中)”
- API：`POST /api/novels/[id]/chapters/[chapterId]/annotations`（`app/api/novels/[id]/chapters/[chapterId]/annotations/route.ts`）
- DB：`chapter_annotations`
- 定位策略：
  - 保存 `quote + start_offset + end_offset`

#### 3.6.2 获取批注列表
- 状态：`DONE`
- UI：InlineChapterEditor 编辑模式会拉取并展示 open 批注
- API：`GET /api/novels/[id]/chapters/[chapterId]/annotations`（`app/api/novels/[id]/chapters/[chapterId]/annotations/route.ts`）

#### 3.6.3 AI 执行批注（生成 replacement，不落库）
- 状态：`DONE`
- UI：批注卡片“AI 执行修改”
- API：`POST /api/novels/[id]/chapters/[chapterId]/annotations/[annotationId]/apply`（`app/api/novels/[id]/chapters/[chapterId]/annotations/[annotationId]/apply/route.ts`）
- Tech RAG：
  - 可传 `techniqueTags`，会注入 Tech LightRAG 检索结果
- 定位策略（后端）：
  - 优先用 quote 在当前 content 中重新匹配；多处匹配取离原 offset 最近；匹配失败 fallback offset；再不行返回 409

#### 3.6.4 应用并保存（自动落版本 + 标记 applied）
- 状态：`DONE`
- UI：AI 建议面板“应用并保存”
- API：`POST /api/novels/[id]/chapters/[chapterId]/annotations/[annotationId]/apply-and-save`（`app/api/novels/[id]/chapters/[chapterId]/annotations/[annotationId]/apply-and-save/route.ts`）
- DB：
  - `chapter_versions`：先保存旧 content 快照
  - `chapters`：更新 content/word_count
  - `chapter_annotations`：status 改为 `applied`
  - `novels`：同步字数与 updated_at
- 缺口：
  - 目前没有“dismiss 批注”的 API/UI（PRD 提到 dismissed 状态）

---

### 3.7 记忆系统（人物/伏笔/世界观）+ 自动提取

#### 3.7.1 记忆系统首页（统计 + 分入口）
- 状态：`DONE`
- UI 入口：`/novels/[id]/memory`（`app/novels/[id]/memory/page.tsx`）
- API：页面 server-side 拉取：
  - `GET /api/novels/[id]/characters`
  - `GET /api/novels/[id]/foreshadowing`
  - `GET /api/novels/[id]/world-settings`
- DB：`characters`、`foreshadowing`、`world_settings`

#### 3.7.2 人物卡/伏笔/世界观列表页（UI）
- 状态：`PARTIAL`
- UI 入口：
  - `/novels/[id]/memory/characters`（只读）
  - `/novels/[id]/memory/foreshadowing`（只读）
  - `/novels/[id]/memory/settings`（只读）
- API（后端已具备 CRUD）：
  - Characters：
    - `GET/POST /api/novels/[id]/characters`（`app/api/novels/[id]/characters/route.ts`）
    - `GET/PUT/DELETE /api/novels/[id]/characters/[characterId]`（`app/api/novels/[id]/characters/[characterId]/route.ts`）
  - Foreshadowing：
    - `GET/POST /api/novels/[id]/foreshadowing`（`app/api/novels/[id]/foreshadowing/route.ts`）
    - `GET/PUT/DELETE /api/novels/[id]/foreshadowing/[foreshadowingId]`（`app/api/novels/[id]/foreshadowing/[foreshadowingId]/route.ts`）
  - World settings：
    - `GET/POST /api/novels/[id]/world-settings`（`app/api/novels/[id]/world-settings/route.ts`）
    - `GET/PUT/DELETE /api/novels/[id]/world-settings/[settingId]`（`app/api/novels/[id]/world-settings/[settingId]/route.ts`）
- 缺口（前端）：
  - 缺少创建/编辑/删除表单与交互（API 已经写好）

#### 3.7.3 自动提取人物（章节级）
- 状态：`DONE`
- UI 入口：章节页按钮“自动提取记忆”（`components/AutoExtractButton.tsx`）
- API：
  - `POST /api/novels/[id]/chapters/[chapterId]/extract-characters`（`app/api/novels/[id]/chapters/[chapterId]/extract-characters/route.ts`）
  - `POST /api/novels/[id]/chapters/[chapterId]/auto-extract`（`app/api/novels/[id]/chapters/[chapterId]/auto-extract/route.ts`）
- DB：`characters`
- AI：`lib/ai/character-extractor.ts`

---

### 3.8 技法知识库（Techniques：全局按用户）

#### 3.8.1 技法 CRUD（列表/创建/编辑/删除）
- 状态：`DONE`
- UI 入口：`/techniques`（`app/techniques/page.tsx`）
- API：
  - `GET/POST /api/techniques`（`app/api/techniques/route.ts`）
  - `GET/PUT/DELETE /api/techniques/[id]`（`app/api/techniques/[id]/route.ts`）
- DB：`techniques`
- 关键交互：
  - 左侧列表：显示标题 + 标签 + 同步状态（pending/synced/failed）
  - 右侧编辑：标题、标签（逗号）、内容
  - 搜索：按 title/content ILIKE
  - 标签过滤：按 tags contains
- 同步行为（后端）：
  - 创建/更新/恢复时会 best-effort 上传到 Tech LightRAG，并更新 `sync_status/last_synced_at/lightrag_doc_id`

#### 3.8.2 技法版本历史（列表 + 恢复）
- 状态：`DONE`
- UI：`/techniques` 里弹窗（`app/techniques/techniques-client.tsx`）
- API：
  - `GET /api/techniques/[id]/versions`（`app/api/techniques/[id]/versions/route.ts`）
  - `POST /api/techniques/[id]/versions/restore`（`app/api/techniques/[id]/versions/restore/route.ts`）
- DB：`technique_versions`
- 备注：
  - 更新前会保存版本快照；恢复前也会保存“恢复前快照”

#### 3.8.3 技法索引删除（LightRAG doc 删除）
- 状态：`PARTIAL`
- API：`DELETE /api/techniques/[id]` 仅在 `lightrag_doc_id` 存在时尝试删除 Tech LightRAG 文档
- 备注：
  - 若 LightRAG 不支持或返回 doc_id 不稳定，会出现“索引残留”的现实问题（后端已做 best-effort）

---

### 3.9 知识图谱（2D 力导向）

#### 3.9.1 图谱 API（节点/边）
- 状态：`DONE`
- API：`GET /api/novels/[id]/knowledge-graph`（`app/api/novels/[id]/knowledge-graph/route.ts`）
- DB：`characters`、`world_settings`、`foreshadowing`
- 现状边生成：
  - 通过 description/content 的字符串包含关系生成简单 edges（可用但不精确）

#### 3.9.2 图谱 UI（2D）
- 状态：`DONE`
- UI 入口：`/novels/[id]/knowledge-graph`（`app/novels/[id]/knowledge-graph/page.tsx`）
- 技术点：
  - `react-force-graph-2d` 动态 import（避免 SSR）
  - 右侧详情面板展示节点 data

---

### 3.10 LightRAG / AI / DB 测试与开发工具

#### 3.10.1 DB 连通性测试
- 状态：`DONE`
- API：`GET /api/db/test`（`app/api/db/test/route.ts`）
- 用途：验证 DATABASE_URL 是否正确、基本表是否存在

#### 3.10.2 AI 接口测试
- 状态：`DONE`
- UI：`/test-ai`（`app/test-ai/page.tsx`）
- API：`POST /api/ai/test`（`app/api/ai/test/route.ts`）
- 用途：快速验证 AI_PROVIDER / KEY / MODEL / BASE_URL

#### 3.10.3 LightRAG 测试（query/upload/status/health）
- 状态：`DONE`（Story RAG 维度）
- UI：`/test-lightrag`（`app/test-lightrag/page.tsx`）
- API：
  - `GET /api/lightrag/health`（`app/api/lightrag/health/route.ts`）
  - `POST /api/lightrag/query`（`app/api/lightrag/query/route.ts`）
  - `GET/POST /api/lightrag/documents`（`app/api/lightrag/documents/route.ts`）
- 备注：
  - 这些测试接口目前指向 `getLightRAGClient()`（即 Story RAG），不是 Tech RAG

#### 3.10.4 批量生成章节脚本（开发用）
- 状态：`DONE`
- 文件：`scripts/generate-chapters.js`
- 用途：调用 v1 `POST /api/novels/[id]/generate` 批量生成

---

## 4. 前端重构“不可回归”清单（建议作为验收用例）

### 4.1 必须保持可用的核心旅程（现状可走通）
1) 注册/登录 → 进入主页小说列表  
2) 新建小说向导：idea/genre → 生成 3 个总纲候选 → 创建 → 跳转 Workbench  
3) Workbench：生成卷纲 → 生成章纲 → 编辑章纲 → 确认章纲 → 生成正文（流式）  
4) 正文：原地编辑 + 保存（落版本）  
5) 正文：选中文本局部改写（可带技法 tags）  
6) 批注：选中片段添加批注 → AI 执行 → 应用并保存（落版本 + 批注 applied）  
7) 技法库：新建/编辑/删除/版本恢复 + 同步状态可见  
8) 图谱：2D 正常加载，可拖拽，可点节点查看详情  
9) 主题切换：所有页面保持 `ThemeToggle` 生效（dark class）

### 4.2 已知“容易踩坑”的点（重构时要显式测试）
- 所有包含 `[id]`/`[chapterId]` 的路径在 zsh 下要注意方括号转义（开发命令/脚本里尤其明显）
- 生成接口是 NDJSON 流式，前端读取方式不能被“通用 fetch 封装”破坏
- Workbench 里章纲状态 gate：未 confirmed 禁止生成正文
- `chapters (novel_id, plan_id)` 唯一：重复生成要走“换 plan”或加“重生成机制”（目前是 409）

---

## 5. 当前与 v2 PRD 的差距（用于排期）

### 5.1 已落地（PRD v2 关键点）
- Workbench 作为主入口（DONE）
- 分形大纲：Volumes + ChapterPlans + confirm gate（DONE）
- 双 LightRAG：story/tech 隔离（DONE）
- 技法库一等公民：CRUD + tags + 版本 + 同步（DONE）
- Reviewer Loop：批注 → AI → 应用并保存落版本（DONE）
- 图谱 2D 默认（DONE）

### 5.2 仍缺口明显（建议后续补）
- 章纲版本历史（chapter_plan_versions）的查看/恢复 UI 与 API（PARTIAL/TODO）
- Workbench 右栏“记忆查询/伏笔追踪/批注管理”做成真正面板（目前多为说明/链接）（PARTIAL）
- 记忆系统（人物/伏笔/世界观）前端 CRUD 表单（API 已有，UI 缺）（PARTIAL）
- 批注 dismissed/关闭（数据模型支持，API/UI 未做）（TODO）
- 移动端 Workbench：右栏助手“底部 Tabs”形态（目前只是单列布局）（PARTIAL）

---

## 6. 公共接口/类型变更点（给重构/迭代对齐用）
- `lib/types/index.ts` 已定义 v2 的 `Novel/Volume/ChapterPlan/Technique/ChapterAnnotation` 等接口
- Workbench 聚合接口返回结构（前端已依赖）：
  - `GET /api/novels/[id]/workbench` → `{ novel, volumes, chapterPlans, chapters }`
- LightRAG client 已区分：
  - `lib/lightrag/client.ts`：`getStoryRAGClient()` / `getTechRAGClient()` / `getLightRAGClient()`（alias story）

---

## 7. 验收测试场景（与前端重构强相关）

建议把下面当作“重构后必须重新跑一遍”的手工验收脚本（也可用 `agent-browser` 自动化）：
- 登录态检查：未登录访问 `/`/`/novels/new`/`/novels/[id]/workbench` 必须跳 `/login`
- 新建小说：blueprints JSON 解析失败时要有错误提示且不崩
- Workbench：卷/章选择切换时，中栏表单要正确回填
- 生成章纲：受 `targetChapters` 限制时要提示（API 会返回 400）
- 生成正文：streaming 区域实时增量显示，完成后刷新 Workbench 并出现“正文”标签
- Inline 编辑：保存会先写版本，再更新章节 content，保存后退出编辑态
- 批注：quote 重定位失败时 API 返回 409，前端要能显示错误并提示用户刷新/重新选区
- 技法库：保存后 syncStatus 变化可见（synced/failed/pending）
- 图谱：节点点击/取消选中/缩放拖拽可用

---

## 8. 明确假设（本清单采用）
- “功能是否完成”的判定以“用户通过现有 UI 能否走通”为主；仅有 API 没 UI 的条目标记为 `PARTIAL`
- v1 功能（章节页、审核、导出、记忆列表）目前仍属于“必须保留不回归”的范围（即使后续会弱化入口）

