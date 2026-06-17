# mclaw 后端技术选型调研报告：SkillHub 平台 + 登录授权 + 计费

> 调研日期：2026-06-10
> 背景：mclaw 需要搭建 SkillHub 技能市场平台，并实现登录授权与计费系统
> 候选方案：Go 后端（MonkeyCode）vs Java 后端（station-match-backend / 若依 RuoYi-Vue-Plus）

---

## 一、两个后端的现状对比

### 1.1 基础技术栈

| 维度 | Go 后端 (MonkeyCode) | Java 后端 (station-match-backend) |
|------|---------------------|----------------------------------|
| **语言** | Go 1.25 | Java 17 |
| **框架** | Echo v4（轻量） | Spring Boot 3.5 + RuoYi-Vue-Plus 5.5.3（重量级） |
| **ORM** | Ent（代码生成式） | MyBatis-Plus |
| **数据库** | PostgreSQL + ClickHouse | MySQL |
| **缓存** | Redis | Redis (Redisson) |
| **代码量** | ~15,000 行 | ~30,000 行 |
| **架构风格** | Clean Architecture (handler → usecase → repo) | 传统分层 (controller → service → mapper) |

### 1.2 登录授权能力

| 能力 | Go 后端 | Java 后端 |
|------|---------|-----------|
| 邮箱注册/登录 | ✅ 已实现 | ✅ 已实现 |
| GitHub OAuth | ✅ 已实现 | ❌ 无（若依 JustAuth 可扩展） |
| GitLab OAuth | ✅ 已实现 | ❌ 无 |
| 微信扫码登录 | ✅ 已实现 | ✅ 小程序登录已实现 |
| 验证码 | ✅ captcha 模块 | ✅ 若依自带 |
| JWT 认证 | ✅ middleware/auth.go | ✅ Sa-Token + JWT |
| 多租户 | ❌ 不支持 | ✅ 若依多租户（**本项目不需要**） |
| RBAC 权限 | ⚠️ 基础角色 | ✅ 若依完整 RBAC |

### 1.3 计费能力

| 能力 | Go 后端 | Java 后端 |
|------|---------|-----------|
| 会员等级 | ❌ 空壳（硬编码返回 pro） | ✅ MemberLevel 实体 + 完整体系 |
| 支付对接 | ❌ 无 | ✅ 微信支付 V3 SDK 已集成 |
| 订单管理 | ❌ 无 | ✅ PaymentOrder 实体 + 完整流程 |
| 用量追踪 | ✅ ClickHouse + modelusage 模块 | ✅ UsageLog 实体 |
| 多租户支付 | ❌ 不支持 | ✅ TenantWxPayConfig（**本项目不需要**） |
| 营销活动 | ❌ 无 | ✅ MarketingCampaign / Prize / DrawRecord |
| 回调通知 | ✅ Notify 模块（邮件/微信/钉钉/飞书） | ⚠️ 基础通知 |

### 1.4 AI / SkillHub 核心能力

| 能力 | Go 后端 | Java 后端 |
|------|---------|-----------|
| LLM 集成 | ✅ OpenAI/Anthropic 原生 SDK，3 种接口类型 | ❌ 仅 HTTP 转发到 ooh-manus |
| 流式响应 | ✅ 原生 WebSocket + SSE，零拷贝 | ⚠️ WebClient + Reactor 转发 |
| 任务编排 | ✅ 完整状态机（Tasker） | ❌ 无 |
| MCP Hub | ✅ 已有配置 | ❌ 无 |
| Hook 扩展 | ✅ 6 种 Hook 接口 | ❌ 无 |
| 模型动态切换 | ✅ 运行中切换 | ❌ 无 |
| Token 用量统计 | ✅ ClickHouse 精确统计 | ❌ 无 |
| VM 管理 | ✅ gRPC 调用 TaskFlow | ❌ 无 |

---

## 二、三种方案分析

### 方案 A：纯 Java 后端

**思路**：在若依基础上扩展 SkillHub 模块

**优势**：
- 计费/会员/支付现成
- RBAC 权限体系完善
- 管理后台 UI 开箱即用

**劣势**：
- AI 流式通信需深度改造 Spring WebFlux，技术难度大
- SkillHub 核心能力（LLM 代理、MCP、任务编排）全部要从零写
- JVM 内存占用 500MB+，冷启动 5-15 秒
- WebSocket 大量连接性能受限（线程模型）
- 与 ooh-manus 的关系尴尬（又要转发又想做 AI）

