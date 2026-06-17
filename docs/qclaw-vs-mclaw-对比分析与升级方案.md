# mclaw vs QClaw 对比分析与升级方案

> 调研日期：2026-06-09
> 调研对象：当前系统上正在运行的 QClaw.app (v0.2.25) + mclaw 项目 (v0.4.9-alpha.0)
> 作者：老王（暴躁技术流）

---

## 一、QClaw 完整架构（扒出来的事实）

### 1.1 进程树（实际跑的）

```
QClaw.app (PID 51635, Electron 37.10.3 主进程)
├── QClaw Helper (Renderer)    PID 51657
├── QClaw Helper (GPU)         PID 51654
├── QClaw Helper (Network)     PID 51655
├── chrome_crashpad_handler    PID 51659 → 上报 https://galileotelemetry.tencent.com
└── openclaw-gateway           PID 51661 ← 关键子进程
```

- **`openclaw-gateway` 是独立子进程**（进程名固定）
- **cwd**：`/Users/daodao/Library/Application Support/QClaw/openclaw/node_modules/openclaw`
- **不是 `utilityProcess.fork`**，而是用**独立的 Node 二进制**直接跑 `openclaw.mjs`！

### 1.2 安装包结构

```
/Applications/QClaw.app/Contents/Resources/
├── app.asar                    137 MB  主应用代码
├── app.asar.unpacked/                   必须 unpack 的原生模块
├── hermes.tar.gz               120 MB  Hermes 引擎（腾讯自研 JS 运行时）
├── openclaw.tar.gz             165 MB  openclaw 全部代码打包 ⭐
├── hermes-plugins/                       Hermes 插件
├── node/node                   110 MB  ⭐ 独立 Node 22.16.0 二进制
├── scripts/
│   ├── pack-qclaw.cjs          14 KB   一键打包问题反馈
│   ├── unpack-openclaw.cjs      6 KB   Windows 解包 fallback
│   └── sqlite-snapshot-worker.cjs       SQLite 快照 worker
├── oauth-assets/                        微信 OAuth 资源
├── icon.icns, icons/
├── *.lproj (i18n)                       含 zh-Hans/zh-Hant/en/...
├── app-update.yml                      自动更新
└── channel.json                         渠道信息
```

### 1.3 ⭐ 运行时解包机制（核心创新点）

```
~/Library/Application Support/QClaw/
├── openclaw/                           ⭐ 首次启动解包后的运行时
│   ├── .last-boot-version              启动版本标记
│   ├── .tar-extracted-version          解包版本标记
│   ├── .pending-cleanup/               待清理目录
│   ├── dist/                           openclaw 编译后 dist
│   ├── config/
│   │   └── extensions/                 ⭐ 扩展目录（用户级）
│   │       ├── wechat-access/          （每个扩展都是独立 npm 包）
│   │       ├── lossless-claw/
│   │       ├── openclaw-qqbot/
│   │       └── ... 共 10 个内置扩展
│   ├── memory-fs/                      内存文件系统
│   ├── node_modules/openclaw/          ⭐ openclaw 主包（解出来的）
│   │   ├── openclaw.mjs                5KB 入口
│   │   ├── package.json                84KB
│   │   ├── CHANGELOG.md                1.2MB
│   │   ├── dist/                       1904 个文件
│   │   ├── skills/                     55 个内置 skills
│   │   └── scripts/  assets/  docs/
│   ├── package.json + package-lock.json
│   └── scripts/                        运行时辅助脚本
├── qclaw.db                            ⭐ SQLite (36KB) + WAL (593KB)
├── qclaw.db-shm / qclaw.db-wal
├── qclaw-plugin-config.json
├── app-store.json
├── translation-cache.json              28KB 翻译缓存
├── network-identity-cache.json
├── file-protection.json
├── electron-log-preload.js
├── npm-global/                         自带 npm 全局
├── runtime/                            runtime 目录
├── Crashpad/                           崩溃日志
└── ...（Electron 标准产物）

~/.qclaw/                               ⭐ 独立用户配置目录
├── qclaw.json                          ⭐ 指针文件（极简元数据）
├── openclaw.json                       完整配置
├── agents/main/agent/{models,auth-profiles}.json
├── skills/ (30+ 内置 skills)
├── skill-usage.json                    skill 使用统计
├── qmemory/                            记忆系统
├── flows/                              工作流
├── cron/                               定时任务
├── tasks/                              异步任务
├── backups/                            自动备份
├── sync/                               数据同步
├── plugins/                            插件数据
├── devices/                            设备配对
├── logs/                               日志
├── identity/                           设备身份
├── workspace/                          主 workspace
│   ├── AGENTS.md / HEARTBEAT.md / IDENTITY.md
│   ├── SOUL.md / TOOLS.md / USER.md
│   ├── MEMORY.md / .consolidate-state.json
│   ├── .openclaw/                      workspace 内嵌 openclaw 状态
│   ├── sessions/ / skills/
└── workspace-agent-*/                  多 workspace
```

