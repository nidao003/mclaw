# mclaw — Project Guide for Claude

> mclaw 是基于 OpenClaw 的图形化 AI 桌面助手。
> 本文件是项目级 Claude 配置，开发任何页面/功能前请先阅读相关章节。

---

## 1. 设计规范（必读）

新增/修改任何 UI 前**必须**先看下面两个文档，按优先级阅读：

### 📐 [docs/DESIGN.md](docs/DESIGN.md) — **设计源头（QClaw 反向工程）**

原始设计稿反推的完整规范，包含：

- **品牌色**：原型是红色 `#E8352B`，**mclaw 替换为橙色 `#EE7C4B`（保持不变）**
- **布局原则**：60px 图标导航 + 240px 条件侧栏（仅 / 路由显示）+ flex 主区
- **字体系统**：`-apple-system, PingFang SC` 系统字体栈
- **圆角系统**：8px 基础 / 12px 卡片 / 20px+ 胶囊
- **阴影系统**：5 级（xs/sm/md/lg/xl/2xl）
- **组件规范**：按钮/卡片/输入/导航/徽章/弹窗/开关
- **Do/Don't**：明确禁止/推荐做法
- **响应式**：3 个断点的面板折叠策略

### 📐 [docs/design-spec.md](docs/design-spec.md) — **mclaw 实际落地规范**

基于 `DESIGN.md` 在 mclaw 项目里的具体实现说明：

- **品牌色 token 映射**（`brand: #EE7C4B` / `brand-hover: #D95A2B`）
- **侧边栏配色**（浅色 cream + 暗色 warm deep）
- **Tailwind 工具类**（`bg-brand/8` `bg-brand/12` 等非整除透明度）
- **三栏布局**（图标列 60px + 对话侧栏 220-360px 可拖 + 主区 flex）
- **菜单两字化**（对话/模型/专家/任务/技能/频道/图像/梦境）
- **改动记录**

⚠️ **设计参考图与 HTML 原型与 mclaw 实际项目结构不完全一致**，仅作视觉语言参考。
⚠️ **不要绕开规范自行设计**。如需调整，先更新 `docs/design-spec.md`。

### 🌐 [docs/skills-hub-DESIGN.md](docs/skills-hub-DESIGN.md) — **Skills Hub Web 专门规范**

`apps/web/**` 和 `packages/shared/src/components/**` 中的 Web 技能市场 UI 以此文件为准：

- 参考 `https://skillhub.cn` 的公开页面风格
- 白色画布、蓝色强调、黑色胶囊 CTA、圆形搜索条、纵向技能流
- 保留 mclaw 自身品牌与文案，不复制参考站内容
- 桌面应用端仍遵循 `docs/DESIGN.md` 与 `docs/design-spec.md`

---

## 2. 关键技术决策

| 决策 | 说明 | 文件 |
|------|------|------|
| React 19 + Vite 7 | 主框架 | `package.json` |
| Tailwind 3 + shadcn 风格 | 样式 | `tailwind.config.js` |
| TypeScript strict | 类型 | `tsconfig.web.json` |
| lucide-react | 图标（**禁止用 emoji 当功能图标**） | — |
| i18next | 国际化 | `src/i18n/`, `shared/i18n/locales/` |
| zustand | 状态管理 | `src/stores/` |
| 主题色 | **橙色不变**（`brand: #EE7C4B`） | `tailwind.config.js` |

---

## 3. 项目结构

```
src/
├── components/
│   ├── ui/          # 基础组件（Button/Card/Badge…）
│   ├── layout/      # MainLayout / Sidebar / TitleBar
│   ├── common/      # 通用业务组件
│   ├── file-preview/
│   ├── channels/
│   ├── settings/
│   └── update/
├── pages/           # 路由页面
│   ├── Chat/        # 对话（含 WelcomeScreen）
│   ├── Agents/      # 专家
│   ├── Channels/    # 频道
│   ├── Skills/      # 技能
│   ├── Cron/        # 任务
│   ├── Models/      # 模型
│   ├── ImageGeneration/  # 图像
│   ├── Settings/
│   ├── Setup/
│   └── ...
├── stores/          # zustand stores
├── styles/globals.css   # CSS 变量 + 自定义工具类
├── hooks/           # 自定义 React hooks
├── lib/             # 工具函数
├── i18n/            # i18n 配置
└── types/

shared/
└── i18n/locales/
    ├── zh/          # 中文翻译（菜单/页面文案）
    ├── en/
    └── ...

docs/
├── design-spec.md   # ⭐ 视觉设计规范（必读）
├── skills-hub-DESIGN.md # Web / Skills Hub 专门视觉规范
├── projects/        # 参考设计图与原型
│   └── assets/      # UI 设计图 PNG
└── ...
```