**评估**：❌ 不推荐。AI 核心能力从零构建成本极高，Spring Boot 在流式/长连接场景天然劣势。

### 方案 B：混合架构（Go + Java）

**思路**：Go 做 AI 核心，Java 管钱管人

```
mclaw 前端
  ├── 登录/授权/计费 → Java 后端（若依）
  └── SkillHub / AI → Go 后端（MonkeyCode）
```

**优势**：
- 各取所长，Java 管钱 Go 管活
- 计费不需要重写

**劣势**：
- **认证打通**：JWT 共享——密钥同步、过期策略对齐、刷新逻辑一致，出 bug 难排查
- **计费一致性**：Go 执行技能 → HTTP 回调 Java 扣额度，网络抖动 = 数据不一致风险
- **部署复杂度翻倍**：两套进程、两套配置、两套日志、两套数据库
- **运维成本**：JVM 500MB+ 内存、两个服务互相依赖、故障排查跨服务
- **API 互调延迟**：每次计费检查多一次网络往返

**评估**：⚠️ 不推荐。隐性成本远大于省下的计费代码。两个后端互相调来调去是给自己挖坑。

### 方案 C：纯 Go 后端（推荐）

**思路**：基于 MonkeyCode Go 后端，补齐计费模块

**优势**：
- 登录授权**已有**，不需要补
- AI/SkillHub 核心能力**已有**，只需扩展
- 计费模块不需要多租户，补的工作量可控
- 单进程部署，运维极简
- 计费逻辑内聚，无跨服务一致性问题
- 架构风格统一（Clean Architecture + Hook 扩展）

**劣势**：
- 计费/支付需要新写（但不需要多租户，复杂度大幅降低）
- 若依管理后台 UI 不可用（mclaw 本身有前端，不是问题）

**评估**：✅ 推荐。短期多写一点计费代码，长期架构干净、运维简单、扩展方便。

---

## 三、纯 Go 方案需要补的模块

### 3.1 工作量评估

| 模块 | 工作量 | 说明 |
|------|--------|------|
| 套餐/会员等级 | 小（2-3天） | 新增 Ent Schema：Plan、UserSubscription，CRUD 即可 |
| 支付对接 | 中（3-5天） | 微信支付 V3，Go 有官方 SDK；支付宝也有成熟库 |
| 订单管理 | 小（1-2天） | PaymentOrder 实体 + 状态流转 |
| 用量扣减 | 小（1-2天） | ClickHouse 已统计 token，加额度判断 + 扣减逻辑 |
| 支付回调 | 小（1-2天） | Notify 模块已有，加支付成功/失败事件 |
| SkillHub 技能市场 | 中（3-5天） | 新增 biz/skill 模块，扩展现有 MCP Hub |

**总计：1-2 周**

### 3.2 新增代码结构

```
backend/biz/
├── skill/              → 新增：技能市场
│   ├── handler/        → 技能发布/搜索/安装/评分 API
│   ├── usecase/        → 技能审核/版本管理/推荐逻辑
│   └── repo/           → 技能数据存储
├── subscription/       → 改造：从空壳变真·会员订阅
│   ├── handler/        → 套餐查询/订阅/续费 API
│   ├── usecase/        → 订阅逻辑/额度判断/升降级
│   └── repo/           → 订阅数据存储
├── payment/            → 新增：支付模块
│   ├── handler/        → 支付/回调/退款 API
│   ├── usecase/        → 支付流程/订单管理
│   └── repo/           → 订单数据存储
└── ...existing modules

backend/domain/
├── plan.go             → 新增：套餐定义
├── subscription.go     → 改造：会员订阅实体
├── payment_order.go    → 新增：支付订单实体
├── skill.go            → 新增：技能实体
└── skill_version.go    → 新增：技能版本实体
```

### 3.3 计费流程设计

```
用户发起技能调用
    │
    ▼
Go 后端鉴权（JWT，已有）
    │
    ▼
检查用户订阅状态 + 额度
    │
    ├── 额度充足 → 执行技能 → ClickHouse 记录用量 → 扣减额度 → 返回结果
    ├── 额度不足 → 返回提示 → 引导升级套餐
    └── 未订阅   → 引导购买套餐
    │
    ▼
用量达标 → Notify 模块推送预警（已有）
```