### 1.4 ⭐ `qclaw.json` 指针文件（极简元数据）

```json
{
  "cli": {
    "nodeBinary": "/Applications/QClaw.app/Contents/Resources/node/node",
    "openclawMjs": ".../openclaw/node_modules/openclaw/openclaw.mjs",
    "pid": 51661
  },
  "stateDir": "/Users/daodao/.qclaw",
  "configPath": "/Users/daodao/.qclaw/openclaw.json",
  "port": 52522,                                 ⭐ 动态端口
  "platform": "darwin",
  "authGatewayBaseUrl": "http://127.0.0.1:19000/proxy",
  "sharedParams": {
    "guid": "afa8449...（32字节）",
    "appVersion": "0.2.25",
    "appChannel": "5001",                        ⭐ 渠道号
    "platform": "Qclaw_MAC_ARM",                 ⭐ 平台标识
    "sessionId": "76f8bf3c-..."
  }
}
```

### 1.5 ⭐ 扩展机制（每扩展独立 npm 包）

```
~/Library/Application Support/QClaw/openclaw/config/extensions/wechat-access/
├── index.js                           54KB 入口
├── openclaw.plugin.json               276B 插件清单
├── package.json                       1KB
├── package-lock.json                  6KB
└── node_modules/                      13 个子目录（独立依赖树）
```

**关键点**：每个扩展是**独立 npm 包**，自带 `node_modules/`（包括 .node 原生模块！）。
mclaw 当前的扩展是构建时 bundled 到 `extraResources`，**不支持运行时安装**。

### 1.6 ⭐ SQLite 数据库

```sql
-- qclaw_audit_log: 用户操作审计日志（合规用！）
CREATE TABLE qclaw_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  softid INTEGER,
  actiontype INTEGER NOT NULL,
  detail TEXT NOT NULL,
  risklevel INTEGER NOT NULL,
  result INTEGER NOT NULL,
  optpath TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- qclaw_config: K-V 配置（替代 electron-store）
CREATE TABLE qclaw_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string',
  description TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT 0
);
```

**核心**：mclaw 用 `electron-store` JSON 文件，QClaw 用 SQLite + WAL。

### 1.7 平台 SDK 与遥测

- **崩溃上报**：`https://galileotelemetry.tencent.com`（带 `guid`、CPU、内存、Electron 版本等）
- **认证代理**：`http://127.0.0.1:19000/proxy`（**额外内置 19000 端口做认证转发**）
- **平台标识**：`Qclaw_MAC_ARM` / `Qclaw_WIN_X64` / `Qclaw_LINUX_X64` 三套
- **channel.json** + **appChannel=5001** 走分渠道分发

---

## 二、mclaw vs QClaw 核心差异表