---

## 4. 路由 & 菜单对照

| 路由 | 菜单显示 | 含义 |
|------|---------|------|
| `/` | 对话 | Chat 主页面 |
| `/models` | 模型 | AI 模型管理 |
| `/agents` | **专家** | Agent 列表 |
| `/channels` | 链接 | 多平台链接 |
| `/skills` | 技能 | Skills |
| `/cron` | **任务** | 定时任务 |
| `/image-generation` | **图像** | 图像生成（dev 模式） |
| `/dreams` | 梦境 | 梦境功能（dev 模式） |
| `/settings` | 设置 | 设置抽屉 |

**菜单命名规则**：两字统一（中文）。i18n key 在 `shared/i18n/locales/zh/common.json` → `sidebar.*`。

---

## 5. 布局约定（条件三栏式）

```
─ 对话路由 (/) ──────────────────────────
┌────────┬──────────────────┬─────────────┐
│ 菜单列 │  条件侧栏（可拖） │             │
│(140px) │  (默认 260px)     │  Chat 主页  │
│图标+文字│  搜索 + 新对话   │  (flex)     │
│        │  + 历史对话列表   │             │
│        │  (220-360 范围)   │             │
└────────┴──────────────────┴─────────────┘

─ 其他路由 (/models /agents /cron /…) ──
┌────────┬───────────────────────────────┐
│ 菜单列 │                               │
│(140px) │       主页面                  │
│图标+文字│       (flex)                  │
│        │                               │
└────────┴───────────────────────────────┘
```

- **菜单列（IconRail）**：**固定 140px**，**横排显示图标+文字**
  - 顶部 Logo 区（小图标 + "mclaw"）
  - 分组标题：主功能 / 其他
  - 7 个主功能菜单（对话/模型/专家/任务/技能/链接/梦境）+ dev 模式（图像）
  - 底部：历史记录 + 设置
- **条件侧栏（ChatSidebarPane）**：**仅 `/` 路由显示**，默认 260px，**可拖动调整 220-360px**
  - 内部布局：搜索框 + 新对话按钮 + 历史对话列表（today/本周/本月/更早 分组）
  - 底部 Gateway 重启提示
- **主区**：弹性宽度，按当前路由显示对应页面，**紧贴菜单列/侧栏无空隙**

参考设计图：`docs/projects/assets/image_20260609123715926.png`（对话页）和 `image_20260609123721006.png`（专家页）

---

## 6. 常用命令

```bash
pnpm dev               # 启动 vite dev server
pnpm typecheck:web     # 跑 web 端 typecheck
pnpm typecheck         # 全量 typecheck
pnpm build:vite        # 仅构建 web 部分
pnpm lint              # eslint --fix
```

---

## 7. 测试服务器

| 项目 | 值 |
|------|-----|
| IP | `[REDACTED]` |
| 用户/密码 | `root` / `[REDACTED]` |
| OS | Ubuntu 24.04.4 LTS x86_64 |
| Docker | 29.5.3 |
| Docker Compose | v5.1.4 |

```bash
# SSH 登录
ssh root@[REDACTED]  # 密码 [REDACTED]
```

---

## 8. 修改记录

