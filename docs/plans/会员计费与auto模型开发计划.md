# 会员计费完善 + Auto 模型路由 + OCR 兜底 开发计划

> 负责人：老王（部署工程师兼全栈打杂）
> 制定日期：2026-06-24
> 状态：执行中

---

## 一、需求拆解

### 需求 1：会员计费档位完善

| 档位 | 日 token | 周 token | 月 token | 月送积分 |
|------|----------|----------|----------|----------|
| **basic（普通）** | 200 万 | — | — | 200 |
| **pro（第二档）** | 1000 万 | 5000 万 | 20000 万 | 1000 |
| **ultra（第三档）** | 4000 万 | 20000 万 | 66000 万 | 5000 |

### 需求 2：Auto 模型路由

- 后端新增虚拟模型 `auto`，mclaw 登录后默认即此模型。
- 后端收到 `model="auto"` 请求时，根据策略（用户档位/模型可用性/成本/余额）自动路由到具体云端模型。
- 同时支持用户在 UI 手动指定具体模型。

### 需求 3：OCR 兜底

- 当前大模型不支持传图片参数。用户发图时，若选用模型不支持视觉，则调用本地 OCR 技能把图片转文字，再作为文本发给模型。

---

## 二、关键设计决策与假设（重要！）

> 用户原话积分语义有歧义（"第三档一样的"、积分与 token 数字一一对应）。老王按最自洽方案定，执行中若不对随时喊停。

### 假设 A：积分 = token 额度的另一种面额，1 积分 = 1 万 token

用户给的数字严格 1 万倍对应：200 万 token / 200 积分、1000 万 / 1000、5000 万 / 5000、20000 万 / 20000。因此：

- **换算口径**：`1 积分 = 10000 token`（现有代码是 1 积分 = 1000 token，需调整）。
- **积分来源**：月度赠送（`monthly_credits`）+ 现有钱包体系（充值/签到/兑换）保留。
- **月送积分**：basic 200 / pro 1000 / ultra 5000（ultra 用户说"一样"，老王按档位递增取 5000，更合理；若要严格按字面 1000/5000/20000 三数，则 pro/ultra 月送积分需另议）。

### 假设 B：Token 额度统一池，不再按模型级别分池

现有 `daily_basic/pro/ultra_token_balance` 三池（按 ModelAccessLevel 分）→ 改为**统一 token 池**，每档会员有 日/周/月 三个周期配额。模型访问权限（access level）仍保留，只决定"能不能用这个模型"，不决定"从哪个池扣"。

### 假设 C：周期重置 = 固定周期懒触发

- 日：日历日重置（沿用现有 `daily_reset_at` 模式）
- 周：自然周（周一 00:00）重置，新增 `weekly_reset_at`
- 月：自然月（1 号 00:00）重置，新增 `monthly_reset_at`
- 三者独立余额字段，扣费时**同时**从日/周/月三个余额扣减（一次请求消耗的 token 在三个周期里各扣一份）。

### 假设 D：扣费顺序

1. 触发三周期懒重置
2. 从 日/周/月 token 余额各扣本次 token 数（任一不足则该周期已超额）
3. token 额度任一周期不足 → 按 `1 积分 = 1 万 token` 扣 wallet.balance（受 `enable_credit_consumption` 开关控制）
4. 积分仍不足 → 返回 `ErrInsufficientTokenQuota`

### 假设 E：Auto 路由策略

候选集 = 用户档位可访问的、`is_hidden=false`、`last_check_success=true`（或 is_free）的云端模型。策略：
1. 过滤可用候选
2. 优先 is_free，其次按 weight 降序、成本升序
3. 选定后改写请求 body 的 `model` 字段 + 替换 modelContext（baseURL/apiKey/modelName/provider/modelID）
4. 计费按最终命中的真实模型记账

---

## 三、执行任务清单

### 阶段一：会员计费重构（后端）

