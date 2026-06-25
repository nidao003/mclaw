# 数据查询 Skills 开发计划

> 负责人：老王
> 制定日期：2026-06-25
> 目标：把 ooh-manus 的地铁数据查询 skills 复制到 mclaw，改造成调 **mclaw Go 后端** `/api/v1/data/*` 接口；数据 API key 在 mclaw 内自动注入无感，在非 mclaw 环境可手动配置使用。
> 状态：✅ 已落地（客户端代码 + 4 个 skill + 打包链改造完成；typecheck:web 通过、query.py 端到端调通 133 Go 后端、数据 key 通用性验证通过；客户端运行时待实际登录验证）

---

## 一、背景与现状

### 1.1 需求

mclaw 客户端要能用 skill 查询地铁站点/城市/线路数据（客流、人口、画像、商业等）。ooh-manus 已有这套 skills，但调的是 **Java 后端**（`127.0.0.1:6039`，Bearer token 鉴权）。mclaw 的数据接口是 **Go 后端**（`/api/v1/data/*`，`X-API-Key` 鉴权），路径和鉴权方式都不同，需改造。

### 1.2 两边差异（已核实）

| 维度 | ooh-manus（Java） | mclaw（Go） |
|------|-------------------|-------------|
| 后端地址 | `http://127.0.0.1:6039` | `https://[REDACTED]`（公网）|
| 接口前缀 | `/api/query/*`、`/api/city/*`、`/api/line/*` | `/api/v1/data/*` |
| 鉴权 | `Authorization: Bearer <secret_token>` | `X-API-Key: <mclaw_xxx>` |
| 凭证来源 | 环境变量 `QUERY_SERVICE_SECRET_TOKEN`（服务端配）| 登录用户自己的数据 API key |
| skill 形态 | Python 内置工具（`QueryServiceTool` 类）| OpenClaw skill（SKILL.md + scripts/）|
| 端点数 | 16 | 18（Go 更全）|

### 1.3 三条核心原则（用户审批确认）

1. **数据 key 不绑 mclaw 客户端，通用可用**：数据 API key 是标准 `X-API-Key` 鉴权，Go 后端 `ApiKeyAuth` 中间件只校验 key 哈希、**不验签名**。所以这个 key 拿出来能在 Postman/curl/其他 OpenClaw 客户端里直接用——这是用户明确要的。**与大模型 runtime key 的关键区别**：runtime key 绑 mclaw（要 HMAC 签名，纯 curl 算不出），数据 key 不绑（谁拿到都能查数据，扣该用户额度）。
2. **skill 双模式**：在 mclaw 内使用，key 由 env 自动注入，用户无感；在非 mclaw 环境安装使用，用户需手动配置 key（env 或命令行参数）。
3. **多 key 严谨管理**：靠 List 接口按 name 匹配，避免积累同名 key；keychain 存的 key 用 prefix 比对验证有效性，失效就清理重建。

---

## 二、接口对照表（ooh-manus Java → mclaw Go，已逐个核实路由）

核实来源：`backend/biz/data/handler/v1/station.go` + `city_line_biz.go` 实际 `g.GET` 注册。