---

## 四、Go 后端核心链路完整性分析：登录 → 用模型

### 4.1 完整链路总览

```
① 用户注册/登录（邮箱/OAuth/微信）
    ↓
② JWT 签发（middleware/auth.go）
    ↓
③ 获取模型列表（管理员预配的公共模型，按订阅等级过滤）
    ↓
④ 选择模型 → 创建任务/调用技能
    ↓
⑤ LLM Proxy 转发到上游（OpenAI/Anthropic/国产模型）
    ↓
⑥ Usage Capture 精确统计 Token 用量 → ClickHouse 存储
    ↓
⑦ 计费模块根据用量扣减额度
```

### 4.2 各环节现状

| 环节 | 模块 | 状态 | 关键代码 |
|------|------|------|---------|
| ① 用户注册/登录 | `biz/user` + `biz/oauth` | ✅ 完整 | 支持：邮箱密码、邮箱验证码、GitHub OAuth、GitLab OAuth、微信扫码、验证码 |
| ② JWT 签发 | `middleware/auth.go` | ✅ 完整 | 登录成功返回 Token，中间件校验 |
| ③ 模型配置管理 | `domain/model.go` + `biz/setting` | ✅ 完整 | 管理员添加模型（API Key + Base URL + 接口类型），支持公共/私有/团队三种 Owner |
| ④ 模型列表查询 | `domain/model.go` ModelUsecase.List | ✅ 完整 | 返回用户可见模型，含 AccessLevel、IsFree 字段 |
| ⑤ LLM 代理转发 | `biz/llmproxy/proxy.go` | ✅ 完整 | 反向代理，3 种 API 格式自动路由 |
| ⑥ Token 用量统计 | `biz/llmproxy/usage_capture.go` | ✅ 完整 | SSE 流式 + 非流式，精确捕获 input/output/cached/reasoning tokens |
| ⑦ 订阅/额度扣减 | `biz/subscription` | ❌ 空壳 | 硬编码返回 `{plan: "pro", auto_renew: false}` |
| ⑧ 模型访问控制 | 无独立模块 | ❌ 缺失 | Model 有 AccessLevel 字段，但未与 Subscription 联动 |

### 4.3 云端大模型服务的两种模式

#### 模式 A：平台提供模型（SkillHub 用这个）

管理员在后台配置公共模型，用户登录后直接使用，平台承担 API 费用。

```
管理员后台 → 添加模型配置
         ├── Provider: OpenAI / Anthropic / DeepSeek / ...
         ├── API Key: 平台的 Key
         ├── Base URL: https://api.openai.com/v1
         ├── Interface Type: openai_chat / openai_responses / anthropic
         ├── Owner: Public（所有用户可见）
         ├── Access Level: basic / pro（控制订阅等级）
         └── IsFree: true/false

用户登录 → 获取模型列表
       → 选择模型 → 创建任务
       → LLM Proxy 用管理员的 Key 转发到上游
       → Usage Capture 统计 Token → ClickHouse
       → 计费模块扣减用户额度
```

**LLM Proxy 关键实现**（`biz/llmproxy/proxy.go`）：

- 支持路径：`/v1/chat/completions`、`/v1/responses`、`/v1/messages`
- 通过 `ModelApiKey` 解析用户和模型关系
- 反向代理自动改写 URL/Header，零拷贝流式转发
- 连接池：100 连接/Host，5s 超时，300s 响应头超时

**Token 用量统计关键实现**（`biz/llmproxy/usage_capture.go`）：

- 流式：逐 SSE 事件解析（`response.completed`/`done`/`message_start`/`message_delta`）
- 非流式：响应体完整解析
- 统计字段：InputTokens、OutputTokens、CacheReadInputTokens、CacheCreationInputTokens、ReasoningTokens、CachedTokens
- 异步写入 ClickHouse

#### 模式 B：用户自带 Key（BYOK）

用户在设置页添加自己的模型配置，LLM Proxy 用用户的 Key 转发。平台不承担 API 费用，不扣额度。

### 4.4 需要补的环节：订阅等级 → 模型访问控制

当前缺失的核心逻辑：用户订阅等级决定能访问哪些模型，以及额度用完后的限制。

**Model 实体已有的字段**：