| 维度 | mclaw (0.4.9-alpha) | QClaw (0.2.25) | 差距 |
|------|---------------------|----------------|------|
| **openclaw 打包** | 构建时拍平到 `build/openclaw/` + `extraResources` | **运行时解包** `openclaw.tar.gz` → `~/App Support/.../openclaw/` | 🔴 巨大 |
| **Node 运行时** | Electron UtilityProcess 内嵌 | **独立 `node` 二进制** `Resources/node/node` v22.16.0 | 🔴 巨大 |
| **Gateway 启动** | `utilityProcess.fork(openclaw.mjs)` | `node openclaw.mjs` 独立进程名 `openclaw-gateway` | 🔴 巨大 |
| **端口** | 固定 `18790`（dev `18789`） | **动态分配**（实际 `52522`） | 🟡 中 |
| **指针文件** | 无 | **`~/.qclaw/qclaw.json`**（cli/pid/port/stateDir） | 🟡 中 |
| **存储** | `electron-store` JSON | **SQLite + WAL** + 审计日志表 | 🔴 大 |
| **扩展** | 构建时 bundled | **运行时独立 npm 包** + 独立 node_modules | 🔴 大 |
| **预装 skills** | 7 个 | 30+ 个 | 🟡 中 |
| **多 workspace** | 1 个 | 多个 `workspace-agent-*` | 🟢 小 |
| **审计日志** | 无 | `qclaw_audit_log` 表（合规要求！） | 🔴 大（合规） |
| **数据备份** | 无 | `backups/` + `sync/` | 🟢 小 |
| **工作流** | 无 | `flows/` | 🟢 小 |
| **Skill 使用统计** | 无 | `skill-usage.json` | 🟢 小 |
| **翻译缓存** | 无 | `translation-cache.json` (28KB) | 🟢 小 |
| **OAuth 资源** | 无 | `oauth-assets/` | 🟢 小 |
| **打包反馈脚本** | 无 | `pack-qclaw.cjs` 一键打 ZIP | 🟡 中 |
| **Hermes 引擎** | 无 | 自家 JS 引擎 + 插件 | ⚪ 不需要学 |
| **平台 SDK** | 无 | 腾讯 guid/appChannel/authGateway | ⚪ 不需要学 |
| **崩溃上报** | PostHog | galileotelemetry.tencent.com | 🟢 已有 |

---

## 三、mclaw 可借鉴的升级点（按优先级）

### 🔴 P0 - 架构级核心（强烈建议）

#### 1. 运行时解包 + 内置 Node 二进制
**现状**：mclaw 每次 openclaw 升级都要重新构建整个 app.asar（耗时 30+ 分钟）
**QClaw 做法**：
- openclaw 165MB tar.gz 放 Resources，**首次启动**解包到 `~/App Support/mclaw/openclaw/`
- 内置独立的 `node` 二进制到 `Resources/node/node` (110MB)
- **Gateway 用独立 Node 跑**而不是 utilityProcess

**收益**：
- openclaw 升级只发新 tar.gz，不需要重新打包 app
- 多用户共享同一份 openclaw 安装
- Gateway 与 Electron 主进程彻底解耦，崩了不影响 UI
- 进程名独立 `mclaw-gateway`，便于监控/CLI 操作

**改动量**：大。涉及打包脚本、启动逻辑、文件位置全部调整。

#### 2. `mclaw.json` 指针文件 + 动态端口
**现状**：mclaw 端口写死 18790，多实例直接冲突
**QClaw 做法**：
- 启动时检测空闲端口，写入 `~/.mclaw/mclaw.json`
- CLI 工具、监控工具、debug 工具读这个文件就知道怎么连

**收益**：
- 多实例运行不冲突
- 外部 CLI 工具（`mclaw status`、`mclaw logs`）能正确找到目标
- PID 文件便于进程管理

**改动量**：小。`electron/gateway/config-sync.ts` 改造即可。