| query_type | mclaw Go 接口 | 路径参数 | query 参数 | 注册文件 |
|------------|---------------|----------|------------|----------|
| `search_stations` | `GET /api/v1/data/stations/search` | — | `name`/`stationName`、`cityName`、`cityCode`、`limit` | station.go:33 |
| `city_durations` | `GET /api/v1/data/cities/durations` | — | `cityCode` | city_line_biz.go:39 |
| `city_info` | `GET /api/v1/data/cities/{code}` | `code` | — | city_line_biz.go:40 |
| `city_all` | `GET /api/v1/data/cities/{code}/all` | `code` | — | city_line_biz.go:41（Go 新增）|
| `city_passenger_flow` | `GET /api/v1/data/cities/{code}/passenger-flow` | `code` | `yearMonth` | city_line_biz.go:42 |
| `city_top_flow` | `GET /api/v1/data/cities/{code}/top-flow` | `code` | — | city_line_biz.go:43 |
| `city_yearly_flow` | `GET /api/v1/data/cities/{code}/yearly-flow` | `code` | — | city_line_biz.go:44 |
| `city_lines` | `GET /api/v1/data/cities/{code}/lines` | `code` | — | city_line_biz.go:45 |
| `city_stations` | `GET /api/v1/data/cities/{code}/stations` | `code` | `page`、`pageSize` | city_line_biz.go:46 |
| `line_info` | `GET /api/v1/data/lines/{id}` | `id` | — | city_line_biz.go:49 |
| `line_stations` | `GET /api/v1/data/lines/{id}/stations` | `id` | — | city_line_biz.go:50 |
| `station_profile` | `GET /api/v1/data/stations/{id}` | `id` | `durationId` | station.go:34 |
| `station_population` | `GET /api/v1/data/stations/{id}/population` | `id` | `durationId`、`personType` | station.go:35 |
| `station_labels` | `GET /api/v1/data/stations/{id}/labels` | `id` | `durationId`、`personType` | station.go:36 |
| `station_business` | `GET /api/v1/data/stations/{id}/business` | `id` | `durationId` | station.go:37 |
| `station_industry` | `GET /api/v1/data/stations/{id}/industry` | `id` | `durationId` | station.go:38 |
| `business_summary` | `GET /api/v1/data/stations/{id}/business-summary` | `id` | `durationId` | city_line_biz.go:53 |
| `business_detail` | `GET /api/v1/data/stations/{id}/business-detail` | `id` | `durationId`、`industryType`、`keyword`、`limit` | city_line_biz.go:54 |

> 注：`station.go:41-42` 有两行注释掉的 business-summary/detail 占位，但**实际注册在 `city_line_biz.go:53-54`**（`CityLineBizHandler.GetBusinessSummary/GetBusinessDetail`），18 端点全部可用。

### 鉴权

- Go：`X-API-Key: <mclaw_xxx>`（`ApiKeyAuth` 中间件校验 SHA-256 哈希，**不验签名**，所以 key 通用）
- 数据 API key 管理：`GET/POST /api/v1/user/api-keys`、`DELETE /api/v1/user/api-keys/:id`（需 session 登录）。List 返回 `{keys: ApiKeyDetail[]}`，detail 含 `id`/`name`/`key_prefix`(前16位)/`is_active`。Create 返回明文 key（仅此一次）。

---

## 三、安全设计（重点）

### 3.1 数据 API key 与大模型 runtime key 的本质区别

| 维度 | 大模型 runtime key（已完成加固）| 数据 API key（本计划）|
|------|---------------------|---------------------|
| 绑 mclaw 客户端 | **是**（HMAC 签名，纯 curl 算不出）| **否**（标准 X-API-Key，谁拿到都能用）|
| 后端校验 | llmproxy HMAC 验签 + key 哈希 | ApiKeyAuth 仅校验 key 哈希 |
| 能否在非 mclaw 用 | 不能（无签名 401）| **能**（用户明确要求）|
| 存储 | keychain（safeStorage）| keychain（safeStorage）✅ 同 |
| 流转 | env → Gateway preload 算签名 | env → Gateway → skill 脚本读 |
| 白嫖风险 | 拿 openclaw.json runtime key 算不出签名 | 拿 openclaw.json 无数据 key 明文（在 keychain）|

**关键**：数据 key 的安全不靠"绑定客户端"（用户要它通用），而靠"明文不落 openclaw.json"——mclaw 内自动注入，配置文件里没有明文，所以拿配置文件白嫖不了。但用户自己导出 key 在别处用，是预期内的合法行为。

### 3.2 数据 API key 的生命周期（严谨版）

