# QClaw vs ClawX vs WorkBuddy — 技术架构深度对比

> 调研时间：2026-06-09 | 核心结论：三者都是 OpenClaw 的壳，但封装深度和架构完全不同

---

## 一、基本信息

| 维度 | ClawX | QClaw | WorkBuddy |
|------|-------|-------|-----------|
| **出品方** | ValueCell 团队 | 个人开发者（qiuzhi2046） | 腾讯/CodeBuddy 团队 |
| **⭐ Stars** | 7,393 | 2,788 | 无独立仓库 |
| **许可证** | MIT | Apache-2.0 | 闭源 |
| **状态** | ✅ 活跃更新 | ❌ 已停更 | ✅ 活跃更新 |
| **开源** | ✅ 完全开源 | ✅ 完全开源 | ❌ 仅 Skills/Harness 开源 |
| **定位** | OpenClaw 官方级桌面客户端 | 小白友好的轻量客户端 | 企业级 AI Agent 助手 |

---

## 二、技术栈对比

| 维度 | ClawX | QClaw | WorkBuddy |
|------|-------|-------|-----------|
| **前端框架** | React 19 | React 18 | 闭源（疑似 React） |
| **UI 组件库** | Radix UI + Tailwind CSS | **Mantine UI** + Tailwind CSS | 闭源 |
| **桌面框架** | Electron 40+ | Electron 33 | Electron（app.asar） |
| **构建工具** | Vite 7+ | Vite 5 | 闭源 |
| **状态管理** | Zustand | React State | 闭源 |
| **包管理** | pnpm（monorepo） | npm（单体） | 闭源 |
| **国际化** | react-i18next（4语言） | ❌ 仅中文 | ✅ 中文 |
| **TypeScript** | ✅ 严格模式 | ✅ | ✅（Skill 层面） |
| **测试** | Vitest + Playwright | Vitest | 闭源 |

---

## 三、架构深度对比 — 核心差异

### 1. OpenClaw 封装方式

| 维度 | ClawX | QClaw | WorkBuddy |
|------|-------|-------|-----------|
| **封装深度** | 🟢 **深度封装** | 🟡 中度封装 | 🟢 深度封装（闭源） |
| **Gateway 管理** | 自己管生命周期（进程启动/监控/重启/降级） | 自己管生命周期 | 自己管 |
| **通信协议** | JSON-RPC 2.0 over WebSocket | JSON-RPC 2.0 over WebSocket | buddyAPI over CDP |
| **CLI 交互** | `child_process.spawn` 启动 OpenClaw Gateway | `child_process.spawn` 启动 OpenClaw Gateway | 内置 |
| **配置管理** | 完整的 config-sync/env-write 体系 | 基础配置 | 闭源 |
| **进程监控** | 连接监控/重启策略/背压控制/Supervisor | 基础 | 闭源 |

### 2. Gateway 管理架构（最关键的差异）

**ClawX** — 最完善的企业级管理：
```
electron/gateway/
├── manager.ts              # Gateway 进程管理器
├── process-launcher.ts     # OpenClaw Gateway 启动器（spawn 子进程）
├── ws-client.ts            # WebSocket 客户端（JSON-RPC 2.0）
├── protocol.ts             # JSON-RPC 协议定义
├── lifecycle-controller.ts # 生命周期控制
├── connection-monitor.ts   # 连接监控
├── restart-controller.ts   # 重启控制
├── restart-governor.ts     # 重启策略（防抖/退避）
├── startup-orchestrator.ts # 启动编排
├── startup-recovery.ts     # 启动恢复
├── supervisor.ts           # 进程守护
├── capability-monitor.ts   # 能力降级监控
├── rpc-backpressure.ts     # RPC 背压控制
└── config-sync.ts          # 配置双向同步
```

**QClaw** — 够用但简化：
```
electron/main/
├── openclaw-gateway-service.ts    # Gateway 服务
├── openclaw-gateway-runtime.ts    # Gateway 运行时
├── openclaw-gateway-probes.ts     # 健康探测
├── gateway-lifecycle-controller.ts # 生命周期
├── gateway-secret-apply.ts        # 密钥应用
└── openclaw-spawn.ts              # 进程启动
```

**WorkBuddy** — 闭源，通过 CDP 端口 9333 暴露 buddyAPI：
```
WorkBuddy Desktop（闭源 Electron）
    └── CDP 端口 9333
        └── buddyAPI shim
            └── WebSocket → OpenClaw Gateway
```

### 3. 功能覆盖度

| 功能 | ClawX | QClaw | WorkBuddy |
|------|-------|-------|-----------|
| **聊天** | ✅ 多会话 + @agent 路由 | ✅ 基础聊天 | ✅ |
| **Skills** | ✅ 本地扫描 + 市场浏览 | ✅ Skills 页面 | ✅ 53+ Skills |
| **Channels** | ✅ 微信/钉钉/飞书/QQ/WhatsApp | ✅ 微信/飞书/钉钉 | ✅ 微信 |
| **Cron 定时** | ✅ 完整 Cron 管理 | ❌ | ⚠️ 通过 Harness |
| **Dreams** | ✅ 梦境/记忆回顾 | ❌ | ❌ |
| **模型管理** | ✅ 多 Provider + 用量统计 | ✅ 模型中心 | ✅ |
| **图片生成** | ✅ 内置 | ❌ | ✅（Skill） |
| **Agent 管理** | ✅ 多 Agent | ✅ 基础 | ✅ Agent 管理器 |
| **更新机制** | ✅ 自动更新 | ✅ 自动更新 | ✅ |
| **Web 版** | ✅ apps/web（Nexu） | ❌ | ✅ codebuddy.cn |
| **管理后台** | ✅ 设置页 | ✅ 设置页 | ✅ |

