# mclaw 项目结构调整方案：集成 Go 后端 + SkillHub Web

> 日期：2026-06-10
> 前置调研：[backend-tech-selection-research.md](./backend-tech-selection-research.md)
> 
> ## 📊 实施进度（updated 2026-06-11）
> 
> | 阶段 | 描述 | 状态 | 完成日期 |
> |------|------|------|----------|
> | 1 | Go 后端迁入 | ✅ 完成 | 2026-06-10 |
> | 2 | SkillHub Web 前端搭建 | ✅ 完成 | 2026-06-11 |
> | 3 | packages/shared 扩展 | ✅ 完成 | 2026-06-11 |
> | 4 | 计费模块开发 | ⏳ Go 侧完成，前端 Pricing 页已对接 | — |
> | 5 | SkillHub 技能市场开发 | ✅ 完成 | 2026-06-11 |
> | — | CORS 中间件 | ✅ 完成 | 2026-06-11 |
> | — | API Key 全链路（Schema → 中间件 → Web UI） | ✅ 完成 | 2026-06-11 |
> | — | Admin 技能上传 + 审核 | ✅ 完成 | 2026-06-11 |
> | — | subscriptionStore | ✅ 完成 | 2026-06-11 |
> 
> **阶段 2-3 完成内容（2026-06-11 全量交付）：**
> - `apps/web/` — Vite + React 19 + Tailwind 3 SPA（6 路由，全量对接共享组件 + Go API）
> - `packages/shared/src/` — 完整共享层：types / api / utils / components / hooks / stores
> - 共享 UI 组件库：SkillCard / SkillList / SkillDetailView / SkillSearchBar / PricingTable / PlanBadge / LoginForm / OAuthButtons
> - 共享 Hooks：useSkillList / useSkillDetail / useSubscription / useAuth
> - 共享 Stores：useAuthStore (zustand)
> - Skills 页面加登录保护（未登录引导至 /login）
> - TypeScript strict typecheck 零错误，Vite build 1.42s（1762 modules）
> - pnpm install 修复（删除 6 个私有频道包）
> 
> **待完成（后续迭代）：**
> - Go 后端支付网关真实对接（WeChat Pay V3，当前是 mock）
> - Go 后端联调验证（需 PostgreSQL/Redis/ClickHouse 环境）
> - 桌面端 `/skills` 页面改用共享组件（数据模型不同，需适配层）

---

## 一、调整目标

将 mclaw 从纯前端 Electron 桌面应用，升级为**全栈项目**：

- 集成 Go 后端（基于 MonkeyCode backend），承载登录授权、计费、SkillHub 等核心能力
- 新增 SkillHub Web 前端（独立 SPA），面向浏览器用户
- 桌面端与 Web 端共享组件/类型/API 层

---

## 二、调整前 vs 调整后

### 调整前（当前结构）

```
mclaw/
├── src/                  → 桌面端主代码（React + Vite + Electron）
├── electron/             → Electron 主进程
├── apps/
│   ├── web/              → 空目录
│   ├── desktop/          → 空目录
│   └── controller/       → 静态资源
├── packages/
│   ├── shared/           → 共享代码
│   ├── dev-utils/        → 开发工具
│   └── slimclaw/         → 精简版
├── docs/                 → 文档
├── scripts/              → 脚本
└── pnpm-workspace.yaml
```

### 调整后（目标结构）