```
mclaw 客户端登录成功
  → IPC data-api-key:get 从 keychain 取现有明文 key
  → 分支 A：keychain 有 key
     → 调 apiKeyApi.list() 拿用户所有 key
     → 本地算 key 前 16 位 = key_prefix，在 list 里找匹配
     → 匹配且 is_active=true → 直接用（keychain 那把有效）
     → 不匹配或 inactive（被用户在 web 后台 revoke 了）→ IPC data-api-key:clear → 走分支 B
  → 分支 B：keychain 无 key（或上一步清理后）
     → 调 apiKeyApi.list() 查 name="mclaw-desktop-data" 的所有 key
     → 逐个 apiKeyApi.revoke(id) 清理同名旧 key（避免积累）
     → apiKeyApi.create({name:"mclaw-desktop-data"}) 拿明文（仅此一次）
     → IPC data-api-key:save(明文) 存 keychain
```

**严谨点**：
1. keychain 有 key 时，用 prefix 比对 list 验证有效性，失效自动重建——不会拿着被 revoke 的 key 瞎跑。
2. 重建前先 revoke 所有同名旧 key，**绝不积累**同名 key。
3. 明文只存 keychain（safeStorage 加密），不落 openclaw.json/auth-profiles.json。

### 3.3 key 流转到 skill 脚本

```
主进程 keychain（源头，safeStorage 加密）
  → 启动 Gateway 子进程时经 env MCLAW_DATA_API_KEY 注入
  → skill 脚本 scripts/query.py 从 os.environ['MCLAW_DATA_API_KEY'] 读
  → 打 Go 后端 /api/v1/data/* 带 X-API-Key 头
```

**安全评估**：
- env 注入 Gateway 子进程 = 跟 deviceSecret 完全相同的暴露面。安全等级一致。
- **白嫖评估**：攻击者拿 openclaw.json → 无数据 API key 明文（在 keychain）→ 查不了数据。攻击者拿到 keychain 文件 → safeStorage 加密，需本机用户密钥才能解。
- 用户自己在 mclaw 设置里导出 key 在 Postman 用 → 合法（key 本就通用），扣自己额度。

### 3.4 skill 双模式 key 读取（query.py）

```python
API_KEY = args.api_key or os.environ.get("MCLAW_DATA_API_KEY") or os.environ.get("DATA_API_KEY")
if not API_KEY:
    报错并输出配置指引（mclaw 内自动注入；非 mclaw 设 env 或 --api-key）
    sys.exit(2)
```

- mclaw 内：env `MCLAW_DATA_API_KEY` 自动注入，无感。
- 非 mclaw：`--api-key` 命令行参数，或 `export MCLAW_DATA_API_KEY=...`，或 OpenClaw skill entry 的 `env` 配置。

---

## 四、skill 设计

### 4.1 目录结构（OpenClaw 标准）

复制 ooh-manus 的 4 个数据 skill，改造后放 `build/preinstalled-skills/`（随客户端分发，跟 pdf/docx 同级）：

```
build/preinstalled-skills/
├── query-service/          # 核心：18 个 query_type 查询
│   ├── SKILL.md            # 教 agent 何时用、query_type 表、参数规则、双模式 key 说明
│   ├── scripts/
│   │   └── query.py        # Python 标准库，读 env/参数 key，调 Go 后端，输出 JSON
│   └── reference.md        # 进阶：字段含义、800米口径、时间粒度（progressive disclosure）
├── station-profile/        # 站点画像展示指导
│   └── SKILL.md
├── data-fusion/            # 多查询融合策略
│   └── SKILL.md
└── query-guide/            # 自然语言→查询参数映射
    └── SKILL.md
```

### 4.2 query.py 脚本设计

