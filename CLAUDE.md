# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目概述

**mclaw** — 基于 OpenClaw 的图形化 AI 桌面助手，面向地铁行业。

> 单应用仓库：本仓库只含桌面端（Electron + React）。配套的 Go 后端 + Web 管理后台已拆分到独立项目 **mclaw-server**。

### 本地项目联动（开发必读）

桌面端必须配合 Go 后端使用，后端是独立项目，开发和联调时需要跨项目操作：

| 项目 | 本地路径 | 角色 | 仓库 |
|------|----------|------|------|
| **mclaw（本仓库）** | `/Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw` | 桌面端应用 | github: nidao003/mclaw |
| **mclaw-server** | `/Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw-server` | Go 后端 + Web 管理后台 + 部署文件 | 本地 git（含敏感部署凭证，勿公开） |

**联动场景**：
- 改后端 API / 计费 / 登录逻辑 → 去 `mclaw-server/backend/` 改 Go 代码，部署到 133 测试服务器
- 改 Web 管理后台 → 去 `mclaw-server/web/`
- 后端部署/运维 → 用 `mclaw-server/.claude/skills/mclaw-deploy/SKILL.md`（含 SSH 凭证）
- 桌面端连后端 → 本仓库 `.env` 配 `VITE_API_BASE_URL` / `VITE_LLMPROXY_BASE_URL`（本地文件，不进 git）
- 后端地址：公网 `https://mclaw.ooh.oohforce.com:25025`（API `/api/v1/`，LLM 代理 `/v1/`），局域网 `http://192.168.3.133`

> ⚠️ **shared 双副本**：`packages/shared` 被 mclaw 桌面端用（`@mclaw/shared` workspace 包），mclaw-server 也有一份副本（web 用 `@shared` alias）。**两端独立演化**，改 shared 要同步两边，否则类型/接口会漂移。

### 技术栈

| 项 | 路径 | 说明 |
|----|------|------|
| 桌面端主进程 | `electron/` | Electron，Gateway 进程管理 |
| 桌面端渲染层 | `src/` | React 19 + Vite 7 + Tailwind 3 |
| 共享层 | `packages/shared/` | types/api/components/hooks/stores（桌面端用） |

### pnpm Workspace

```
mclaw/
├── .                    # 桌面端主项目（src/ + electron/）
├── packages/shared      # 共享层（桌面端用）
├── packages/cli         # CLI 工具
└── harness              # 测试 harness
```

---

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式（桌面端）
pnpm dev

# 构建桌面端
pnpm build

# 代码检查
pnpm lint:check
pnpm lint

# 类型检查
pnpm typecheck

# 运行测试
pnpm test
```

### Go 后端 / Web 管理后台

后端和 Web 管理后台已拆到独立项目，不在本仓库：

```bash
cd /Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw-server

# Web 管理后台开发
pnpm dev:web

# Go 后端编译运行
cd backend && go build -o server ./cmd/ && ./server
```

---

## 硬规则（禁止违反）

1. **品牌色不变**：橙色 #EE7C4B，禁止擅自修改
2. **禁止用 emoji 当功能图标**：统一用 lucide-react
3. **禁止绕开规范自行设计**：修改 UI 前必须先读 docs/design-spec.md
4. **菜单命名两字化**：对话/模型/专家/任务/技能/链接/图像/梦境
5. **新增/修改 MODULE_GUIDE.md 或 rule 后必须更新 indexes/README.md**

---

## 桌面端技术栈

| 项 | 选型 |
|----|------|
| 框架 | React 19 + Vite 7 |
| 样式 | Tailwind 3 + shadcn 风格 |
| 类型 | TypeScript strict |
| 图标 | lucide-react |
| 国际化 | i18next |
| 状态 | zustand |

---

## 桌面端布局约定

- 菜单列：固定 140px，图标+文字横排
- 条件侧栏：仅 `/` 路由显示，默认 260px，可拖 220-360px
- 主区：弹性宽度，紧贴无空隙

---

## 桌面端路由表

| 路由 | 菜单 |
|------|------|
| `/` | 对话 |
| `/models` | 模型 |
| `/agents` | 专家 |
| `/channels` | 链接 |
| `/skills` | 技能 |
| `/cron` | 任务 |
| `/image-generation` | 图像 |
| `/dreams` | 梦境 |
| `/settings` | 设置 |

---

## Go 后端 biz 模块

| 模块 | 说明 |
|------|------|
| admin | 管理后台 |
| billing | 计费 |
| data | 数据服务 |
| expert | 专家管理 |
| file | 文件服务 |
| git | Git 操作 |
| host | 主机管理 |
| llmproxy | LLM 代理 |
| notify | 通知服务 |
| payment | 支付 |
| project | 项目管理 |
| public | 公开接口 |
| setting | 配置 |
| skill | 技能管理 |
| static | 静态资源 |
| subscription | 订阅 |
| task | 任务调度 |
| team | 团队管理 |
| uploader | 上传服务 |
| user | 用户管理 |
| vmidle | VM 空闲管理 |
| wallet | 钱包 |

---

## 索引

详细文档索引见 `.claude/indexes/README.md`