```
mclaw/
├── backend/                  → Go 后端（从 MonkeyCode 迁入）
│   ├── biz/                  → 业务模块
│   │   ├── user/             → ✅ 用户系统（登录/注册/OAuth）
│   │   ├── oauth/            → ✅ OAuth 第三方登录
│   │   ├── subscription/     → ✅ 会员订阅（改造：从空壳变真实计费）
│   │   ├── payment/          → 🆕 支付模块（新增）
│   │   ├── skill/            → 🆕 技能市场（新增，SkillHub 核心）
│   │   ├── llmproxy/         → ✅ LLM 代理
│   │   ├── notify/           → ✅ 通知系统
│   │   ├── setting/          → ✅ 系统配置
│   │   ├── task/             → ⏸️ AI 任务（保留，后续按需启用）
│   │   ├── project/          → ⏸️ 项目管理（保留，后续按需启用）
│   │   ├── team/             → ⏸️ 团队管理（保留，后续按需启用）
│   │   ├── host/             → ⏸️ 宿主机管理（保留，暂不启用）
│   │   ├── vmidle/           → ⏸️ VM 空闲管理（保留，暂不启用）
│   │   ├── git/              → ⏸️ Git 集成（保留，暂不启用）
│   │   ├── gitbot/           → ⏸️ Git Bot（保留，暂不启用）
│   │   ├── file/             → ✅ 文件管理
│   │   ├── uploader/         → ✅ 上传服务
│   │   ├── mcp/              → ✅ MCP Hub（SkillHub 基础）
│   │   ├── public/           → ✅ 公共接口
│   │   ├── static/           → ✅ 静态文件
│   │   └── register.go       → 模块注册入口
│   ├── cmd/                  → 程序入口
│   ├── config/               → 配置加载
│   ├── consts/               → 常量定义
│   ├── db/                   → Ent 生成的数据访问层
│   ├── domain/               → 领域模型 + 接口契约
│   ├── ent/                  → Ent Schema
│   ├── errcode/              → 错误码
│   ├── middleware/            → HTTP 中间件
│   ├── migration/            → 数据库迁移
│   ├── pkg/                  → 公共工具包
│   ├── templates/            → 模板文件
│   ├── go.mod
│   └── Makefile
│
├── src/                      → 桌面端主代码（不动）
│   ├── components/
│   ├── pages/
│   │   ├── Chat/
│   │   ├── Skills/           → 技能页面（复用 packages/shared 的 SkillHub 组件）
│   │   ├── Models/
│   │   ├── Settings/
│   │   └── ...
│   ├── stores/
│   ├── hooks/
│   └── ...
│
├── apps/
│   ├── web/                  → 🆕 SkillHub Web 前端（独立 SPA）
│   │   ├── src/
│   │   │   ├── pages/        → 页面：技能市场/技能详情/用户中心/定价
│   │   │   ├── components/   → Web 端专属组件
│   │   │   ├── lib/          → API 客户端、工具函数
│   │   │   └── App.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── package.json
│   ├── desktop/              → 桌面端入口（后续可迁移）
│   └── controller/           → 不动
│
├── packages/
│   ├── shared/               → 📦 桌面端 + Web 共享层（扩展）
│   │   ├── components/       → 共享 UI 组件（SkillCard, SkillList, PricingTable...）
│   │   ├── types/            → 共享 TypeScript 类型（Skill, Plan, User...）
│   │   ├── api/              → 共享 API 客户端（封装 Go 后端接口）
│   │   ├── hooks/            → 共享 React Hooks（useSkill, useSubscription...）
│   │   ├── stores/           → 共享状态（zustand stores）
│   │   ├── i18n/             → 国际化（现有）
│   │   └── utils/            → 工具函数
│   ├── dev-utils/            → 不动
│   └── slimclaw/             → 不动
│
├── docs/                     → 文档
├── scripts/                  → 脚本（扩展）
├── Makefile                   → 🆕 统一构建入口
└── pnpm-workspace.yaml       → 更新：加入 apps/web
```

---

## 三、关键设计决策

### 3.1 Go 后端迁入策略：全量迁入，按需启用

**为什么不全量迁入？**

MonkeyCode Go 后端的模块间通过 `samber/do` 依赖注入互相关联，强行拆分容易导致编译失败。不用的模块只是注册了但不会被调用，不影响运行。

**模块启用状态说明**：

| 状态 | 含义 | 操作 |
|------|------|------|
| ✅ 启用 | 当前阶段需要 | 直接使用 |
| 🆕 新增 | 需要新写 | 按计划开发 |
| ⏸️ 保留 | 代码迁入但暂不启用 | 注册但不暴露路由，或注释注册 |
| ❌ 不迁入 | 确定不需要 | 不迁入 |

