# mclaw vs nexu 技术调研报告

> 日期: 2026-06-09
> 作者: 老王（部署工程师）
> 状态: 已完成

---

## 背景

mclaw (ClawX) 是当前 StationMatch 项目使用的桌面 AI 助手应用，基于 OpenClaw 运行时。团队计划开发 Web 版，需要评估两个方向：

1. 在 mclaw 基础上做 Web 化改造
2. 迁移到 nexu (nexu-io/nexu) 开源项目

本报告对两个项目进行全面的技术对比分析。

---

## 项目概况

### mclaw (ClawX)

- **仓库**: 私有分支，上游为 OpenClaw/ClawX
- **定位**: The Desktop Interface for OpenClaw AI Agents
- **架构**: Electron 双进程 (Main + Renderer) + OpenClaw Gateway
- **许可证**: 未知
- **社区**: 无公开社区

### nexu

- **仓库**: [github.com/nexu-io/nexu](https://github.com/nexu-io/nexu)
- **开发团队**: Refly 团队 (nexu-io)
- **定位**: The simplest desktop client for OpenClaw — bridge your Agent to WeChat, Feishu, Slack & Discord
- **Star**: 3,100+ | **Fork**: 249+
- **许可证**: **MIT**
- **官网**: [nexu.io](https://nexu.io) | **文档**: [docs.nexu.io](https://docs.nexu.io)

---

## 关键发现：两个项目基于同一个底层引擎

mclaw 和 nexu **都是 OpenClaw 的桌面客户端**，底层 AI Agent 运行时完全相同。区别在于上层架构设计、UI 实现和功能完善度。

两者都提供：
- 图形化界面管理 OpenClaw AI Agent
- 多消息通道连接（微信、飞书、Slack、Discord 等）
- AI 模型配置与切换
- 技能/插件系统
- 桌面客户端（macOS + Windows）

---

## 架构对比

### mclaw 架构

```
Electron Main 进程 (Node.js)
  - 窗口/应用生命周期
  - OpenClaw Gateway 进程管理
  - 系统集成（托盘/通知/Keychain）
  - Host API 注册中心 (host:invoke)
        │
        │ IPC (Electron 专有协议)
        │
React Renderer 进程 (浏览器)
  - UI 组件: Tailwind CSS + shadcn/ui
  - 状态管理: Zustand
  - API 调用: window.clawx.hostInvoke → IPC host:invoke
  - 事件监听: window.electron.ipcRenderer.on(channel)
        │
        │ 主进程代理
        │
OpenClaw Gateway (独立进程, port 18789)
  - AI Agent 运行时
  - 消息通道管理
  - 技能/插件执行
```

**核心问题**: Renderer 强依赖 Electron IPC 协议，无法直接在浏览器中运行。

### nexu 架构

```
浏览器 OR Electron 桌面壳
        │
        │ HTTP REST (Hono + Zod OpenAPI)
        │
apps/controller (Hono + lowdb)
  - 配置管理 (~/.nexu/config.json)
  - OpenClaw 配置编译器
  - 技能目录管理
  - 本地认证
        │
        │ 进程管理
        │
OpenClaw Runtime
  - AI Agent 运行时
  - 消息通道管理
```

**核心优势**: controller 暴露标准 REST API，前端通过 HTTP 通信。Web 和桌面共享同一套代码，架构天然支持 Web 部署。

### 架构差异总结

| 对比点 | mclaw | nexu |
|-------|-------|------|
| **前端-后端通信** | Electron IPC (私有协议) | HTTP REST (标准协议) |
| **后端实现** | Electron Main 进程 | Hono Controller (独立 Node 进程) |
| **Web 就绪** | ❌ 需大量改造 | ✅ 架构原生支持 |
| **API 类型安全** | 手写 TypeScript 类型 | Zod → OpenAPI → 自动生成 SDK |
| **配置管理** | electron-store | lowdb (~/.nexu/config.json) |
| **Gateway 管理** | Main 进程直接管理 | Controller 编排管理 |

---

## 功能对比

### 消息通道

| 通道 | mclaw | nexu |
|------|:---:|:---:|
| Discord | ✅ | ✅ |
| Telegram | ✅ | ❌ |
| 微信 (WeChat) | ✅ | ✅ |
| 企业微信 (WeCom) | ✅ | ✅ |
| 飞书 (Feishu/Lark) | ✅ | ✅ |
| 钉钉 (DingTalk) | ✅ | ✅ |
| QQ | ✅ | ✅ |
| WhatsApp | ✅ | ❌ |
| Slack | ❌ | ✅ |

**分析**: mclaw 多了 Telegram 和 WhatsApp，nexu 多了 Slack。整体覆盖度相当。

### AI 模型与 Provider

| 功能 | mclaw | nexu |
|------|:---:|:---:|
| 多 Provider 支持 | ✅ | ✅ |
| BYOK (自带 API Key) | ✅ | ✅ |
| OAuth 登录 | ❌ | ✅ MiniMax/Codex/GLM |
| 模型一键切换 | ✅ | ✅ GUI 下拉选择 |
| Provider 验证 | ✅ | ✅ |

### 技能系统

| 功能 | mclaw | nexu |
|------|:---:|:---:|
| 内置技能 | ✅ | ✅ 29+ |
| 技能市场 | ClawHub | nexu-skills 公开目录 |
| 远程同步 | ✅ | ✅ 自动同步 |
| 安装/卸载 | ✅ | ✅ |

### 自动化

| 功能 | mclaw | nexu |
|------|:---:|:---:|
| Cron 定时任务 | ✅ | ❌ (未确认) |
| Dreams 功能 | ✅ | ❌ (未确认) |

### UI/UX

| 对比点 | mclaw | nexu |
|-------|-------|------|
| **UI 框架** | Tailwind CSS + shadcn/ui | Tailwind CSS + Radix UI |
| **设计质量** | 一般（自称"丑"） | 优秀（"超高颜值"） |
| **组件库** | shadcn/ui (Radix 封装) | Radix UI + 自定义组件 |
| **状态管理** | Zustand | React Query (TanStack) |
| **Markdown 渲染** | 自研 | markdown-it |
| **设置向导** | ✅ | ✅ |
| **暗色模式** | ✅ | ✅ (next-themes) |
| **国际化** | en/zh/ja/ru | en/zh-CN/ja/ko |
| **响应式** | 桌面优先 | Web + 桌面 |

---

## 技术栈对比

| 层级 | mclaw | nexu |
|------|-------|------|
| **前端** | React 19 + Vite | React 19 + Vite |
| **UI** | Tailwind + shadcn/ui | Tailwind + Radix UI |
| **状态管理** | Zustand | TanStack React Query |
| **路由** | 自研 | React Router v7 |
| **后端** | Electron Main (Node.js) | Hono (Node.js) |
| **API 规范** | 无标准 | OpenAPI 3.0 (自动生成) |
| **数据校验** | 无 | Zod |
| **持久化** | electron-store | lowdb |
| **桌面壳** | Electron | Electron |
| **代码规范** | ESLint + Prettier | Biome |
| **测试** | Vitest + Playwright | Vitest + Playwright |
| **包管理** | pnpm | pnpm workspace |
| **Node.js** | 22+ | 24+ |
| **类型系统** | TypeScript strict | TypeScript strict |

---

## 代码质量对比

### 类型安全

**mclaw**: 手写类型定义在 `shared/host-api/contract.ts`，前后端分别手动维护类型一致性。

**nexu**: Zod schema 是唯一真相源，类型自动推导：

```
Zod Schema (定义一次)
  → API 路由验证 (@hono/zod-openapi)
  → OpenAPI spec (自动生成)
  → 前端 SDK 类型 (@hey-api/openapi-ts 自动生成)
  → 本地存储/运行时类型 (z.infer)
```

**结论**: nexu 的类型安全机制从根本上杜绝了前后端类型不一致的问题。

### 测试覆盖

两者都使用 Vitest + Playwright，测试文件数量相当。nexu 额外有 E2E spec 和 smoke tests。

### 项目结构

**mclaw** (单体结构):
```
mclaw/
├── electron/     # Main 进程 + Gateway + Services
├── src/          # Renderer 进程 (React)
├── shared/       # 共享类型
└── tests/
```

**nexu** (Monorepo):
```
nexu/
├── apps/
│   ├── web/          # React 前端
│   ├── desktop/      # Electron 桌面壳
│   └── controller/   # Hono 后端服务
├── packages/
│   └── shared/       # 共享 Zod schemas
├── nexu-skills/      # 公开技能仓库
├── specs/            # 设计文档
├── docs/             # 文档站
├── e2e/
└── tests/
```

---

## Web 化方案对比

### 方案 A: mclaw Web 化改造

**工作量**: 10-15 天（一人全职）

**改造内容**:
1. 前端适配层：替换 IPC 为 HTTP/WebSocket
2. 新建 Web 后端：替代 Electron Main 功能
3. 业务逻辑迁移：20+ Service API 去 Electron 化
4. Gateway 集成：进程管理 + WS + 事件桥接
5. 数据持久化
6. 部署 + Docker 化

**风险**:
- IPC → HTTP 改造可能引入未知 Bug
- 文件系统依赖需要全部重构
- 多用户场景下 Gateway 管理复杂
- 后续维护两套代码（桌面 + Web）

### 方案 B: 迁移到 nexu

**工作量**: 3-5 天

**迁移内容**:
1. Fork nexu 仓库
2. 定制品牌（名称/Logo/配色）
3. 部署 Web 版（controller + web 到服务器）
4. 评估是否需要保留桌面版
5. 添加 mclaw 独有功能（如有需要）

**优势**:
- Web 版现成可用
- 架构原生支持 Web + 桌面
- 类型安全全链路覆盖
- MIT 许可证，无法律风险
- 活跃社区支持

**风险**:
- 需要学习 nexu 的代码结构
- Cron/Dreams 等功能可能需要重新实现
- Telegram/WhatsApp 通道可能需要自行添加

---

## 最终结论

### 推荐方案：迁移到 nexu

**核心理由**:

1. **Web 版已有**: mclaw 需要 10-15 天从零造 Web 版，nexu 已经有了，直接用
2. **UI 更优秀**: nexu 的 UI 设计被社区称为"超高颜值"，远优于 mclaw 当前状态
3. **架构更先进**: Web 原生 + REST API + 全链路类型安全，mclaw 的 IPC 架构是桌面时代的遗产
4. **许可证更友好**: MIT vs 未知，商业使用无忧
5. **社区活跃**: 3100+ Star，有技术支持，Bug 修复快
6. **仍在探索阶段**: 既然还没正式开发，切换成本最低

### 为什么不是"搬 nexu 的 UI 到 mclaw"

两者 UI 框架不同（Radix UI vs shadcn/ui）、状态管理不同（React Query vs Zustand）、API 层不同（REST vs IPC），"搬 UI" 本质上是重写整个前端。与其在 mclaw 上做大手术，不如直接用 nexu 这个成品。

### 下一步行动建议

1. **立即**: Clone nexu，本地跑起来体验
2. **评估**: 确认功能是否满足需求，记录缺失功能
3. **决策**: 确认迁移 → Fork nexu → 定制品牌
4. **部署**: Controller + Web 部署到服务器 = Web 版上线
5. **补充**: 根据需要添加 Cron/Dreams/Telegram 等缺失功能

---

## 参考资料

- [nexu GitHub](https://github.com/nexu-io/nexu)
- [nexu 官网](https://nexu.io)
- [nexu 文档](https://docs.nexu.io)
- [mclaw Web 化迁移方案 (备用)](./mclaw-web-migration-plan.md)
- [OpenClaw 项目](https://github.com/OpenClaw)

---

> 📝 **变更记录**
> - 2026-06-09: 初始版本，完成 mclaw vs nexu 全面技术调研