### 4. 特色能力

| 特色 | ClawX | QClaw | WorkBuddy |
|------|-------|-------|-----------|
| **Dreams 梦境** | ✅ 独有 | ❌ | ❌ |
| **Gateway 降级** | ✅ 能力降级→部分功能不可用提示 | ❌ | ❌ |
| **微信内置** | ✅ 内置腾讯个人微信插件 | ✅ 微信绑定 | ✅ 微信 |
| **Setup 向导** | ✅ 引导式首次设置 | ✅ 环境自检 | ✅ |
| **Doctor 诊断** | ✅ 内置 OpenClaw Doctor | ❌ | ❌ |
| **Skill 市场** | ✅ ClawHub | ❌ | ❌ |
| **多语言** | ✅ 中/英/日/俄 | ❌ 仅中文 | ❌ |
| **九维 Harness** | ❌ | ❌ | ✅ 独有（11插件+22 Hooks） |
| **Skill 语义路由** | ❌ | ❌ | ✅ 独有（触发词自进化） |
| **Web 版** | ✅ Nexu | ❌ | ✅ codebuddy.cn |
| **移动端** | ❌ | ❌ | ❌ |

---

## 四、封装层次图

```
┌─────────────────────────────────────────────────────┐
│                     用户界面                          │
├──────────────┬──────────────┬───────────────────────┤
│   ClawX UI   │  QClaw UI    │   WorkBuddy UI        │
│  Radix+Tail  │ Mantine+Tail │    闭源               │
├──────────────┴──────────────┴───────────────────────┤
│                  IPC / 通信层                         │
├──────────────┬──────────────┬───────────────────────┤
│ JSON-RPC 2.0 │ JSON-RPC 2.0 │  buddyAPI over CDP    │
│  WebSocket   │  WebSocket   │   WebSocket            │
├──────────────┴──────────────┴───────────────────────┤
│              Electron 主进程                          │
├──────────────┬──────────────┬───────────────────────┤
│ GatewayMgr   │ GatewaySvc   │  闭源 Gateway          │
│ +Supervisor  │ +Spawn       │  +CDP Server           │
│ +Recovery    │              │  +buddyAPI             │
│ +Backpressure│              │                        │
│ +ConfigSync  │              │                        │
├──────────────┴──────────────┴───────────────────────┤
│              OpenClaw Gateway（共享引擎）              │
│              ws://localhost:18789                     │
├─────────────────────────────────────────────────────┤
│              OpenClaw CLI / Runtime                   │
│              Skills / Plugins / MCP                   │
└─────────────────────────────────────────────────────┘
```

---

## 五、老王的结论

### ClawX — 最值得基于它做二次开发

| 优势 | 说明 |
|------|------|
| ✅ **架构最完善** | Gateway 管理、进程守护、背压控制、配置同步，企业级水平 |
| ✅ **MIT 许可** | 商业零风险 |
| ✅ **活跃更新** | 跟随 OpenClaw 高频更新 |
| ✅ **功能最全** | Dreams/Cron/ClawHub/Doctor，独有能力最多 |
| ✅ **代码规范** | TypeScript 严格模式，完整测试覆盖 |
| ❌ **UI 不够精致** | 这是你要解决的问题 |
| ❌ **无 Web 版** | Nexu 分支有但不在主线 |

### QClaw — 值得参考 UI 设计

| 优势 | 说明 |
|------|------|
| ✅ **Mantine UI 更精致** | 比 Radix 好看 |
| ✅ **小白友好** | 环境自检、引导式配置 |
| ❌ **已停更** | 跟不上 OpenClaw 更新节奏 |
| ❌ **架构简单** | Gateway 管理粗糙，无降级/恢复机制 |
| ❌ **仅中文** | 无国际化 |

### WorkBuddy — 值得参考 Harness 和 Skill 体系

| 优势 | 说明 |
|------|------|
| ✅ **九维 Harness** | Agent 基础设施框架，设计思路超前 |
| ✅ **Skill 语义路由** | 触发词自进化，比 ClawX 的 Skills 更智能 |
| ✅ **有 Web 版** | codebuddy.cn 可用 |
| ❌ **闭源** | 桌面客户端无法二次开发 |
| ❌ **CDP 通信** | 非标准协议，扩展性差 |

### 🎯 建议方案

**继续基于 ClawX（mclaw），吸收 QClaw 和 WorkBuddy 的精华：**

1. **从 QClaw 吸收**：Mantine UI 组件库 + 引导式 Setup 流程
2. **从 WorkBuddy 吸收**：九维 Harness 思路 + Skill 语义路由 + Web 版方案
3. **ClawX 自己的优势保持**：Gateway 企业级管理 + MIT 许可 + 全功能

最终产品 = ClawX 架构 + QClaw 界面 + WorkBuddy 智能Skill体系 + 你自己的品牌化