- 纯标准库（urllib + argparse），不依赖 httpx（OpenClaw 自带 Python 但不一定有 httpx，标准库最稳）。
- 从 env/参数读 key + base url，**脚本内不硬编码任何凭证**。
- 18 个 query_type → 路径模板 + 参数映射表，拼 URL → 带 `X-API-Key` 请求 → 输出 JSON 到 stdout。
- 参数命名对齐 Go 后端（camelCase：`stationName`/`cityCode`/`stationId`/`durationId`/`personType` 等）。
- 错误输出到 stderr，JSON 数据输出到 stdout，agent 读取组织回答。

### 4.3 SKILL.md 改造要点

相对 ooh-manus 原版的改动：
1. **调用方式**：从"调 query_service 工具"改成"exec 跑 `scripts/query.py <query_type> --params`"。
2. **query_type 对齐 Go 端点**：新增 `city_all`/`business_summary`/`business_detail`，参数以 Go 实际为准。
3. **key 说明**：明确 mclaw 内自动注入无需配置；非 mclaw 需配 key。强调数据 key 通用（不绑 mclaw）。
4. **去掉 ooh-manus 特有内部标记**：`[STATION_ID:...]`、`ooh-resources` JSON 块、`sessions_spawn` 子代理回流等——这些是 ooh-manus 多代理架构的，mclaw 单 agent 不需要。保留资源 ID 传递规范（前端要渲染站点卡片，但 mclaw 前端暂未实现 ooh-resources 块，先保留 ID 不丢即可）。
5. **search_stations 参数**：Go 认 `name` 或 `stationName`，脚本统一传 `stationName`。

---

## 五、客户端改动

### 5.1 数据 API key 管理（复用 device-secret 机制）

新增 `electron/services/secrets/data-api-key.ts`：
- `getDataApiKey(): string | null` —— 解密读 keychain，没有返回 null
- `saveDataApiKey(key: string)` —— safeStorage 加密存 `userData/data-api-key.enc`
- `clearDataApiKey()` —— 删文件

### 5.2 IPC 桥接

`electron/main/ipc-handlers.ts` + `electron/preload/index.ts` + `src/types/electron.d.ts`：
- `data-api-key:get` → 返回明文或 null
- `data-api-key:save` → 存明文
- `data-api-key:clear` → 清除

### 5.3 登录后自动取/创建 key（严谨版，渲染进程）

新增 `src/lib/data-api-key-sync.ts` 导出 `ensureDataApiKey()`：
1. IPC `data-api-key:get` 取 keychain 现有 key
2. 有 key → `apiKeyApi.list()`，算 prefix 比对，有效则返回；失效则 IPC `data-api-key:clear` 走重建
3. 无 key/重建 → `apiKeyApi.list()` 查 name=mclaw-desktop-data，逐个 `revoke(id)` 清理 → `create({name})` 拿明文 → IPC `data-api-key:save`

新增 `src/hooks/useDataApiKeyOnLogin.ts`，登录成功后调 `ensureDataApiKey()`（与 `useCloudModelSyncOnLogin` 并列挂载）。

### 5.4 Gateway env 注入

`electron/gateway/process-launcher.ts` 的 `launchGatewayProcess`，跟 deviceSecret 同处注入：
```typescript
runtimeEnv.MCLAW_DATA_API_KEY = getDataApiKey() || '';
runtimeEnv.MCLAW_DATA_BASE_URL = process.env.MCLAW_DATA_BASE_URL || 'https://[REDACTED]';
```

### 5.5 预装 skill 分发登记

- `resources/skills/preinstalled-manifest.json`：加 query-service/station-profile/data-fusion/query-guide 四个 slug（autoEnable: true）
- `build/preinstalled-skills/.preinstalled-lock.json`：加四个版本条目

---

## 六、落地任务清单