| 日期 | 改动 | 涉及 |
|------|------|------|
| 2026-06-09 | 侧边栏从冷蓝灰深色改为温暖奶油浅色 | `tailwind.config.js`, `globals.css`, `Sidebar.tsx`, `MainLayout.tsx` |
| 2026-06-09 | Card 圆角升级到 16px，Button 升级 + 新增 soft/brand 变体 | `card.tsx`, `button.tsx`, `badge.tsx` |
| 2026-06-09 | Windows 标题栏按钮加圆角分组 | `TitleBar.tsx` |
| 2026-06-09 | Chat 欢迎屏加 4 张能力卡片 | `Chat/index.tsx` |
| 2026-06-09 | 建立设计规范文档 + 项目级 CLAUDE.md | `docs/design-spec.md`, `CLAUDE.md` |
| 2026-06-09 | 侧边栏改为三栏固定宽度布局 + 菜单两字命名 | `Sidebar.tsx`, `common.json` |
| 2026-06-10 | Go 后端迁入（20 个 biz 模块 + 52 个 Ent schema 编译通过） | `backend/` |
| 2026-06-11 | 阶段 2-3：SkillHub Web SPA 骨架 + packages/shared 共享层扩展 | `apps/web/`, `packages/shared/src/` |
| 2026-06-11 | pnpm install 修复（删除 6 个私有频道包） | `package.json` |
| 2026-06-11 | 共享 UI 组件库（SkillCard/List/Detail/SearchBar + PricingTable + LoginForm/OAuthButtons） | `packages/shared/src/components/` |
| 2026-06-11 | 共享 Hooks + Stores（useSkillList/Detail + useSubscription + useAuth + authStore） | `packages/shared/src/hooks/`, `packages/shared/src/stores/` |
| 2026-06-11 | Web 页面全量升级（Skills/Detail/Pricing/Login 对接共享组件 + API） | `apps/web/src/pages/` |
| 2026-06-11 | CORS 中间件 + subscriptionStore + 管理后台（Admin/Skills 审核页） | `backend/middleware/cors.go`, `packages/shared/src/stores/`, `apps/web/src/pages/Admin/` |
| 2026-06-11 | API Key 全链路（Ent schema + domain + middleware + handler + Web 管理页） | `backend/ent/schema/user_apikey.go`, `backend/middleware/auth.go`, `apps/web/src/pages/Settings/ApiKeys.tsx` |
| 2026-06-12 | Skills Hub Web 设计规范全面应用：暖奶油画布 #f7f7f4、Inter + JetBrains Mono、hairline 替代投影、8px CTA 圆角、80px 区块间距 | `apps/web/src/styles/globals.css`, `tailwind.config.js`, `apps/web/index.html`, `packages/shared/src/components/`, `apps/web/src/pages/`, `apps/web/src/components/layout/` |
| 2026-06-12 | **Skills Hub 开放分发系统**：CLI (`mclaw-skills`)、Registry API (download/manifest)、Web 安装弹窗、SKILL.md 包格式规范 → [知识库](docs/knowledge/skills-hub-distribution.md) | `packages/cli/`, `backend/biz/skill/handler/v1/skill.go`, `apps/web/src/pages/SkillDetail/`, `packages/shared/src/` |
| 2026-06-12 | Skills Hub Web 更新为 skillhub.cn 风格：白色画布、Plus Jakarta Sans + Outfit、蓝色强调、黑色胶囊 CTA、圆形搜索条、纵向技能流；新增 Web 专门规范 | `docs/skills-hub-DESIGN.md`, `docs/design-spec.md`, `apps/web/`, `packages/shared/src/components/` |
| 2026-06-12 | BindHandler→BaseHandler 修复 + Ent UUID 全链路补齐（skill/review/version）；发布「中文公文 Word 版式」技能 v1.0.0 | `backend/biz/skill/handler/v1/skill.go`, `usecase/skill.go`, `repo/skill.go`, `repo/skill_review.go`, `repo/skill_version.go`, `.claude/skills/chinese-official-word-style/` |

---

## 9. 知识库索引

| 文档 | 内容 |
|------|------|
| [Skills Hub 分发系统](docs/knowledge/skills-hub-distribution.md) | CLI + Registry API + Web 安装弹窗，三源安装架构，部署流程，踩坑记录 |
| [设计规范](docs/design-spec.md) | mclaw 视觉设计落地规范 |
| [Skills Hub Web 设计规范](docs/skills-hub-DESIGN.md) | Web 技能市场专门视觉规范 |
| [Design 源头](docs/DESIGN.md) | QClaw 反向工程原始设计规范 |