#### 3. SQLite 存储层（替代 electron-store）
**现状**：mclaw 用 `electron-store` + 散落 JSON 文件（`openclaw.json` + `models.json` + `auth-profiles.json` + `auth-state.json` + `update-check.json`...）
**QClaw 做法**：
- `qclaw.db` 一个 SQLite 文件 + WAL
- 配 K-V 表（`qclaw_config`）+ 审计日志表（`qclaw_audit_log`）
- Node 22 内置 `node:sqlite` 模块可用

**收益**：
- 写入性能大幅提升（事务、WAL）
- 并发安全（多读单写）
- 自动备份简单（cp 一个文件）
- **国产合规**（审计日志）

**改动量**：中。新建 `electron/services/storage/sqlite-store.ts`，逐步迁移配置。

### 🟡 P1 - 存储与扩展

#### 4. 运行时可装扩展
**现状**：mclaw 扩展是构建时 bundled 到 `extraResources`（`@mclaw/discord`、`@mclaw/qqbot` 等）
**QClaw 做法**：
- `~/Library/Application Support/mclaw/openclaw/config/extensions/<ext-name>/`
- 每个扩展独立 `package.json` + `package-lock.json` + `node_modules/` + `openclaw.plugin.json`
- 10 个内置扩展：`wechat-access`、`dingtalk-connector`、`lossless-claw`、`openclaw-qqbot`...

**收益**：
- 用户可运行时安装/卸载扩展（**不需要重新构建 app**）
- 每个扩展的原生模块（.node）独立管理，ABI 不冲突
- 扩展市场的基础设施

**改动量**：大。需要：
- 扩展元数据规范（`openclaw.plugin.json` schema）
- 扩展加载器（启动时扫描 config/extensions/）
- 扩展管理 UI

#### 5. 审计日志（合规要求）
**现状**：mclaw 只在 `logs/` 写文本日志
**QClaw 做法**：`qclaw_audit_log` 表记录所有用户操作（actiontype/risklevel/result/optpath）

**关键审计项**：
- `risklevel: 0=low, 1=mid, 2=high` - 风险等级
- `result: 0=deny, 1=allow, 2=error` - 结果
- `optpath` - 操作路径（哪个 API）

**收益**：满足国产合规要求（数据出境、内容安全、可追溯）

**改动量**：中。在 `host-api` 层加审计中间件。

#### 6. 一键打包反馈脚本
**现状**：mclaw 没做
**QClaw 做法**：`pack-qclaw.cjs` 把 `~/.qclaw` + `~/Library/Logs/QClaw` + `~/.qclaw-hermes` 打成一个 ZIP 放桌面

**收益**：用户反馈问题超方便（"导出发给我"按钮）

**改动量**：小。复制 QClaw 的 `pack-qclaw.cjs` 改路径即可。

### 🟢 P2 - 体验与能力

#### 7. Skill 使用统计 `skill-usage.json`
记录哪个 skill 被调用多少次、最后调用时间、错误率。mclaw 没做。

#### 8. 多 workspace 隔离
`workspace-agent-*/` 多 workspace 切换。mclaw 只有 1 个。

#### 9. 自动备份 `backups/`
定期把 `openclaw.json`、workspace 备份到 `backups/`，支持回滚。

#### 10. 翻译缓存 `translation-cache.json`
运行时翻译结果缓存到本地，避免重复调用翻译服务。

#### 11. Flow 工作流 `flows/`
可视化工作流系统（mclaw 没有，可以借鉴 QClaw 但不强求）。

#### 12. OAuth 资源 `oauth-assets/`
内置微信/QQ 登录所需的 UI 资源（头像、二维码占位等）。mclaw 没做。

---

## 四、升级路线图（建议分 4 阶段）