```go
type Model struct {
    AccessLevel      string  `json:"access_level"` // 访问级别 basic | pro
    IsFree           bool    `json:"is_free"`       // 是否免费模型
    IsHidden         bool    `json:"is_hidden"`     // 是否隐藏
    InterfaceType    consts.InterfaceType  // openai_chat / openai_responses / anthropic
    // ...
}
```

**Subscription 实体当前是空壳**：

```go
// 开源版固定返回基础订阅状态
func (h *Handler) Get(c *web.Context) error {
    return c.Success(domain.SubscriptionResp{
        Plan:      "pro",      // ← 硬编码
        AutoRenew: false,
    })
}
```

**需要新增的联动逻辑**：

```go
// 伪代码：模型访问控制（需新增到 biz/subscription/usecase/）
func (u *SubscriptionUsecase) CanAccessModel(user *User, model *Model) error {
    // 1. 免费模型直接放行
    if model.IsFree {
        return nil
    }

    // 2. 获取用户订阅等级
    sub := u.GetSubscription(user.ID)

    // 3. 等级不够，拒绝访问
    if model.AccessLevel == "pro" && sub.Plan != "pro" {
        return ErrSubscriptionRequired
    }

    // 4. 检查额度
    usage := u.GetUsage(user.ID)  // 从 ClickHouse 查询
    quota := u.GetQuota(sub.Plan) // 套餐额度配置
    if usage.TotalTokens >= quota.MaxTokens {
        return ErrUsageExceeded
    }

    return nil
}

// 需要在模型列表查询时注入过滤
func (u *ModelUsecase) List(ctx context.Context, uid uuid.UUID, cursor CursorReq) (*ListModelResp, error) {
    // 现有逻辑：返回所有可见模型
    // 新增逻辑：根据用户订阅等级过滤 AccessLevel
    //   - free 用户：只能看到 IsFree=true 或 AccessLevel=basic 的模型
    //   - pro 用户：可以看到所有模型
}
```

### 4.5 链路完整性结论

| 问题 | 答案 |
|------|------|
| 有大模型链接吗？ | ✅ 有，LLM Proxy 完整实现，3 种 API 格式都支持（OpenAI Chat / OpenAI Responses / Anthropic） |
| 登录后能用云端大模型吗？ | ✅ 能，管理员配好公共模型 + API Key，用户登录就能用 |
| 结构完整吗？ | ⚠️ **90% 完整**，整条链路通了，只差"订阅等级 → 模型访问控制"的联动逻辑 |
| 需要补什么？ | 1. subscription 从空壳变真实会员体系 2. 模型列表按订阅等级过滤 3. 额度扣减 + 超额限制 4. 支付模块 |

**总结：骨架完整，差一环。** 登录、模型管理、LLM 代理转发、Token 用量统计这些核心环节的代码都已经写好且可用。唯一缺失的是把订阅/计费和模型访问串起来的业务逻辑，属于 1-2 周工作量内的可控范围。

---

## 五、性能对比

| 指标 | Go 后端 | Java 后端 | 混合架构 |
|------|---------|-----------|---------|
| 冷启动 | ~100ms | ~5-15s | ~15s+ |
| 内存占用 | ~50-100MB | ~500MB-1GB | ~600MB+ |
| WebSocket 并发 | goroutine，10万+连接 | 线程池受限，数千连接 | 受 Java 限制 |
| SSE 流延迟 | 微秒级 | 毫秒级 | 毫秒级 + 网络开销 |
| 部署单元 | 1 个二进制 | 1 个 JAR | 2 个服务 |
| 运维复杂度 | 低 | 中 | 高 |

---

## 六、最终建议

### 推荐：方案 C —— 纯 Go 后端

**核心理由**：

1. **登录授权已有**，SkillHub AI 能力已有，不需要重复建设
2. **不需要多租户**，计费补齐工作量仅 1-2 周
3. **混合架构的隐性成本**（认证打通、计费一致性、双服务运维、网络开销）远大于省下的计费代码
4. **架构统一**：Clean Architecture + Hook 扩展，SkillHub 新模块风格一致
5. **单进程部署**：一个二进制，一条命令，调试运维极简

**不选 Java 的理由**：AI 流式通信是硬伤，从零写 LLM 集成成本远高于从零写支付对接。

**不选混合架构的理由**：两个后端互相调用的网络/一致性/运维问题，是长期的技术债。

---

