# 云端模型对话走后端 llmproxy 转发 + 计费：排查与经验

> 时间：2026-06-24
> 场景：mclaw 桌面端登录后"看不到云端模型/积分/订阅、提示钱包信息不可用"，以及后续"对话报错 Unknown model / 显示 UUID 当模型名 / 云端模型请求绕过后端不计费"
> 状态：**全部修复并端到端验证通过**

---

## 0. 结论先行

用户的核心架构诉求是：

> 登陆账号以后，如果使用云端大模型，请求链路都是到 Go 后端，然后 Go 后端转发给大模型，这是一个中间态，不应该直接给模型的 key；使用的都是账号的凭证。

最终实现的目标链路：

```
mclaw → OpenClaw Gateway → Go 后端 llmproxy(/v1/chat/completions) → 大模型
                              ↑ runtime key 鉴权    ↑ 读 DB 明文 key 转发    ↑ 回复
                              └ WithBillingService 事后扣 wallet 积分
```

- runtime key（`model_api_keys` 表 UUID）= 账号凭证，存在本地 `auth-profiles.json`，只能调 llmproxy、受计费额度控制、可吊销。
- 公共模型（admin 名下）所有用户共享，明文 api_key 由后端统一持有转发，**前端永远拿不到明文 key**。
- 端到端实测：HTTP 200 正常回复，wallet 余额 5000→4999 扣费生效。

本次共排查修复 **5 个独立问题**，下面按"现象→根因→修复"逐条记录，重点是踩坑教训，方便以后吸取。

---

## 1. 钱包接口 500（DB + 代码双缺主键默认值）

### 现象
登录后 `GET /api/v1/users/wallet` 返回 500，前端提示"钱包信息不可用"。

### 根因
`wallets` 表 `id` 列（UUID 主键）在数据库**无默认值**，而 ent 的 `walletRepo.Create` 没调 `SetID`，ent schema 也没设 `.Default(uuid.New)`。ent 对 UUID 主键**不自动生成** → INSERT 不带 id → DB NOT NULL 违约 → 500。

后端日志铁证：
```
failed to auto-create wallet: pq: null value in column "id" of relation "wallets" violates not-null constraint
```

> ⚠️ **坑点**：54 张表里 53 张 `id` 都无 DB 默认值，只有 `team_oauth_sites` 有。能正常 insert 的表是靠 repo 手写 `SetID` 或 schema `.Default`。wallet **两头都没沾上**才独它挂。

### 修复
1. **DB 救火**：`ALTER TABLE wallets ALTER COLUMN id SET DEFAULT gen_random_uuid();`
2. **代码治本**（`backend/biz/wallet/repo/wallet.go` `Create`）：加 `.SetID(uuid.New())`，双保险。

### 教训
新增 ent 表时，UUID 主键**必须**在 schema `.Default(uuid.New)` 或 repo `Create` 里 `SetID`，否则线上必 500。别假设 ent 会自动生成——它对 UUID 主键不会。建表后查一次 `information_schema.columns` 确认 `column_default` 非空。

---

## 2. WalletPanel 静默吞错（前端绕过 shared client）

### 现象
钱包 500 修了，WalletPanel 仍显示"钱包信息不可用"，且控制台无任何报错。

### 根因
`src/components/wallet/WalletPanel.tsx` 用**独立 raw fetch**，没带 `credentials:'include'`，`authHeaders()` 读永远为空的 `localStorage.token`（mclaw 是 **cookie/session 鉴权，不存 JWT**）→ 不带 cookie → 401 → wallet 恒 null → 静默显示兜底文案。

> ⚠️ **坑点**：诊断日志加在 `packages/shared/src/api/client.ts`，但 WalletPanel 用 raw fetch 绕过它，所以诊断看不到——盲区。任何前端请求**必须走 shared api client**，否则既不带 cookie 也不进统一日志。

### 修复
改用 shared `walletApi.getWallet()`（走 client.ts 自带 `credentials:'include'`）；checkin/transactions/recharge 补 `credentials:'include'`；删 `authHeaders()` 和本地 `WalletData` 类型。

### 教训
- mclaw 鉴权是 **cookie/session**（cookie 名 `monkeycode_ai_session`，SameSite=Lax，HttpOnly，**非 JWT 非 Bearer**）。所有 fetch 必须 `credentials:'include'`。dev 走 Vite proxy 同源带 cookie，prod 同源同理。
- **禁止业务组件自起 raw fetch**，统一走 `packages/shared/src/api/*`，否则鉴权、日志、错误处理全断线。

---

## 3. 云端模型列表 count=0（谓词漏 admin 公共模型）