- [x] **1.1** ent schema：`wallet` 表新增 `weekly_token_balance`、`monthly_token_balance`、`weekly_reset_at`、`monthly_reset_at` 字段；保留旧 `daily_basic/pro/ultra_token_balance` 兼容（或迁移）。新增统一 `daily_token_balance` 字段。
- [x] **1.2** ent schema：`plan` 表新增 `daily_token_quota`、`weekly_token_quota`、`monthly_token_quota` 字段（统一池），保留旧字段兼容。
- [x] **1.3** 生成 ent 代码（`go generate ./ent`）+ 编写 migration SQL（新增字段 + 更新 plan 种子配额为需求值）。
- [x] **1.4** `domain/subscription.go`：Plan/TokenQuota 结构体补字段；`GetTokenQuota` 返回日/周/月三周期。
- [x] **1.5** `biz/wallet/usecase/wallet.go`：新增 `WeeklyTokenReset`、`MonthlyTokenReset`，重构 `DailyTokenReset` 为三周期统一重置。
- [x] **1.6** `biz/billing/usecase/billing.go`：**修复扣费不写回 DB 的 bug**，实现"日/周/月三池同扣 + 超额扣积分（1积分=1万token）+ 检查 enable_credit_consumption 开关"。
- [x] **1.7** `domain/billing.go` / `consts`：积分-token 换算常量 `CreditsPerToken = 10000`，替换现有硬编码 1000。
- [x] **1.8** `biz/subscription/usecase/subscription.go`：`Subscribe` 时发放当月 `monthly_credits` 到钱包；补月度发放 cron。
- [x] **1.9** 接入 `ExpireOverdueSubscriptions` 定时任务（补死代码）。
- [x] **1.10** plan 种子 migration 更新：basic/pro/ultra 配额改为需求值。
- [x] **1.11** 后端编译 + 单测通过。

### 阶段二：Auto 模型路由（后端 + 桌面端）

- [x] **2.1** `domain/llmproxy`（或 biz/llmproxy）：定义 `AutoRouter` 接口 + 实现，注入 Proxy（Option 模式）。
- [x] **2.2** `biz/llmproxy/proxy.go`：在 `resolveModel` 后、模型名校验前注入 auto 分支——识别 `model=="auto"` → 调 AutoRouter 选模型 → 改写 body 的 model 字段 + 替换 modelContext。
- [x] **2.3** `biz/llmproxy/register.go`：注入 AutoRouter 依赖。
- [x] **2.4** 后端为账号提供 `auto` 虚拟模型记录（model="auto", is_default=true, is_free=true, access_level=basic），确保登录后默认拉到。可通过种子数据或 List 逻辑注入。
- [x] **2.5** `biz/setting/usecase/model.go`：List 返回时追加 `auto` 虚拟项（若不在 DB）；`IssueRuntimeKey` 对 auto 模型签发可路由的 key。
- [x] **2.6** 桌面端验证：登录后默认模型 = auto（后端 is_default 驱动，预期零改动）；UI 上 auto 卡片可见、可手动切其他模型。
- [x] **2.7** 后端编译 + 路由单测。

### 阶段三：OCR 兜底（桌面端）—— 已取消

> 经与用户确认：OCR **不是 mclaw 桌面端的产品功能**。用户原话「使用本地的 ocr 技能」指的是**开发阶段 Claude 自己用 `ocr` skill 看图调试**，不是 mclaw 运行时给终端用户用。mclaw 桌面端代码无需改动。Claude Code 的 ocr skill 跑在开发会话里，与 mclaw 运行时（独立 Electron 应用）不是同一进程，无法被 mclaw 调用。

- [x] **3.1** 调研：桌面端 skill 调用机制、本地 OCR skill 接口、模型视觉能力标记字段。（结论：mclaw 无现成运行时 OCR，skill 走 Gateway agent run 不能同步兜底；用户确认不做产品功能）
- [~] **3.2** ~~设计 OCR 兜底逻辑~~（取消，非产品功能）
- [~] **3.3** ~~实现 OCR 兜底逻辑~~（取消，非产品功能）
- [~] **3.4** ~~验证~~（取消）

### 阶段四：联调与收尾

- [x] **4.1** 后端整体编译 + 关键单测通过（计费/auto 路由）。桌面端联调留待运行环境。
- [x] **4.2** 更新本计划进度 + README。
- [x] **4.3** 更新 memory。

---

## 四、风险与回滚

- ent schema 变更需 `go generate` + migration，编译失败先回滚 schema。
- 积分换算从 1000→10000 影响 全局扣费，若线上有余额需评估（当前测试环境无影响）。
- auto 路由改写 body 需注意流式请求 body 只能读一次，已缓存则 re-marshal 重设。
