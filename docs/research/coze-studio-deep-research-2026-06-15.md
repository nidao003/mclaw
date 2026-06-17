# Coze Studio 深度技术调研报告

> 日期: 2026-06-15
> 作者: 部署工程师
> 状态: 深度调研完成
> 前置文档: [mclaw-vs-nexu-research.md](./mclaw-vs-nexu-research.md), [research/ai-agent-platform-research-v2-2026-06-09.md](./research/ai-agent-platform-research-v2-2026-06-09.md)

---

## 1. 调研背景

在前期调研中，我们完成了两轮评估：

1. **mclaw vs nexu** → 推荐迁移到 nexu
2. **AI 生态型助手平台横向对比** → 推荐方案调整为 **Coze Studio + Electron 加壳**

最终决策：放弃 nexu，选择 **Coze Studio (coze-dev/coze-studio)** 作为 mclaw 的下一代平台底座。已建立 `coze-main` 分支镜像同步机制。

---

## 2. Coze Studio 项目全景

### 2.1 基本信息

| 项目 | 值 |
|------|-----|
| 仓库 | github.com/coze-dev/coze-studio |
| 出品方 | 字节跳动 |
| 许可证 | **Apache 2.0** ✅ 商业友好 |
| 最新版本 | v0.5.1 (2025-02) |
| 后端语言 | Go 1.24 |
| 前端框架 | React 18 + TypeScript + Semi Design + Tailwind CSS |
| 最低部署 | 2 Core / 4 GB RAM |
| 代码规模 | 前端 13,597 文件 / 后端 1,185 文件 |

### 2.2 Docker 部署架构

Coze Studio 完整部署需要 **10 个 Docker 服务**：

| 服务 | 镜像 | 用途 |
|------|------|------|
| **coze-server** | 自建 | Go 后端主服务 (Hertz, 端口 8888) |
| **coze-web** | 自建 | Nginx 托管前端静态资源 |
| **mysql** | mysql:8.4.5 | 主数据库 |
| **redis** | bitnamilegacy/redis:8.0 | 缓存 + Session |
| **elasticsearch** | bitnamilegacy/elasticsearch:8.18.0 | 全文搜索 + 知识库检索 |
| **minio** | - | 对象存储 (S3 兼容) |
| **milvus** | - | 向量数据库 (知识库 Embedding) |
| **nsqd** | - | 消息队列 (事件总线) |
| **nsqlookupd** | - | NSQ 服务发现 |
| **nsqadmin** | - | NSQ 管理面板 |
| **etcd** | - | Milvus 依赖的 KV 存储 |

**替代方案**：
- 消息队列：NSQ / Kafka / RocketMQ / Pulsar / NATS（均支持）
- 向量数据库：Milvus / VikingDB / OceanBase
- 对象存储：MinIO / 火山引擎 TOS / AWS S3
- 数据库迁移：Atlas (声明式 schema 管理)

### 2.3 最低部署资源评估

| 环境 | CPU | 内存 | 磁盘 | 说明 |
|------|-----|------|------|------|
| 开发测试 | 2C | 4GB | 20GB | 官方最低配置 |
| 小团队生产 | 4C | 8GB | 100GB | MySQL + ES + Milvus 拆分 |
| 企业生产 | 8C+ | 16GB+ | 500GB+ | 全部中间件独立部署 |

---

## 3. 后端架构深度分析

### 3.1 DDD 分层架构