### 现象
登录后 `GET /api/v1/users/models` 返回 count=0，看不到云端配置的 4 个 minimax 模型。但后端 `models` 表里明明有数据，都在 admin 名下。

### 根因
用户架构预期：云端配置的模型所有用户共享，仅额度受控。但后端 **List 谓词漏了 admin 公共模型**。

`backend/biz/setting/repo/model.go`：
- `modelWithUserPredicate`（Get 单查校验）**有** `model.HasUserWith(user.Role(consts.UserRoleAdmin))`
- `modelListWithUserPredicate`（List 列表）**漏了**这行

→ List 只返回 `user_id=当前用户` 的模型。dev 登录账号是 enterprise 用户，名下 0 模型 → count=0。

> ⚠️ **坑点**：这俩谓词函数名几乎一样，Get 有 List 没有，是经典 copy-paste 遗漏 bug。review 时 Get/List 谓词必须对齐。

### 修复
`modelListWithUserPredicate` 补一行：
```go
func modelListWithUserPredicate(uid uuid.UUID) predicate.Model {
    return model.Or(
        model.UserID(uid),
        model.HasGroupsWith(teamgroup.HasMembersWith(user.ID(uid))),
        // admin 名下模型即公共模型，所有用户可见（密钥由 HideSharedCredentials 隐藏，额度走后端计费）
        model.HasUserWith(user.Role(consts.UserRoleAdmin)),
    )
}
```
`domain.Model.From()` 会把 admin 用户标记为 `OwnerTypePublic`，`HideSharedCredentials` 自动隐藏密钥。**一行谓词搞定，无需实现 ModelHook**。

### 教训
- 原设计想用 `domain.ModelHook`（`ListPublic`/`ValidateAccess`）注入实现共享，但 DI 容器没注册、注释说"内部项目通过 WithModelListHook 注入"——全仓无实现。这套可选注入接口是**过度设计**，实际一行谓词就够。**别为简单需求上 hook 接口，KISS**。
- Get/List 谓词函数必须对齐，review 必查。

---

## 4. 对话报 Unknown model + 显示 UUID（sync 直连大模型绕过后端）

### 现象
1. 点"立即使用"后发消息报：`Agent failed before reply: Unknown model: custom-cloudb8c/MiniMax-M3`
2. 对话页底部显示"云端 b8c63adc-xxxxx"（UUID 当模型名）。

### 根因
原 `syncCloudModelAsProviderAccount` 把云端模型映射成 OpenClaw 本地 custom provider account（`custom-<id>`），用模型**自己的明文 api_key 直连大模型**，绕过后端、不鉴权不计费。三个问题：
1. minimax 是 OAuth vendor，sync 逻辑本应跳过 custom 创建，却生成了 `models.providers` 里不存在的 `custom-cloudb8c` key 写进 `agents.defaults.model.primary`，Gateway 找不到 provider 抛 Unknown model。
2. `ChatInput.tsx:259` 用 `cloudDefaultModel.id`（UUID）当显示名。
3. 架构不符：直连大模型，绕过后端，不鉴权不计费。

### 修复（统一走后端 llmproxy）
**后端**：新增 `POST /api/v1/users/models/:id/runtime-key`（session 鉴权），签发/复用 runtime key：
- `domain/model.go`：ModelUsecase 加 `IssueRuntimeKey`，ModelRepo 加 `GetRuntimeAPIKeyByUserModel`，加 `RuntimeKeyResp` 类型
- `biz/setting/repo/model.go`：`GetRuntimeAPIKeyByUserModel` 按 (uid, modelID, VirtualmachineIDIsNil) 查已有 key **复用**，无则 `CreateRuntimeAPIKey(uid, modelID, "")`
- `biz/setting/usecase/model.go`：`IssueRuntimeKey` 先 `repo.Get` 校验访问权（含 admin 公共模型谓词），再复用或签发
- `biz/setting/handler/v1/model.go`：`IssueRuntimeKey` handler + 路由 `v1.POST("/:id/runtime-key")`

**前端**：
- `src/lib/cloud-provider-sync.ts`：
  - `mapCloudModelToProviderAccount`：vendorId 固定 `'custom'`，baseUrl 用 `VITE_LLMPROXY_BASE_URL`（后端公网 `/v1`），apiProtocol 固定 `'openai-completions'`，model 用 `model.model`，label 用 `${provider} ${model}`
  - `syncCloudModelAsProviderAccount`：删 OAuth vendor 分支，调 `modelsApi.issueRuntimeKey(model.id)` 拿 runtime key 作 apiKey
  - 删 `deriveInterfaceProtocol`/`isOAuthCloudModel`/`resolveOAuthVendorForCloudModel`/`OAUTH_CLOUD_VENDORS`（YAGNI，不再用）