**暂不启用的模块处理方式**：

在 `backend/biz/register.go` 中，通过构建标签（build tag）控制：

```go
// +build !minimal

package biz

func RegisterAll(i *do.Injector) error {
    // 核心模块（始终启用）
    user.ProvideUser(i)
    subscription.ProvideSubscription(i)
    llmproxy.ProvideLLMProxy(i)
    // ...

    // 扩展模块（仅完整版启用）
    host.ProvideHost(i)
    vmidle.ProvideVMIdle(i)
    git.ProvideGit(i)
    gitbot.ProvideGitBot(i)
    // ...
}
```

### 3.2 SkillHub Web 前端：独立 SPA

**为什么是独立 SPA 而不是桌面端的一个路由？**

| 方式 | 优势 | 劣势 |
|------|------|------|
| **独立 SPA** ✅ | 可独立部署访问、SEO 友好、浏览器用户无需安装桌面端 | 组件复用需通过 packages/shared |
| 桌面端内嵌路由 | 共享一切 | Web 用户被强迫装桌面端，不合理 |
| 单体应用 | 最简单 | 无法独立部署，耦合严重 |

**技术选型**：与桌面端保持一致

- React 19 + Vite
- Tailwind CSS + shadcn 风格
- zustand 状态管理
- i18next 国际化

**桌面端如何复用 SkillHub 功能**：

1. **组件复用**：通过 `packages/shared/` 共享 SkillCard、SkillList、PricingTable 等组件
2. **API 复用**：通过 `packages/shared/api/` 共享 Go 后端 API 客户端
3. **状态复用**：通过 `packages/shared/stores/` 共享 zustand stores

桌面端的 `/skills` 路由页面直接 import shared 组件组装，不需要从 Web 端复制代码。

### 3.3 packages/shared 扩展策略

现有 `packages/shared/` 主要是 i18n 国际化，需要扩展为桌面端 + Web 的共享层：

```
packages/shared/
├── i18n/             → 现有：国际化（保留不动）
├── components/       → 新增：共享 UI 组件
│   ├── skill/
│   │   ├── SkillCard.tsx        → 技能卡片
│   │   ├── SkillList.tsx        → 技能列表
│   │   ├── SkillDetail.tsx      → 技能详情
│   │   └── SkillSearchBar.tsx   → 搜索栏
│   ├── pricing/
│   │   ├── PricingTable.tsx     → 定价表
│   │   └── PlanBadge.tsx        → 套餐标签
│   └── auth/
│       ├── LoginForm.tsx        → 登录表单
│       └── OAuthButtons.tsx     → OAuth 登录按钮组
├── types/            → 新增：共享 TypeScript 类型
│   ├── skill.ts                 → Skill, SkillVersion, SkillCategory
│   ├── subscription.ts          → Plan, Subscription, UsageQuota
│   ├── payment.ts               → PaymentOrder, PaymentStatus
│   └── user.ts                  → User, AuthState
├── api/              → 新增：共享 API 客户端
│   ├── client.ts                → HTTP 客户端封装（axios/fetch）
│   ├── skill.ts                 → 技能相关 API
│   ├── subscription.ts          → 订阅相关 API
│   ├── payment.ts               → 支付相关 API
│   └── auth.ts                  → 认证相关 API
├── hooks/            → 新增：共享 React Hooks
│   ├── useSkill.ts              → 技能数据 hook
│   ├── useSubscription.ts       → 订阅状态 hook
│   └── useAuth.ts               → 认证状态 hook
├── stores/           → 新增：共享状态管理
│   ├── authStore.ts             → 认证状态
│   └── subscriptionStore.ts     → 订阅状态
└── utils/            → 新增：工具函数
    ├── format.ts                → 格式化（价格、用量等）
    └── constants.ts             → 常量定义
```

### 3.4 构建体系升级

**根目录新增 `Makefile`**：