```
backend/
├── main.go                    # 入口：加载 .env → Init() → startHttpServer()
├── api/                       # 接口层 (HTTP Handler + Router)
│   ├── handler/coze/          # 20+ Handler (按业务域划分)
│   ├── middleware/             # 中间件 (Auth/CORS/Log/I18n/Session)
│   ├── router/coze/           # IDL 自动生成路由注册
│   └── model/                 # 请求/响应 DTO
├── application/               # 应用层 (编排 Domain 服务)
│   ├── app/                   # App/Project 应用服务
│   ├── connector/             # Connector 应用服务
│   ├── conversation/          # 对话应用服务 (含 AgentRun)
│   ├── knowledge/             # 知识库应用服务
│   ├── memory/                # 数据库/变量应用服务
│   ├── modelmgr/              # 模型管理应用服务
│   ├── openauth/              # OpenAPI 认证
│   ├── permission/            # 权限应用服务
│   ├── plugin/                # 插件应用服务
│   ├── prompt/                # Prompt 模板应用服务
│   ├── search/                # 搜索应用服务
│   ├── shortcutcmd/           # 快捷指令应用服务
│   ├── singleagent/           # 单 Agent 应用服务
│   ├── template/              # 模板应用服务
│   ├── upload/                # 上传应用服务
│   ├── user/                  # 用户应用服务
│   └── workflow/              # 工作流应用服务
├── domain/                    # 领域层 (核心业务逻辑)
│   ├── agent/                 # Agent 实体 + 仓储
│   ├── app/                   # App 实体
│   ├── connector/             # Connector (消息通道)
│   ├── conversation/          # 对话域
│   ├── datacopy/              # 数据复制
│   ├── knowledge/             # 知识库域
│   ├── memory/                # 记忆/数据库/变量
│   ├── openauth/              # API 认证
│   ├── permission/            # 权限域
│   ├── plugin/                # 插件域 (70 文件，最复杂)
│   ├── prompt/                # Prompt 域
│   ├── search/                # 搜索域
│   ├── shortcutcmd/           # 快捷指令
│   ├── template/              # 模板
│   ├── upload/                # 上传
│   ├── user/                  # 用户域
│   └── workflow/              # 工作流域
├── crossdomain/               # 跨域服务 (领域间协作)
│   ├── agent / agentrun       # Agent 跨域
│   ├── app / connector        # App / 通道跨域
│   ├── conversation / message # 对话跨域
│   ├── database / variables   # 数据库跨域
│   ├── knowledge / plugin     # 知识库/插件跨域
│   ├── permission / search    # 权限/搜索跨域
│   ├── upload / user          # 上传/用户跨域
│   ├── datacopy / workflow    # 数据复制/工作流跨域
│   └── (每个都有 impl/ 实现)
├── infra/                     # 基础设施层 (166 文件)
│   ├── cache/                 # Redis 缓存抽象
│   ├── checkpoint/            # 工作流检查点 (Redis/Memory)
│   ├── coderunner/            # Python 代码沙箱执行
│   ├── document/              # 文档处理 (OCR/Parser/NL2SQL/M2Q)
│   ├── eventbus/              # 事件总线 (NSQ 消费者)
│   ├── lark/                  # 飞书集成
│   ├── llm/                   # LLM 调用层 (Eino 框架)
│   ├── oss/                   # 对象存储 (MinIO/TOS/S3)
│   ├── search/                # 搜索引擎 (ES)
│   └── vectorstore/           # 向量数据库 (Milvus/VikingDB)
├── internal/                  # 内部工具 (mock/generate)
├── pkg/                       # 通用工具包
└── types/                     # 类型定义 (errno/consts)
```

### 3.2 服务初始化链路

`main.go` 的启动顺序严格分层：

```
1. loadEnv()          → 加载 .env 配置
2. application.Init() → 三阶段初始化
   ├── initBasicServices()    → 基础服务 (User/Model/Connector/Prompt/Template/Upload/OpenAuth/Permission)
   ├── initPrimaryServices()  → 核心服务 (Plugin/Memory/Knowledge/Workflow/ShortcutCmd)
   └── initComplexServices()  → 复合服务 (SingleAgent/App/Search/Conversation)
3. startHttpServer()  → Hertz HTTP 服务 + 中间件链
```

**中间件链** (按顺序)：
1. ContextCacheMW — 请求级缓存
2. RequestInspectorMW — 请求检查
3. SetHostMW — 设置 Host
4. SetLogIDMW — 日志 ID
5. CORS — 跨域 (AllowAllOrigins)
6. AccessLogMW — 访问日志
7. OpenapiAuthMW — OpenAPI 认证
8. SessionAuthMW — Session 认证
9. I18nMW — 国际化