- `packages/shared/src/api/models.ts`：加 `issueRuntimeKey(id)`
- `src/pages/Chat/ChatInput.tsx:259`：显示名 `cloudDefaultModel?.id` → `${cloudDefaultModel.provider} ${cloudDefaultModel.model}`
- `.env`/`.env.example`：加 `VITE_LLMPROXY_BASE_URL=https://[REDACTED]/v1`

### 关键设计点
- runtime key 复用：同 (uid, modelID, 空vmID) 复用已有 key，避免 key 泛滥。已验证二次签发返回同一 key。
- minimax 不再走 OAuth，admin 在 models 表配的明文 api_key 由后端统一持有转发，用户无需各自登录 OAuth。
- `VITE_LLMPROXY_BASE_URL` 必须是后端公网地址（Gateway 是用户本地进程，**不走 Vite proxy**，必须直连后端公网）。

### 教训
- 不要让客户端持有明文模型 key 直连大模型。中间态服务必须由后端统一转发，凭证用受限 token（runtime key），既计费又可吊销。
- `llmproxy` 本身已完备（resolveModel 查 key→models 转发、billing 事后扣费），核心卡点只是**没暴露 HTTP 签发接口**。复用现有能力 > 重新造轮子（DRY）。

---

## 5. 转发 404 上游端点配错（base_url 必须配 OpenAI 端点）⚠️ 最容易踩的坑

### 现象
runtime key 签发、复用都通了，但用 runtime key 调 `POST /v1/chat/completions` 返回 **404 page not found**。前后排查发现这个 404 **不是后端返回的，是 minimax 上游返回的**。

### 关键诊断日志
```
DEBUG new rewrite request  module=llmproxy  path=/v1/chat/completions
DEBUG rewrite request success  module=llmproxy  model=MiniMax-M3
      in=/v1/chat/completions  out=https://api.minimaxi.com/anthropic/chat/completions   ← 注意这个 out
WARN  request non-2xx  POST /v1/chat/completions  status=404  latency=223ms
```
`rewrite success` 说明后端转发链路**完全打通**（鉴权✓ 查模型✓ 读明文 key✓），但拼出的上游 URL `https://api.minimaxi.com/anthropic/chat/completions` 是错的 → minimax 404。

### 根因
DB 里 minimax 模型配置：
| 字段 | 错误值 | 正确值 |
|------|--------|--------|
| base_url | `https://api.minimaxi.com/anthropic` | `https://api.minimaxi.com/v1` |
| interface_type | `anthropic` | `openai` |

llmproxy 路由按**请求路径**决定协议映射（`proxy.go:30`）：
```go
"/v1/chat/completions": "/chat/completions",   // openai 协议
"/v1/responses":        "/responses",
"/v1/messages":         "/messages",           // anthropic 协议
```
前端 sync 固定 `apiProtocol='openai-completions'` → 请求打到 `/v1/chat/completions` → 映射成 `/chat/completions` → 拼到 base_url。base_url 是 `/anthropic` → 拼出 `.../anthropic/chat/completions`，minimax anthropic 端点没这路径（它用 `/v1/messages`）→ 404。

> ⚠️ **核心教训**：**llmproxy 按"请求路径"映射协议，不按 `model.interface_type`**。前端 sync 固定 openai-completions，所以**走 llmproxy 转发的模型，base_url 必须配 vendor 的 OpenAI 兼容端点（`/v1`），不能配 anthropic 端点**。`interface_type` 只是元数据，llmproxy 不看，但保持一致避免混淆。

### 诊断方法
1. 后端日志看 `rewrite request success` 的 `out` 字段——这是实际转发的上游 URL，一眼看出端点对不对。
2. 拿 DB 明文 key 直接 curl vendor 各端点，确认哪个 200：
   ```bash
   curl -s -X POST https://api.minimaxi.com/v1/chat/completions \
     -H "Authorization: Bearer <明文key>" \
     -d '{"model":"MiniMax-M3","messages":[{"role":"user","content":"hi"}]}'
   ```
3. 区分 404 来源：后端 404（路由没注册，秒回）vs 上游 404（转发成功后上游返回，有 ~200ms 延迟 + `rewrite success` 日志在前）。

### 修复
DB：
```sql
UPDATE models SET base_url='https://api.minimaxi.com/v1', interface_type='openai'
WHERE id='b8c63adc-884e-4f45-a7ea-ac1e63f81549';
```
改后拼出 `https://api.minimaxi.com/v1/chat/completions` ✓，HTTP 200 正常回复。

### 各 vendor OpenAI 兼容端点参考（走 llmproxy 必须配这个）
| vendor | base_url |
|--------|----------|
| minimax | `https://api.minimaxi.com/v1` |
| openai | `https://api.openai.com/v1` |
| deepseek | `https://api.deepseek.com/v1` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |

> ⚠️ admin 在后台配模型时，base_url 一律填 vendor 的 **OpenAI 兼容端点**，不要填 anthropic 端点。

---

## 6. 已知次要 WARN（非阻塞）

- `billing.go:49 failed to reset daily token quota {"error":""}` —— 空错误，非致命，扣费仍生效。
- `write model usage event failed ... clickhouse client is nil` —— clickhouse 未配，usage 事件写不进，但 wallet 计费扣减走 `wallet_transactions` 表，不受影响。
- llmproxy 事后扣费**无预校验**（`billing.go` 余额不足只记日志不拦截）——已有行为，本次不改。需预校验是后续优化。

---

## 7. 部署相关经验

### 133 服务器 docker 镜像源拉不到 golang
`docker.1ms.run` 拉不到 `golang:1.25.x-alpine` 任何 tag，`docker compose up --build` 卡在 not found。解决：**本地交叉编译 + 替换二进制重建镜像**：
```bash
cd backend
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOPROXY=https://goproxy.cn,direct \
  go build -o /tmp/mclaw-backend-linux-amd64 ./cmd/server/
# 上传 → Dockerfile.replace-bin: FROM mclaw-backend:latest / COPY bin /app/main
# docker build -t mclaw-backend:patched . → docker run 按原 env/network 复刻启动
```
- 后端纯 Go（CGO_ENABLED=0）可交叉编译，go.mod 虽依赖 go-sqlite3 但 CGO 关闭无碍。
- ⚠️ **持久化坑**：patched 镜像 docker run 启动后，docker-compose 里 backend 仍是 `build:` 配置，下次 `docker compose up --build` 会覆盖回旧镜像。治本：compose 改 `image: mclaw-backend:patched` 或修 Dockerfile 镜像源。

### SSH 通道（mclaw-deploy 技能）
133 两个入口同机：局域网 `[REDACTED]:22`（主）/ 公网 `[REDACTED]`（辅，必加 `-o ConnectTimeout=25`）。先 `nc -z -G 3 [REDACTED] 22` 探测走哪条。

### 排查命令备忘
```bash
# 后端日志看转发链路
sudo docker logs mclaw-backend 2>&1 | grep -iE 'rewrite|chat/completions|billing|non-2xx'

# 查 DB 模型配置
sudo docker exec -i mclaw-db psql -U mclaw -d mclaw -c \
  "SELECT id,provider,model,base_url,interface_type,length(api_key) FROM models WHERE deleted_at IS NULL;"

# 拿 runtime key 直测 llmproxy（端到端）
curl -s -X POST https://[REDACTED]/v1/chat/completions \
  -H "X-Api-Key: <runtime-key>" \
  -d '{"model":"MiniMax-M3","messages":[{"role":"user","content":"hi"}],"stream":false}'

# 查扣费
sudo docker exec -i mclaw-db psql -U mclaw -d mclaw -c \
  "SELECT amount,balance_after,reason,created_at FROM wallet_transactions WHERE user_id='<uid>' ORDER BY created_at DESC LIMIT 5;"
```

---

## 8. 核心教训汇总

1. **ent UUID 主键必设默认值**：schema `.Default(uuid.New)` 或 repo `SetID`，否则线上必 500。建表后查 `column_default` 确认。
2. **前端禁用 raw fetch**：统一走 shared api client，带 `credentials:'include'`（cookie/session 鉴权），否则鉴权/日志/错误处理全断线。
3. **Get/List 谓词必须对齐**：copy-paste 遗漏是经典 bug，review 必查。
4. **别为简单需求上 hook 接口**：ModelHook 那套可选注入是过度设计，一行谓词就够。KISS > over-engineering。
5. **客户端不持明文 key 直连大模型**：中间态服务由后端统一转发，凭证用受限 token（runtime key），计费+可吊销。
6. **⚠️ 走 llmproxy 转发的模型，base_url 必须配 OpenAI 兼容端点（`/v1`）**：llmproxy 按请求路径映射协议，不按 `interface_type`。前端固定 openai-completions，配 anthropic 端点必 404。
7. **区分 404 来源**：后端 404（秒回、无 rewrite 日志）vs 上游 404（有 `rewrite success` 日志、~200ms 延迟）。看 `out` 字段确认实际转发 URL。
8. **复用现有能力 > 重新造轮子**：llmproxy 转发+计费已完备，核心卡点只是没暴露签发接口。DRY。
9. **诊断日志要加在真实调用路径上**：加在 client.ts 但组件用 raw fetch 绕过 = 盲区。先确认调用路径再加日志。
10. **patched 镜像部署要持久化 compose 配置**，否则下次全量构建回退。