```makefile
.PHONY: all backend frontend web dev clean

# 全量构建
all: backend frontend

# Go 后端构建
backend:
	cd backend && go build -o ../bin/mclaw-server ./cmd/

# 桌面端构建
frontend:
	pnpm build

# SkillHub Web 构建
web:
	cd apps/web && pnpm build

# 开发模式（后端 + 前端同时启动）
dev:
	@echo "Starting backend..."
	@cd backend && go run ./cmd/ &
	@echo "Starting frontend..."
	@pnpm dev

# 清理
clean:
	rm -rf bin/
	rm -rf dist/
	rm -rf apps/web/dist/
	cd backend && go clean
```

**`pnpm-workspace.yaml` 更新**：

```yaml
packages:
  - '.'
  - 'apps/web'
  - 'harness'
```

---

## 四、实施步骤

### 阶段 1：Go 后端迁入（1-2 天）

1. 将 MonkeyCode `backend/` 整体复制到 `mclaw/backend/`
2. 修改 `go.mod` module 路径：`github.com/chaitin/MonkeyCode/backend` → `github.com/mclaw/backend`
3. 调整配置文件（`config/`），适配 mclaw 的部署环境
4. 确保 `go build` 编译通过
5. 暂不启用的模块（host/vmidle/git/gitbot）保留代码，后续用 build tag 控制

### 阶段 2：SkillHub Web 前端搭建（3-5 天）

1. 在 `apps/web/` 初始化 Vite + React + Tailwind 项目
2. 配置与桌面端一致的技术栈（shadcn 风格、i18next、zustand）
3. 搭建基础页面框架：首页、技能市场、技能详情、定价、登录
4. 通过 `packages/shared/api/` 对接 Go 后端

### 阶段 3：packages/shared 扩展（2-3 天）

1. 新增 `packages/shared/components/`：SkillHub 共享组件
2. 新增 `packages/shared/types/`：TypeScript 类型定义
3. 新增 `packages/shared/api/`：Go 后端 API 客户端
4. 桌面端 `src/pages/Skills/` 改为引用 shared 组件

### 阶段 4：计费模块开发（1-2 周）

1. 改造 `backend/biz/subscription/`：从空壳变真实会员订阅
2. 新增 `backend/biz/payment/`：支付模块（微信支付 V3）
3. 新增 Ent Schema：Plan、UserSubscription、PaymentOrder
4. ClickHouse 用量统计接入额度扣减逻辑
5. 前端定价页 + 支付流程

### 阶段 5：SkillHub 技能市场开发（1-2 周）

1. 新增 `backend/biz/skill/`：技能 CRUD + 版本管理 + 审核
2. 扩展 MCP Hub 配置，关联 Skill 数据
3. 前端技能发布/搜索/安装/评分页面
4. 桌面端技能管理集成

---

## 五、技术风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| Go module 路径变更导致编译失败 | 阶段 1 | 全局替换 module 路径，逐模块验证编译 |
| samber/do 依赖注入循环引用 | 阶段 1 | 暂时保留全部模块注册，不强行拆分 |
| 桌面端与 Web 端组件样式不一致 | 阶段 2-3 | 统一使用 packages/shared 的设计 token |
| 微信支付 V3 对接复杂度 | 阶段 4 | Go 有官方 wechatpay-go SDK，参考 Java 后端现有实现 |
| SkillHub Web 与桌面端功能不同步 | 阶段 5 | 核心逻辑放 packages/shared，两端只写页面壳 |

---

## 六、与 MonkeyCode 上游的关系

Go 后端从 MonkeyCode fork 迁入，后续需要考虑上游同步策略：

| 策略 | 说明 |
|------|------|
| **独立发展** | 迁入后不再同步上游，完全自主演进 |
| **选择性同步** | MonkeyCode 有重要更新时，cherry-pick 到 mclaw |
| **贡献回流** | mclaw 的新模块（payment/skill）贡献回 MonkeyCode |

建议初期采用**选择性同步**，等 mclaw 的计费和 SkillHub 稳定后再考虑贡献回流。
