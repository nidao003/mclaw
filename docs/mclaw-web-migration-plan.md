# mclaw (ClawX) Web 化迁移方案

> 创建日期: 2026-06-09
> 状态: 草案 - 备选方案
> 注意: 此方案假设继续使用 mclaw 代码库，如果决定迁移到 nexu，此方案仅作技术参考

---

## 背景

mclaw 当前是 Electron 桌面应用，需要增加 Web 版本：
- 功能与桌面版完全一致
- 对话和数据保留在服务器上
- 其他行为不变

## 架构分析

### 当前架构

```
React 前端 (浏览器) ← IPC → Electron Main (Node.js) ← WebSocket → OpenClaw Gateway
```

### 前端抽象层分析

mclaw 前端有良好的抽象层，Web 化改造侵入性较小：

**API 调用层** (`src/lib/host-api-client.ts`):
```typescript
// 所有 API 调用都走这一个函数
export async function invokeHost(module, action, ...payloadArgs) {
  const bridge = window.clawx?.hostInvoke;  // ← 唯一 Electron 依赖
}
```

**事件监听层** (`src/lib/host-events.ts`):
```typescript
// 所有事件监听都走这一个函数
function onIpc(channel, handler) {
  const ipc = window.electron?.ipcRenderer;  // ← 唯一 Electron 依赖
}
```

**Electron 直接调用** (分散在 ~10 个文件中):
- `window.electron.platform` - 平台检测
- `window.electron.openExternal(url)` - 打开外部链接
- `window.electron.getPathForFile(file)` - 文件拖拽路径
- `window.electron.isDev` - 开发模式检测

## 目标架构

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器 (Web 版)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │          React 前端 (复用 ~90%)                     │  │
│  │  - 页面组件: Chat/Agents/Channels/Skills/...      │  │
│  │  - Zustand Store: chat/gateway/settings/...       │  │
│  │  - lib/host-api.ts (不动)                          │  │
│  │  - lib/host-api-client.ts → 改造成 fetch/WS        │  │
│  │  - lib/host-events.ts → 改造成 WS 事件             │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │ HTTP REST + WebSocket               │
└─────────────────────┼────────────────────────────────────┘
                      │
┌─────────────────────┼────────────────────────────────────┐
│              服务器 (新建 Web 后端)                        │
│  ┌──────────────────┴────────────────────────────────┐  │
│  │         Web Backend (Node.js/TypeScript)            │  │
│  │  - HTTP API: 对接 shared/host-api/contract.ts      │  │
│  │  - WebSocket: 对接 shared/host-events/contract.ts  │  │
│  │  - 复用 electron/services/*-api.ts 的业务逻辑      │  │
│  │  - 会话管理 (JWT Token)                            │  │
│  │  - 数据持久化 (SQLite/PostgreSQL)                  │  │
│  │  - Gateway 进程管理 (简化版)                       │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │ WebSocket (JSON-RPC 2.0)           │
│  ┌──────────────────┴────────────────────────────────┐  │
│  │         OpenClaw Gateway (不变)                     │  │
│  │  - AI Agent 运行时                                  │  │
│  │  - 消息通道管理                                     │  │
│  │  - 技能/插件执行                                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 改造清单

### 前端改造 (~20 个文件)

| 改造项 | 文件 | 改动描述 |
|-------|------|---------|
| API 传输层 | `src/lib/host-api-client.ts` | `window.clawx.hostInvoke` → WebTransport (fetch/WS) |
| 事件传输层 | `src/lib/host-events.ts` | `window.electron.ipcRenderer` → WebSocket events |
| 平台检测 | 全局搜索替换 | `window.electron.platform` → `navigator.platform` |
| 外部链接 | 全局搜索替换 | `window.electron.openExternal` → `window.open(url, '_blank')` |
| 文件拖拽 | `src/lib/collect-dropped-files.ts` | → 上传到服务器 + 返回路径 |
| 窗口控制 | 各组件 | 移除 minimize/maximize/close 调用 |
| 开发模式 | 各组件 | `window.electron.isDev` → `import.meta.env.DEV` |
| 环境适配 | `electron.d.ts` | 新增 Web 版类型声明 |

### Web 后端 (全新项目)

```
mclaw-web-server/
├── package.json
├── src/
│   ├── index.ts            # HTTP + WS 服务入口
│   ├── host-api/           # 复用 shared/host-api/contract.ts
│   │   ├── router.ts       # API 路由注册
│   │   ├── gateway-api.ts
│   │   ├── channels-api.ts
│   │   ├── agents-api.ts
│   │   ├── chat-api.ts
│   │   ├── cron-api.ts
│   │   ├── skills-api.ts
│   │   ├── providers-api.ts
│   │   ├── sessions-api.ts
│   │   ├── files-api.ts
│   │   └── settings-api.ts
│   ├── gateway/            # Gateway 进程管理
│   │   ├── manager.ts
│   │   ├── ws-client.ts
│   │   └── config-sync.ts
│   ├── events/             # WebSocket 事件系统
│   │   └── dispatcher.ts
│   ├── store/              # 数据持久化
│   │   └── db.ts
│   └── auth/               # 会话认证
│       └── session.ts
```

### 可复用代码清单

| 源路径 | 复用方式 |
|-------|---------|
| `shared/host-api/contract.ts` | 类型定义，零修改 |
| `shared/host-events/contract.ts` | 事件契约，零修改 |
| `shared/types/*.ts` | 领域类型，零修改 |
| `shared/i18n/` | 国际化资源，零修改 |
| `electron/services/*-api.ts` | 业务逻辑参考，需去 Electron 依赖 |
| `electron/gateway/ws-client.ts` | WebSocket 客户端，基本可复用 |
| `electron/gateway/protocol.ts` | JSON-RPC 解析，完全可复用 |
| `electron/gateway/config-sync.ts` | 配置同步，去依赖后可用 |
| `src/pages/` | 所有页面组件，基本不动 |
| `src/stores/` | 所有 Zustand stores，基本不动 |
| `src/components/` | 所有 UI 组件，基本不动 |

## 工作量估算

| 阶段 | 内容 | 预估 |
|------|------|------|
| 1. 前端适配层 | 改造 API/事件传输层 + platform 检测 | 1-2 天 |
| 2. Web 后端搭建 | HTTP API + WebSocket + 会话管理 | 2-3 天 |
| 3. 业务逻辑迁移 | 20+ Service API 去 Electron 化 | 2-3 天 |
| 4. Gateway 集成 | Gateway 进程管理 + WS + 事件桥接 | 1-2 天 |
| 5. 数据持久化 | SQLite + 迁移脚本 | 1 天 |
| 6. 部署 + Docker | Dockerfile + docker-compose + Nginx | 1 天 |
| 7. 测试 + 联调 | E2E 测试 + 功能验证 | 2-3 天 |

**总计: 10-15 天 (一人全职)**

## 风险与注意事项

1. **文件系统依赖**: mclaw 桌面版大量使用本地文件系统，Web 版需全部改为服务器文件存储
2. **Gateway 进程管理**: 单机模式下 Gateway 作为子进程管理，多用户环境下需要重新设计
3. **WebSocket 连接**: 替换 IPC 后需要处理断线重连、心跳等
4. **安全性**: Web 版需要认证/授权、CSRF 防护、速率限制等
5. **CORS**: 前端和后端分离部署需要处理跨域问题

---

> ⚠️ **重要更新 (2026-06-09)**: 此方案的前提是继续使用 mclaw 代码库。在评估了 nexu 项目后，更推荐的方案是直接迁移到 nexu。详见主对话中的对比分析。