### 阶段 1：基础架构对齐（1-2 周）
- [ ] 引入 `unpack-openclaw.cjs` 改造：openclaw.tar.gz 内置
- [ ] 首次启动解包机制：版本号对比 + 增量更新
- [ ] 内置 Node 22 二进制到 `resources/node/`
- [ ] Gateway 改用 `Resources/node/node openclaw.mjs` 启动
- [ ] 进程名改为独立 `mclaw-gateway`
- [ ] 动态端口分配 + `~/.mclaw/mclaw.json` 指针文件
- [ ] 增加 `pack-mclaw.cjs` 一键打包反馈脚本

### 阶段 2：存储与扩展（2-3 周）
- [ ] 引入 SQLite（用 Node 22 内置 `node:sqlite`）
- [ ] K-V 表 + 审计日志表
- [ ] 逐步迁移 `electron-store` 配置到 SQLite
- [ ] 设计扩展元数据规范（`mclaw.plugin.json` schema）
- [ ] 扩展加载器（启动时扫描 `~/App Support/mclaw/openclaw/config/extensions/`）
- [ ] 扩展管理 UI（设置 → 扩展）

### 阶段 3：能力补齐（2-4 周）
- [ ] 多 workspace 隔离
- [ ] Skill 使用统计
- [ ] 自动备份 + 同步
- [ ] Flow 工作流（可选）
- [ ] 翻译缓存
- [ ] OAuth 资源内置

### 阶段 4：合规与监控（1-2 周）
- [ ] 审计日志系统（host-api 层中间件）
- [ ] 文件保护配置
- [ ] 崩溃上报扩展（已有 PostHog，可加自建）
- [ ] 用户操作风险等级分类

---

## 五、关键代码位置（mclaw 侧需要改的地方）

| 文件 | 改造点 |
|------|--------|
| `scripts/bundle-openclaw.mjs` | 改为生成 `openclaw.tar.gz` 而不是散文件 |
| `scripts/bundle-mclaw-plugins.mjs` | 改为生成 `mclaw.tar.gz` 包含 plugins |
| `electron/gateway/process-launcher.ts` | 改用 `child_process.spawn` 跑 `Resources/node/node` |
| `electron/gateway/config-sync.ts` | 动态端口分配 + 写 `mclaw.json` |
| `electron/utils/paths.ts` | 改用 `getOpenClawConfigDir()` + `mclaw.json` |
| `electron-builder.yml` | 加 `openclaw.tar.gz` 到 extraResources |
| `electron/services/storage/` | 新建 SQLite store 服务 |
| `electron/host-api/` | 加审计日志中间件 |
| `src/pages/Settings/` | 加扩展管理 UI |

---

## 六、不需要学的（避免过度设计）

- ❌ **Hermes 引擎** - 腾讯自家 JS 引擎，mclaw 用 V8 + Electron 已经够好
- ❌ **腾讯平台 SDK（guid、appChannel、authGateway）** - mclaw 不需要走腾讯生态
- ❌ **galileotelemetry** - mclaw 用 PostHog 已经做了遥测
- ❌ **`qclaw-hermes` 独立数据目录** - Hermes 专属，mclaw 不需要
- ❌ **多平台 SPA 框架（Mantle/ReactiveObjC）** - Mac 老框架，mclaw 用 React 19

---

## 七、结论

**QClaw 最值得 mclaw 学的 3 件事**：
1. **运行时解包 + 内置 Node**：告别"openclaw 升级就要重新构建 app"
2. **SQLite 替代 electron-store + 审计日志**：性能 + 合规双收
3. **扩展独立 npm 包机制**：用户可运行时装扩展，应用有真正的可扩展性

**mclaw 现有优势**（不需要改）：
- 完整的 desktop/web/controller 三端 monorepo
- 严格的 typecheck + ESLint + harness 校验
- PostHog 遥测
- i18n 4 语言
- 预装 OOH Skills/Agents

**改造优先级**：P0 阶段先做，不然后面阶段没有意义。
