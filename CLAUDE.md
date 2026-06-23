# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目概述

**mclaw** — 基于 OpenClaw 的图形化 AI 桌面助手，面向地铁行业。

### 三端架构

| 端 | 路径 | 技术栈 | 角色 |
|----|------|--------|------|
| **mclaw 桌面端** | `src/` + `electron/` | Electron + React 19 + Vite 7 | mclaw 主应用（连接 Go 后端登录，底层 OpenClaw 服务） |
| **Web 管理后台** | `apps/web/` | React 19 + Vite 7 + Tailwind 3 | 管理端（非 mclaw 应用） |
| **Go 后端** | `backend/` | Go 1.25 + Ent ORM + Echo | API 服务（支撑桌面端） |

### pnpm Workspace

```
mclaw/
├── .                    # 主项目（桌面端）
├── apps/web             # Web 管理后台
├── packages/shared      # 共享层（types/api/components/hooks/stores）
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

# 开发模式（Web 管理后台）
pnpm dev:web

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

### Go 后端

```bash
cd backend

# 编译
go build -o server ./cmd/

# 运行
./server
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