## 七、关键发现：MonkeyCode 前端完整，后端订阅/钱包是阉割版

### 7.1 现状对比

MonkeyCode 采用**前端开放 + 后端阉割**的开源策略：

| 维度 | 前端（开源） | 后端（开源） |
|------|------------|------------|
| 订阅套餐 UI | ✅ 完整（基础/专业/旗舰/团队） | ❌ 空壳（硬编码返回 pro） |
| 积分钱包 UI | ✅ 完整（余额/充值/签到/兑换/邀请） | ❌ 无实现 |
| 支付流程 UI | ✅ 完整（充值→支付链接→跳转） | ❌ 无实现 |
| 积分账单 UI | ✅ 完整（收支记录、分类标签） | ❌ 无实现 |
| API 定义 | ✅ 完整（Api.ts 中所有接口和类型） | ❌ 仅 1 个 GET 接口 |

**后端 subscription 模块的全部代码**（`biz/subscription/handler/v1/subscription.go`）：

```go
func (h *Handler) Get(c *web.Context) error {
    if middleware.GetUser(c) == nil {
        return errcode.ErrUnauthorized
    }
    return c.Success(domain.SubscriptionResp{
        Plan:      "pro",      // 硬编码，永远返回 pro
        AutoRenew: false,
    })
}
```

### 7.2 商业化策略分析

```go
// backend/biz/register.go
RegisterAll(i)        // 通用模块（不含 subscription/wallet）
RegisterOpenSource(i) // 开源版：subscription 硬编码 + llmproxy + uploader

// subscription 在开源版注册，但 handler 只有一个空壳 GET
// wallet / recharge / checkin / exchange 等接口在开源版中根本不存在
// 这些接口在长亭科技的闭源商业版后端中实现
```

**MonkeyCode 的意图**：
- 前端**故意保留**完整 UI 和 API 定义 → 开源用户能看到界面但不能用
- 引导用户使用 MonkeyCode SaaS（monkeycode-ai.com）或购买商业版
- 对私有化部署用户，subscription 硬编码返回 pro，相当于"全部免费"

### 7.3 对 mclaw 的价值：前端 Api.ts 就是后端接口设计文档

这是**天大的好事**——前端已经把产品需求和接口契约都"写"好了。

#### 前端已定义的完整 API 列表（来自 Api.ts）

**订阅相关**：

| 方法 | 路径 | 说明 | 后端状态 |
|------|------|------|---------|
| GET | `/api/v1/users/subscription` | 查询当前订阅 | 空壳 |
| POST | `/api/v1/users/subscription` | 创建订阅（购买套餐） | ❌ 未实现 |
| PUT | `/api/v1/users/subscription/auto-renew` | 自动续费开关 | ❌ 未实现 |
| PUT | `/api/v1/users/subscription/credit-consumption` | 积分抵扣开关 | ❌ 未实现 |

**钱包相关**：

| 方法 | 路径 | 说明 | 后端状态 |
|------|------|------|---------|
| GET | `/api/v1/users/wallet` | 查询钱包余额 | ❌ 未实现 |
| GET | `/api/v1/users/wallet/checkin` | 查询签到状态 | ❌ 未实现 |
| POST | `/api/v1/users/wallet/checkin` | 每日签到 | ❌ 未实现 |
| POST | `/api/v1/users/wallet/exchange` | 兑换码兑换 | ❌ 未实现 |
| POST | `/api/v1/users/wallet/recharge` | 充值（返回支付链接） | ❌ 未实现 |
| GET | `/api/v1/users/wallet/transaction` | 积分账单列表 | ❌ 未实现 |

**邀请相关**：

| 方法 | 路径 | 说明 | 后端状态 |
|------|------|------|---------|
| GET | `/api/v1/users/invitations` | 邀请用户列表 | ❌ 未实现 |

#### 前端已定义的完整数据模型（来自 Api.ts）

**交易类型枚举**（`ConstsTransactionKind`）：

