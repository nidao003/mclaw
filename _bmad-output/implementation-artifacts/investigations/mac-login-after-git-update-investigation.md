# Investigation: Mac 更新代码后开发模式无法登录

## Hand-off Brief

1. **What happened.** 2026-07-03 Mac 上 `pnpm dev` 启动后，登录相关请求经 Vite 代理转发时发生 `ECONNREFUSED`；Gateway 随后正常进入 ready。
2. **Where the case stands.** 状态为 Active，已确认故障位于登录 API 代理链路，尚未确认是哪次提交改变了代理目标或环境变量解析。
3. **What's needed next.** 对照 Git reflog、近期提交和 Vite 配置，定位代理目标的变更来源。

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-07-03 |
| Status | Active |
| System | macOS，`pnpm dev`，Electron 40 / Vite 7 |
| Evidence sources | 用户提供的启动日志、Git 历史与 reflog、当前源码、项目 companion 文件 |

## Problem Statement

用户报告：拉取并合并其他开发者为解决 Windows 不可用而修改的大量代码后，macOS 上执行 `pnpm dev` 无法登录使用；需要对比刚拉取的 Git 改动并定位原因。

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| 启动日志附件 | Available | 2026-07-03 15:25–15:26，包含登录失败和 Gateway 启动过程 |
| Git 历史 / reflog | Available | 当前 `main`=`origin/main`=`27e53943`；reflog 中 7 月 1 日后没有 merge/pull |
| 当前源码 | Available | Vite proxy、shared API client、登录页与 auth store 均已定位 |
| 远程 `origin/dev` | Available | 比 `main` 多 `a0871d05`、`3540efd4`，但未合并进当前 `main` |
| 运行时环境文件 | Partial | `.env` 存在且 `VITE_API_BASE_URL` 被注释；敏感值未采集 |
| claude-mem | Missing | 当前 shell 未发现 `mem` / `claude-mem` 命令 |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --- | --- | --- | --- |
| 1 | Git reflog 与近期分支差异 | High | Done | 当前没有“刚刚合并”发生；普通 pull 只 fetch 了远程对象 |
| 2 | Vite `/api` proxy 配置与环境变量 | High | In Progress | 当前 `.env` 未提供有效 `VITE_API_BASE_URL` |
| 3 | 用户状态与密码登录调用链 | High | Open | 已定位相关文件，待逐行跟踪 |
| 4 | Windows 兼容提交 | Medium | Open | `27e53943` 在当前 main；需与父提交比较 |
| 5 | dev 提交 `3540efd4` | High | Open | 提交标题直接涉及 dev API 同源代理，但尚未进入 main |

## Timeline of Events

| Time | Event | Source | Confidence |
| --- | --- | --- | --- |
| 2026-07-03 15:25:04 | `/api/v1/users/status` 连续代理失败，错误为 `ECONNREFUSED` | 启动日志附件 | Confirmed |
| 2026-07-03 15:25:06 | Gateway HTTP/WS 握手完成并进入 running | 启动日志附件 | Confirmed |
| 2026-07-03 15:26:00 | `/api/v1/users/password-login` 代理失败，错误为 `ECONNREFUSED` | 启动日志附件 | Confirmed |
| 2026-07-03（本次检查） | `main` 与 `origin/main` 同为 `27e53943`，且 reflog 在 7 月 1 日后无合并记录 | Git refs / reflog | Confirmed |
| 2026-07-03（用户手动 pull） | fetch 得到 `origin/dev=3540efd4` 和 `origin/coze-main`，随后因 main 无 tracking 而停止 | 用户终端输出 | Confirmed |

## Confirmed Findings

### Finding 1: 登录请求失败发生在 Vite HTTP 代理层

**Evidence:** 启动日志 2026-07-03 15:25:04、15:26:00。

**Detail:** `/api/v1/users/status` 与 `/api/v1/users/password-login` 均由 Vite 报 `http proxy error`，底层为 `AggregateError [ECONNREFUSED]`。

### Finding 2: Gateway 不是本次登录阻断点

**Evidence:** 启动日志 2026-07-03 15:25:06.712–15:25:06.885。

**Detail:** Gateway 报告 ready，WebSocket challenge/handshake 完成，状态从 starting 进入 running。

### Finding 3: 用户所说的“刚刚拉取并合并”未发生在当前 main

**Evidence:** `git reflog`、`git branch -vv`、`git rev-list --left-right --count main...origin/dev`。

**Detail:** 当前 `main` 与 `origin/main` 都在 `27e53943`；远程 `origin/dev` 领先共同基线两个提交，但没有进入 main。用户贴出的 pull 输出也明确停在“no tracking information”，只完成 fetch。

## Deduced Conclusions

### Deduction 1: 前端请求已发出，但代理目标没有可接受连接的服务

**Based on:** Finding 1。

**Reasoning:** Vite 只有在收到前端请求并尝试连接 proxy target 后才会输出该类错误；`ECONNREFUSED` 表明目标地址/端口不可达或服务未监听。

**Conclusion:** 首要排查 Vite proxy target、环境变量加载和后端启动假设，而不是登录表单或 Gateway UI 状态。

### Deduction 2: 不能把本次故障归因于刚 fetch 到的 `3540efd4`

**Based on:** Finding 3。

**Reasoning:** 未进入当前 HEAD 的提交不会改变工作树代码。

**Conclusion:** 需要分别检查当前 `27e53943` 已有行为，以及 `3540efd4` 是否其实是尚未合并的修复。

## Hypothesized Paths

### Hypothesis 1: Windows 兼容改动改变了 Mac 的开发代理目标

**Status:** Open

**Theory:** 为 Windows 开发环境新增或重写的代理/环境变量逻辑，在 macOS 上回退到本地不可用地址。

**Supporting indicators:** 故障发生在 Vite proxy；用户报告变更目的与跨平台兼容有关。

**Would confirm:** 相关提交修改 Vite 配置、`.env` 解析、API base URL 或启动脚本，且当前 Mac 解析出的 target 无服务监听。

**Would refute:** 近期 Windows 相关提交完全未触及这些路径，或当前 target 与改动前一致且服务故障独立存在。

**Resolution:** 待 Git 与源码追踪。

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | --- | --- |
| Vite 当前计算出的 proxy target | 无法确认被拒绝的实际地址 | 阅读配置并用环境变量复算；必要时运行诊断命令 |
| 改动前可工作的基线提交 | 影响回归差异精度 | 从 reflog / 用户历史分支确定 |

## Source Code Trace

| Element | Detail |
| --- | --- |
| Error origin | Vite 开发服务器 HTTP proxy（具体配置文件待查） |
| Trigger | 渲染进程查询用户状态或提交密码登录 |
| Condition | proxy target 对连接返回 `ECONNREFUSED` |
| Related files | 待源码扫描补充 |

## Conclusion

**Confidence:** Medium

已确认登录失败是 API 代理连接被拒绝，且 Gateway 正常；具体导致代理目标失效的代码提交尚未定位。

## Recommended Next Steps

### Fix direction

待确认具体根因后给出；当前不实施代码修改。

### Diagnostic

核对 Git 变更范围，追踪 Vite proxy target 的配置来源，并验证目标端口监听状态。

## Reproduction Plan

在当前 macOS 工作树执行 `pnpm dev`，触发用户状态查询与密码登录；观察 Vite proxy target 和连接结果，再与变更前提交对照。

## Side Findings

- macOS login item 的 `Operation not permitted` 与登录 API 故障是不同链路，现无证据表明两者相关。