### 3.3 API 路由全景

后端暴露三大类 API：

| 路由前缀 | 用途 | 说明 |
|----------|------|------|
| `/api/` | **主应用 API** | 前端 Web 界面使用 |
| `/open_api/` | **开放 API** | 知识库等外部接口 |
| `/v1/`, `/v3/` | **OpenAPI 标准** | 第三方集成 (对话/工作流/Bot/文件) |

关键 API 端点：
- `/api/bot/*` — Agent/Bot CRUD
- `/api/conversation/*` — 对话管理
- `/api/workflow_api/*` — 工作流运行
- `/api/knowledge/*` — 知识库管理
- `/api/marketplace/*` — 插件市场
- `/api/memory/*` — 数据库/变量
- `/api/passport/*` — 认证注册
- `/v1/chat/*`, `/v3/chat/*` — 标准对话 API

### 3.4 模型服务

Coze Studio 使用 [Eino](https://github.com/cloudwego/eino) 框架统一模型调用，支持：

| Provider | 类型 |
|----------|------|
| OpenAI | Chat + Embedding |
| 火山引擎 Ark | Chat + Embedding |
| DeepSeek | Chat |
| Ollama | Chat + Embedding |
| Qwen (通义) | Chat + Embedding |
| Gemini | Chat + Embedding |
| Claude | Chat |

配置方式：通过环境变量 `MODEL_PROTOCOL_0`, `MODEL_NAME_0` 等添加，支持多条目后缀递增。

---

## 4. 前端架构深度分析

### 4.1 Rush Monorepo 结构

Coze Studio 前端是一个 **Rush.js 管理的巨型 Monorepo**，包含 **239 个 package**，分为 4 层依赖：

```
Level 1 (基础层) — @coze-arch/*
  ├── eslint-config / ts-config / stylelint-config
  ├── i18n / logger / coze-design (Semi Design 封装)
  ├── bot-api / bot-hooks / bot-utils
  └── rsbuild-config / vitest-config

Level 2 (通用层) — @coze-common/* + @coze-foundation/*
  ├── chat-area / biz-components / prompt-kit
  ├── auth / account / layout / global
  ├── space-store / space-ui
  └── websocket-manager / uploader

Level 3 (业务域层) — @coze-agent-ide/* + @coze-workflow/* + @coze-studio/*
  ├── agent-ide: 48 个包 (prompt/plugin/chat/model/tool/workflow...)
  ├── workflow: 13 个包 (canvas/nodes/sdk/history/setters...)
  ├── studio: 17 个包 (stores/components/workspace/open-platform...)
  └── project-ide / data / devops / community / components

Level 4 (应用层) — @coze-studio/app
  └── apps/coze-studio: 主应用入口，仅 18 个文件
```

### 4.2 路由结构

```
/                           → 重定向到 /space
/sign                       → 登录/注册
/oauth/confirm              → OAuth 授权确认
/space                      → 工作空间布局
  /:space_id/develop        → 项目开发列表
  /:space_id/bot/:bot_id    → Agent IDE (编辑器)
  /:space_id/bot/:bot_id/publish → Agent 发布
  /:space_id/project-ide/:project_id/* → Project IDE
  /:space_id/library        → 资源库
  /:space_id/knowledge/:dataset_id → 知识库详情
  /:space_id/database/:table_id → 数据库详情
  /:space_id/plugin/:plugin_id → 插件编辑
/work_flow                  → 工作流编辑器
/search/:word               → 全局搜索
/explore                    → 探索
  /explore/plugin            → 插件商店
  /explore/template          → 模板商店
```

### 4.3 UI 组件库

| 组件 | 来源 | 说明 |
|------|------|------|
| **Semi Design** | `@coze-arch/coze-design` | 字节跳动 Semi Design 的封装 |
| **Tailwind CSS** | 内置 | 样式系统 |
| **FlowGram** | `@coze-workflow/*` | 字节跳动工作流编辑引擎 |
| **Chat SDK** | `@flow-platform/chat-app-sdk` | 可嵌入的聊天组件 |

### 4.4 关键前端能力

- **Agent IDE**：可视化 Agent 构建，支持 Prompt/Plugin/Workflow/Knowledge/Memory 配置
- **Workflow Canvas**：基于 FlowGram 的可视化工作流编辑器
- **Chat Debug**：Agent 实时调试面板
- **Plugin Store**：插件市场浏览/安装
- **Chat SDK**：可嵌入第三方的聊天 Widget (支持 iframe 和非 iframe 模式)
- **i18n**：多语言支持 (en/zh-CN/ja/ko)

---

## 5. MCP 支持现状

### 5.1 后端 MCP

发现 MCP 相关代码：

| 文件 | 状态 | 说明 |
|------|------|------|
| `backend/domain/plugin/service/tool/invocation_mcp.go` | **占位实现** | `return "", "", errors.New("mcp call not implemented")` |
| `backend/crossdomain/plugin/model/` | IDL 定义 | MCP 相关的类型定义 |
| `frontend/.../mcp_server.ts` | IDL 生成 | MCP Server 类型 |
| `frontend/.../mcp_tool.ts` | IDL 生成 | MCP Tool 类型 |

**结论**：Coze Studio **已有 MCP 的类型定义和框架预留**，但后端执行层还是占位实现（`not implemented`）。这意味着：
- MCP 协议的数据模型已设计好
- 实际的 MCP Server 调用逻辑需要自行实现
- 前端发布流程已有 MCP 配置 UI（Workflow → MCP 发布检查）

### 5.2 前端 MCP

| 组件 | 文件 | 功能 |
|------|------|------|
| MCP 配置弹窗 | `use-mcp-config-modal.tsx` | Agent 发布时选择 MCP 关联的 Workflow |
| MCP 配置按钮 | `mcp-config-btn.tsx` | 触发 MCP 配置弹窗 |
| MCP 发布检查 | `CheckType.MCPPublish` | 发布前校验 Workflow 是否满足 MCP 要求 |

**结论**：前端 MCP UI 已就绪，支持将 Workflow 发布为 MCP Server 的配置流程。

---

## 6. mclaw vs Coze Studio 功能对比

### 6.1 核心功能差距

| 功能 | mclaw | Coze Studio | 差距分析 |
|------|-------|-------------|---------|
| **对话** | ✅ 单 Agent 对话 | ✅ 多模式对话 (Agent/App/Workflow) | Coze 更强 |
| **Agent 管理** | ✅ 列表 + 配置 | ✅ 可视化 IDE 构建 | Coze 远超 |
| **工作流** | ❌ 无 | ✅ FlowGram 可视化编辑器 | Coze 独有 |
| **知识库** | ❌ 无 | ✅ RAG + 向量检索 + 文档解析 | Coze 独有 |
| **插件系统** | ✅ OpenClaw Skills | ✅ 插件市场 + OAuth + 自定义 | Coze 更强 |
| **MCP** | ✅ OpenClaw MCP 原生 | ⚠️ 框架预留，执行未实现 | 需补充 |
| **消息通道** | ✅ 微信/飞书/钉钉/QQ/Telegram/WhatsApp | ✅ Connector 概念，发布到多渠道 | 模式不同 |
| **Cron 定时任务** | ✅ | ❌ 无 | 需自行开发 |
| **Dreams** | ✅ | ❌ 无 | mclaw 特色功能 |
| **桌面客户端** | ✅ Electron | ❌ 仅 Web | 需加壳 |
| **模型管理** | ✅ BYOK | ✅ 管理面板 + 多 Provider | Coze 更强 |
| **模板系统** | ❌ 无 | ✅ 模板商店 | Coze 独有 |
| **OpenAPI** | ❌ 有限 | ✅ 完整 v1/v3 API + Chat SDK | Coze 远超 |
| **用户/权限** | ✅ 基础 | ✅ 完整 (Space/角色/OAuth) | Coze 更强 |
| **国际化** | ✅ en/zh/ja/ru | ✅ en/zh-CN/ja/ko | 相当 |

### 6.2 mclaw 需保留的独特功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| **Cron 定时任务** | 中 | mclaw 的定时触发功能，Coze 无此概念 |
| **Dreams** | 低 | 实验性功能，可后续补充 |
| **OpenClaw 消息通道** | 高 | 微信/飞书/钉钉等国内通道的实时消息桥接 |
| **桌面系统集成** | 高 | 托盘/通知/Keychain/文件拖拽 |

---

## 7. 品牌化改造评估

### 7.1 需要修改的位置

| 类别 | 文件/位置 | 工作量 |
|------|----------|--------|
| **品牌名** | 前端 i18n 资源 + 后端配置 | 低 |
| **Logo/图标** | 前端 assets + favicon | 低 |
| **主题色** | Semi Design CSS 变量 + Tailwind 配置 | 中 |
| **登录页** | `LoginPage` 组件 | 低 |
| **侧边栏导航** | `GlobalLayout` + 菜单配置 | 中 |
| **域名/端口** | .env 配置 | 低 |
| **邮件模板** | 后端通知逻辑 | 低 |
| **Admin 面板** | `/admin` 路由下的配置页 | 中 |

### 7.2 品牌化风险

- **Semi Design 依赖**：Coze Studio 深度绑定 Semi Design (字节跳动组件库)，更换整套 UI 代价极高
- **Rush Monorepo**：239 个包的依赖关系复杂，修改需要理解 Rush 构建链
- **i18n**：大量文案分散在各包中，品牌文案需要批量替换

---

## 8. 桌面端 Electron 加壳方案

### 8.1 架构设计

```
┌─────────────────────────────────────────────┐
│           Electron 主进程                     │
│  ├── 窗口管理 (BrowserWindow)                │
│  ├── 系统托盘                                │
│  ├── 本地通知                                │
│  ├── Keychain 密钥存储                       │
│  └── 自动更新 (electron-updater)             │
│         │                                    │
│         │ BrowserWindow.loadURL()            │
│         ▼                                    │
│  ┌───────────────────────────────────────┐  │
│  │     Coze Studio Web (内嵌或远程)       │  │
│  │  http://localhost:8888                 │  │
│  │  或 file:// 本地静态资源               │  │
│  └───────────────────────────────────────┘  │
│         │                                    │
│         │ IPC Bridge (可选)                  │
│         ▼                                    │
│  ┌───────────────────────────────────────┐  │
│  │     Coze Studio Go 后端 (本地进程)     │  │
│  │  监听 127.0.0.1:8888                   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 8.2 两种部署模式

| 模式 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| **A. 本地全量** | Electron 内嵌 Go 后端 + MySQL + Redis | 离线可用，数据本地 | 安装包巨大 (500MB+)，资源消耗大 |
| **B. 远程服务** | Electron 仅加载远程 Web URL | 轻量安装 (50MB)，资源省 | 必须联网，依赖服务器 |

**推荐方案 B**：Electron 加载远程 Coze Studio URL，通过 `preload.js` 暴露桌面能力（托盘/通知/文件系统）。

### 8.3 preload.js 桥接设计

```typescript
// preload.ts — 暴露桌面能力给 Coze Studio Web
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  isDev: is.dev,
  // 系统托盘
  tray: { show, hide, setTooltip, onClick },
  // 本地通知
  notification: { send, onClick },
  // 文件系统
  fs: { openDialog, readFile, writeFile },
  // 自动更新
  updater: { check, download, install },
  // Keychain
  keychain: { get, set, delete },
});
```

---

## 9. 迁移路线图

### 阶段 0：验证（1-2 天）

- [ ] 在开发机 ([REDACTED]) 部署 Coze Studio Docker
- [ ] 配置模型 (MiniMax / OpenAI)
- [ ] 体验全部功能，记录问题
- [ ] 评估部署资源需求

### 阶段 1：基础部署（3-5 天）

- [ ] Fork coze-studio，创建 mclaw 品牌分支
- [ ] 定制品牌：名称/Logo/主题色
- [ ] 配置模型服务 (MiniMax 国内版)
- [ ] 配置 MinIO 对象存储
- [ ] 部署到测试服务器，Web 版可用

### 阶段 2：功能补齐（5-10 天）

- [ ] **MCP 执行层实现**：完成后端 `invocation_mcp.go` 的真实调用逻辑
- [ ] **消息通道适配**：将 OpenClaw 的微信/飞书/钉钉通道桥接到 Coze Connector
- [ ] **Cron 定时任务**：新增 domain/cron 模块
- [ ] **国内模型适配**：确保 MiniMax/Qwen/DeepSeek 等模型正确配置

### 阶段 3：桌面端加壳（5-7 天）

- [ ] 创建 Electron 项目 (mclaw-desktop)
- [ ] 实现 preload.js 桥接
- [ ] 系统托盘 + 通知 + 自动更新
- [ ] macOS .dmg + Windows .exe 打包
- [ ] 代码签名

### 阶段 4：数据迁移 + 上线（3-5 天）

- [ ] 用户数据迁移方案
- [ ] 从 mclaw 过渡到 Coze Studio 的用户引导
- [ ] 生产环境部署
- [ ] 监控 + 日志 + 告警

**总计：17-29 天（一人全职）**

---

## 10. 风险与缓解

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| **部署复杂度高** (10 个 Docker 服务) | 🔴 高 | 先用 `make web` 一键部署验证，再逐步拆分 |
| **Semi Design 深度绑定** | 🟡 中 | 保留 Semi Design，仅调整主题色和品牌元素 |
| **MCP 执行层未实现** | 🟡 中 | 已有框架，参考 Eino 的 MCP 协议实现 |
| **Rush Monorepo 学习曲线** | 🟡 中 | 仅改品牌层，避免深入包依赖 |
| **上游同步冲突** | 🟢 低 | 使用 coze-main 镜像分支 + cherry-pick 策略 |
| **国内模型兼容性** | 🟢 低 | Eino 已支持 Ark/Qwen/DeepSeek/Ollama |
| **安全风险** (官方警告) | 🔴 高 | 公网部署前必须做安全评估，关闭注册/加白名单 |

---

## 11. 下一步行动

### 立即行动

1. **部署验证**：在开发机 [REDACTED] 上执行 `make web`，验证 Coze Studio 完整功能
2. **品牌化 PoC**：修改主题色/Logo/名称，确认品牌化改造可行
3. **MCP 评估**：详细评估 `invocation_mcp.go` 的实现路径

### 中期目标

4. 完成 Fork + 品牌化分支
5. 完成 MCP 执行层实现
6. 完成 Electron 桌面端加壳

### 关键决策点

- [ ] **是否保留 mclaw 桌面端？** 还是全面切换到 Coze Studio Web + Electron？
- [ ] **消息通道策略**：继续用 OpenClaw Gateway 还是迁移到 Coze Connector？
- [ ] **数据迁移**：现有 mclaw 用户数据是否需要迁移？

---

## 附录：Coze Studio 版本历史

| 版本 | 日期 | 关键特性 |
|------|------|---------|
| v0.2.2 | 2024-08 | 开源初始版本 |
| v0.3.0 | 2024-09 | Chatflow + ChatSDK + ES 多节点 |
| v0.5.0 | 2024-10 | **插件商店 + 管理面板** |
| v0.5.1 | 2025-02 | NATS EventBus + 安全修复 |

> 注意：coze-main 分支当前 commit 为 `22275b1c2 fix(plugin): oauth phishing (#2668)`，比 v0.5.1 更新。