```typescript
// 收入类型
TransactionKindSignupBonus          = "signup_bonus"           // 新用户注册奖励
TransactionKindVoucherExchange      = "voucher_exchange"       // 兑换码领取
TransactionKindInvitationReward     = "invitation_reward"      // 邀请注册奖励
TransactionKindProUpgradeRefund     = "pro_upgrade_refund"     // 套餐升级退款
TransactionKindDailyGrant           = "daily_grant"            // 当日钱包发放
TransactionKindTopUp                = "top_up"                 // 充值积分
TransactionKindCheckin              = "checkin"                // 签到奖励

// 支出类型
TransactionKindVMConsumption        = "vm_consumption"         // 开发环境消耗
TransactionKindModelConsumption     = "model_consumption"      // 大模型消耗
TransactionKindMCPToolConsumption   = "mcp_tool_consumption"   // MCP 工具消耗
TransactionKindProSubscription      = "pro_subscription"       // 兑换专业会员
TransactionKindProAutoRenew         = "pro_auto_renew"         // 专业会员自动续费
TransactionKindUltraSubscription    = "ultra_subscription"     // 兑换旗舰会员
TransactionKindUltraAutoRenew       = "ultra_auto_renew"       // 旗舰会员自动续费
TransactionKindViolationFine        = "violation_fine"         // 违规罚扣
```

**订阅等级枚举**（`ConstsSubscriptionPlan`）：

```typescript
PlanBasic  = "basic"   // 基础会员 ¥0
PlanPro    = "pro"     // 专业会员 ¥99/月
PlanUltra  = "ultra"   // 旗舰会员 ¥499/月
PlanFlagship = "flagship" // 等同 ultra
```

**计费周期枚举**（`ConstsSubscriptionPeriodUnit`）：

```typescript
PeriodMonth = "month"
PeriodYear  = "year"
```

#### 前端已实现的套餐对比表（来自 subscription-plan-dialog.tsx）

| 功能 | 基础会员 | 专业会员 | 旗舰会员 |
|------|---------|---------|---------|
| 价格 | ¥0 永久 | ¥99/月 ¥999/年 | ¥499/月 ¥4999/年 |
| 任务并发 | 1 个 | 3 个 | 3 个 |
| 云开发环境 | 1C/4G | 2C/8G | 2C/8G |
| 基础模型额度 | 3000万 Token/天 | 3000万 Token/天 | 6000万 Token/天 |
| 专业模型额度 | 无 | 3000万 Token/天 | 6000万 Token/天 |
| 旗舰模型额度 | 无 | 无 | 6000万 Token/天 |
| 每月赠送积分 | 无 | 1万 | 10万 |
| 第三方大模型 | 部分支持 | 支持 | 支持 |
| 增强能力 | 部分支持 | 支持 | 支持 |

#### 充值选项（来自 wallet-dialog.tsx）

| 积分 | 价格 | 折扣 |
|------|------|------|
| 2,000 | ¥10 | 无折扣 |
| 15,000 | ¥50 | 6.7折 |
| 100,000 | ¥250 | 5.0折 |
| 500,000 | ¥1000 | 4.0折 |

### 7.4 mclaw 后端开发策略

**核心原则：前端 Api.ts 就是接口规格书，照着实现即可。**

```
前端 Api.ts 中的类型定义
    ↓ 作为接口契约
后端 domain/ 中的实体 + 接口定义
    ↓ 驱动开发
后端 biz/subscription/ → 补齐订阅逻辑
后端 biz/wallet/       → 新增钱包模块
后端 biz/payment/      → 新增支付模块
```

**优势**：
1. **不用做产品设计和接口设计**——MonkeyCode 前端已经帮你做好了
2. **不用纠结数据模型**——类型定义、枚举值、字段名都是现成的
3. **前端 UI 可直接复用**——套餐弹窗、钱包弹窗、积分账单，搬进 mclaw 改改品牌色就行
4. **接口契约强约束**——前端 Api.ts 中的请求/响应类型就是后端的验收标准

**需要注意的差异**：
- 套餐价格和额度配置需要根据 mclaw 的成本模型调整
- 团队版功能暂不需要
- 签到/邀请等运营功能可根据阶段选择性实现

---

## 八、风险与应对

| 风险 | 应对措施 |
|------|---------|
| Go 微信支付生态不如 Java 成熟 | Go 有官方 wechatpay-go SDK，社区库成熟度够用 |
| 若依管理后台不可用 | mclaw 自有前端，管理页面用 Go API + Vue 搭建简单后台 |
| Go 后端开源版部分功能是空壳 | subscription 等模块正好需要重写，不影响 |
| 未来可能需要更复杂的计费规则 | Hook 扩展机制预留空间，商业版差异化扩展 |