### 客户端（安全 + key 流转）
- [ ] **1.1** `electron/services/secrets/data-api-key.ts`（新）：`getDataApiKey`/`saveDataApiKey`/`clearDataApiKey`，safeStorage 加密存 `userData/data-api-key.enc`。
- [ ] **1.2** IPC：`ipc-handlers.ts` 加 `data-api-key:get/save/clear` handler；`preload/index.ts` + `electron.d.ts` 暴露 `window.mclaw.dataApiKey.*`。
- [ ] **1.3** `src/lib/data-api-key-sync.ts`（新）：`ensureDataApiKey()` 严谨版（prefix 验证 + 同名清理 + create）。
- [ ] **1.4** `src/hooks/useDataApiKeyOnLogin.ts`（新）：登录成功后调 ensureDataApiKey，App 根挂载。
- [ ] **1.5** `process-launcher.ts`：env 注入 `MCLAW_DATA_API_KEY` + `MCLAW_DATA_BASE_URL`（与 deviceSecret 同处）。

### skill（4 个，复制改造）
- [ ] **2.1** `build/preinstalled-skills/query-service/scripts/query.py`（新）：18 query_type → Go 接口，标准库 urllib，双模式 key，X-API-Key 鉴权，输出 JSON。
- [ ] **2.2** `build/preinstalled-skills/query-service/SKILL.md`：改造 ooh-manus 原版——调用改 exec query.py、query_type 对齐 Go、双模式 key 说明、去掉内部标记。
- [ ] **2.3** `build/preinstalled-skills/query-service/reference.md`：字段含义、800米口径、时间粒度说明。
- [ ] **2.4** `build/preinstalled-skills/station-profile/SKILL.md`：站点画像展示指导。
- [ ] **2.5** `build/preinstalled-skills/data-fusion/SKILL.md`：多查询融合策略。
- [ ] **2.6** `build/preinstalled-skills/query-guide/SKILL.md`：自然语言→查询参数映射。
- [ ] **2.7** `resources/skills/preinstalled-manifest.json` + `build/preinstalled-skills/.preinstalled-lock.json`：登记 4 个新 skill。

### 验证
- [ ] **3.1** typecheck 通过。
- [ ] **3.2** 客户端登录后 keychain 有数据 API key、openclaw.json 无明文 key。
- [ ] **3.3** skill 脚本能从 env 读 key，调通 Go 后端各 query_type。
- [ ] **3.4** 安全验证：拿 openclaw.json 无法查数据（无 key 明文）；数据 key 能在非 mclaw（curl）直接用。

---

## 七、风险与边界

- **明文 key 一次性**：Create 接口只返回一次明文，客户端必须当场存 keychain。keychain 丢失（换机器/重装）→ 严谨流程会清理同名旧 key 后重建，不积累。
- **key 失效感知**：keychain 存的 key 可能被用户在 web 后台 revoke。严谨流程登录时用 prefix 比对 list 验证，失效自动重建。运行中 skill 调用 401 时，agent 会报错，用户重新登录触发重建。
- **env 暴露面**：数据 API key 经 env 注入 Gateway 子进程，与 deviceSecret 同暴露面。可接受（安全模型一致）。
- **skill 脚本依赖**：用 Python 标准库（urllib），避免依赖 httpx。OpenClaw 自带 Python 环境（pdf skill 已用 scripts/*.py 验证）。
- **预装 skill 分发**：放 `build/preinstalled-skills/`，electron-builder extraResources 拷到 `resources/preinstalled-skills/`，manifest 声明后启动时 `ensurePreinstalledSkillsInstalled` 部署到 `~/.mclaw/skills/`。已确认打包链。
- **老用户兼容**：已部署客户端升级后，首次登录 keychain 无 key → 自动 create，无感。
- **数据 key 通用性**：用户可在 mclaw 外用此 key 查数据（合法），扣自己额度。不绑 mclaw 是设计意图，非缺陷。

---

## 八、第二期（本期不做）

- skill 查询结果的前端资源 ID 块（`ooh-resources`）完整对接 mclaw 前端站点卡片渲染
- 数据查询的事前额度门（查前检查余量）
- skill 调用 401 时自动触发 ensureDataApiKey 重建（现靠重新登录）
