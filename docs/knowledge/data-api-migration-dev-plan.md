# 数据 API 迁移 + API 文档页 开发计划

> 编写时间：2026-06-17
> 上游调研报告：`docs/knowledge/data-api-migration-to-go.md`
> 范围：将 Java 后端指定 18 个数据查询接口迁移到 mclaw Go 后端（按次计费 + API Key 鉴权），并在 web 端「定价」前新增「API 文档」页面。
> 状态：**待评审**

---

## 0. 本次范围（边界，先钉死）

### 0.1 迁移的 Java 接口（共 18 个端点）

来源：`station-match-backend` 的 `ruoyi-query-service` 模块。

**车站组（5 个，StationController）**

| # | Java 原路径 | Go 新路径 | 数据源 |
|---|------------|----------|--------|
| 1 | `GET /api/station/{stationId}` | `GET /api/v1/data/stations/:id` | ooh_data（6步聚合） |
| 2 | `GET /api/station/{stationId}/population` | `GET /api/v1/data/stations/:id/population` | ooh_data |
| 3 | `GET /api/station/{stationId}/labels` | `GET /api/v1/data/stations/:id/labels` | ooh_data（标签分布，见 0.3） |
| 4 | `GET /api/station/{stationId}/business` | `GET /api/v1/data/stations/:id/business` | ooh_data |
| 5 | `GET /api/station/{stationId}/industry` | `GET /api/v1/data/stations/:id/industry` | ooh_data |

**城市组（7 个，CityController，均吃 cityCode 路径参数——支持数字编码如 110100 或拼音如 beijing）**

| # | Java 原路径 | Go 新路径 | 说明 |
|---|------------|----------|------|
| 12 | `GET /api/city/{cityCode}` | `GET /api/v1/data/cities/:code` | 城市基本信息（名称/logo/线路数/车站数/客运量） |
| 13 | `GET /api/city/{cityCode}/all` | `GET /api/v1/data/cities/:code/all` | 城市全部历史记录 |
| 14 | `GET /api/city/{cityCode}/passenger-flow` | `GET /api/v1/data/cities/:code/passenger-flow` | 客流（不传 yearMonth 返回最新一天；传返回当月每日） |
| 15 | `GET /api/city/{cityCode}/top-flow` | `GET /api/v1/data/cities/:code/top-flow` | 历史最高客流 |
| 16 | `GET /api/city/{cityCode}/yearly-flow` | `GET /api/v1/data/cities/:code/yearly-flow` | 历年日均客流 |
| 17 | `GET /api/city/{cityCode}/lines` | `GET /api/v1/data/cities/:code/lines` | 城市线路列表 |
| 18 | `GET /api/city/{cityCode}/stations` | `GET /api/v1/data/cities/:code/stations` | 城市车站列表（分页 page/pageSize） |

**线路组（2 个，LineController）**

| # | Java 原路径 | Go 新路径 | 数据源 |
|---|------------|----------|--------|
| 8 | `GET /api/line/{lineId}` | `GET /api/v1/data/lines/:id` | ooh_data |
| 9 | `GET /api/line/{lineId}/stations` | `GET /api/v1/data/lines/:id/stations` | ooh_data（按顺序） |

**业态组（2 个，BusinessController）**

| # | Java 原路径 | Go 新路径 | 数据源 |
|---|------------|----------|--------|
| 10 | `GET /api/business/station/{stationId}` | `GET /api/v1/data/stations/:id/business-summary` | ooh_data |
| 11 | `GET /api/business/station/{stationId}/detail` | `GET /api/v1/data/stations/:id/business-detail` | ooh_data |

**查询组（2 个，QueryController）**

| # | Java 原路径 | Go 新路径 | 数据源 |
|---|------------|----------|--------|
| 6 | `GET /api/query/search-stations` | `GET /api/v1/data/stations/search` | ooh_data（模糊+城市过滤） |
| 7 | `GET /api/query/city-durations` | `GET /api/v1/data/cities/durations` | ooh_data |

> ⚠️ 命名澄清：Java 有两套业态接口——`/api/station/{id}/business`（StationController，List<BusinessSummary>）和 `/api/business/station/{id}`（BusinessController，List<BusinessVO>）。Go 侧为避免冲突，BusinessController 的两个改名为 `business-summary` / `business-detail`。
> ⚠️ cityCode 说明：城市接口的 `cityCode` 支持数字编码（110100）或拼音（beijing），Go 侧查询 `sw_metro_cities` / `sw_rim_city` 时需兼容两种编码（与 Java `ICityService.getCityDetail` 逻辑一致）。

### 0.2 本次**不迁移**的接口（明确排除）

- `/api/query/execute`（DSL 动态查询引擎）—— 复杂，单独评估，不在本次。
- `/api/query/metrics`、`/api/query/cache`、`/api/trend/*` —— 用户未点名，不迁。
- 任何 admin/CRUD 接口。
- 注意：`/api/city/*` 的 **7 个接口全部迁移**（本次范围内）；`/api/query/city-durations` 也迁。

### 0.3 labels 接口的 DSL 依赖处理（关键决策）

Java 的 `getLabels` 复用 DSL DISTRIBUTION 模式：`StationServiceImpl` 用 `RESIDENT_LABEL_TABLES`/`VISITOR_LABEL_TABLES` 两个静态 Map（18+5 个标签→表名映射），为每个标签构建一个 DISTRIBUTION DSL 交给 `queryService.execute(dsl)` 跑。

**本次不迁 DSL 引擎**，labels 接口改用**固定 SQL 直查**：把 23 个标签表的查询写成固定 SQL（标签表结构高度一致：`station_id` + 各标签维度 + 占比/人数字段），在 Go 侧维护一份标签→表名→SQL 的映射（照搬 Java 静态 Map），循环查询组装。**功能等价、不依赖 DSL 引擎**，KISS。

---

## 1. 数据源配置（照搬 Java，只读）

### 1.1 Java 现有配置（来源 `application-dev.yml:79-85`）

```yaml
ooh_data:
  driverClassName: com.mysql.cj.jdbc.Driver
  url: jdbc:mysql://192.168.3.115:3309/ooh_data?useUnicode=true&characterEncoding=utf8&zeroDateTimeBehavior=convertToNull&useSSL=false&serverTimezone=Asia/Shanghai&connectTimeout=5000&socketTimeout=30000&allowPublicKeyRetrieval=true
  username: yaoyaobot
  password: yaoyaobotb3505
```

特点：**只读账号**、远程库、Asia/Shanghai 时区、5s 连接超时 / 30s socket 超时、HikariCP maxPoolSize=20/minIdle=10。

### 1.2 Go 侧配置改造

**① 依赖**：`go.mod` 加
```
github.com/go-sql-driver/mysql
github.com/jmoiron/sqlx   // 轻量 struct 扫描，比裸 database/sql 好用
```

**② Config 结构**（`config/config.go`）：`Database` 结构体新增字段
```go
type Database struct {
    Master          string `mapstructure:"master"`
    Slave           string `mapstructure:"slave"`
    OohData         OohDataDS `mapstructure:"ooh_data"`  // 新增
    MaxOpenConns    int    `mapstructure:"max_open_conns"`
    MaxIdleConns    int    `mapstructure:"max_idle_conns"`
    ConnMaxLifetime int    `mapstructure:"conn_max_lifetime"`
}

type OohDataDS struct {
    DSN          string `mapstructure:"dsn"`
    MaxOpenConns int    `mapstructure:"max_open_conns"`
    MaxIdleConns int    `mapstructure:"max_idle_conns"`
}
```

**③ `config.yaml`** 新增（生产用环境变量 `MCAI_DATABASE_OOH_DATA_DSN` 注入）：
```yaml
ooh_data:
  dsn: "yaoyaobot:yaoyaobotb3505@tcp(192.168.3.115:3309)/ooh_data?charset=utf8mb4&parseTime=true&loc=Asia%2FShanghai&timeout=5s&readTimeout=30s&allowOldPasswords=true"
  max_open_conns: 20
  max_idle_conns: 10
```

**④ 只读连接池**：新增 `pkg/oohdata/client.go`，封装 `sqlx.DB` 连接池。**只读安全约束**：
- repo 层只暴露 `Query`/`QueryRow`/`Select` 方法，**不提供任何 Exec/Insert/Update/Delete**。
- 依赖 DB 账号本身只读（`yaoyaobot` 无写权限）双重保险。
- 连接池参数照 Java：maxOpen 20 / maxIdle 10 / connMaxLifetime 30min。

**⑤ 注册**：`pkg/register.go` 的 `RegisterInfra` 里 provide `*oohdata.Client`。

> 注意时区：Go DSN 用 `loc=Asia%2FShanghai` + `parseTime=true`，保证时间字段解析与 Java 一致。

---

## 2. Go 后端：新增 `biz/data` 数据查询模块

### 2.1 模块结构（照 `biz/skill` 脚手架，KISS + 单一职责）

```
biz/data/
├── register.go              # ProvideData / InvokeData
├── handler/v1/
│   ├── data.go              # DataHandler，注册 /api/v1/data/* 路由
│   ├── station.go           # 车站相关 handler 方法
│   ├── line.go              # 线路
│   ├── business.go          # 业态
│   └── city.go              # 城市 durations + 车站搜索
├── usecase/
│   ├── station.go           # 车站画像聚合（6步，带 Redis 缓存）
│   ├── line.go
│   ├── business.go
│   └── query.go             # 车站搜索 / city-durations
├── repo/
│   └── ooh_repo.go          # 封装 *oohdata.Client，纯 SQL 查询
└── model/
    └── vo.go                # VO 结构（StationVO/LineVO/BusinessVO...，字段对齐 Java）

domain/
└── data.go                  # 接口定义：StationUsecase / LineUsecase / ...

pkg/oohdata/
└── client.go                # MySQL 只读连接池
```

### 2.2 SQL 迁移（核心，照搬 Java Mapper XML）

每个接口的 SQL 直接从 Java `resources/mapper/query/*.xml` 原样翻译成 Go（`sqlx` 占位符 `?`）。重点：

- **车站画像**（`/api/v1/data/stations/:id`）：`StationServiceImpl.getStationDetail` 的 6 步聚合照搬——基础信息 + 4类人口 + 常驻18标签 + 到访5标签 + 业态汇总 + 产业数据。标签部分循环 23 张 `sw_station_label_*` 表查分布（见 0.3）。`@Cacheable` 对应 Go 侧 Redis 缓存 key `data:station:{id}:{durationId}`，TTL 1h。
- **车站搜索**：模糊 `LIKE` + 可选城市过滤 + limit≤50。
- **city-durations**：`sw_duration` + `sw_metro_cities` 关联。
- **线路/线路车站**：`sw_rim_line` + `sw_rim_station` + `sw_rim_station_line_rel`（按顺序）。
- **业态汇总/详情**：`sw_station_business` + `sw_station_business_detail`。

### 2.3 鉴权（复用，零新增）

`/api/v1/data/*` 路由组挂 `middleware.ApiKeyAuth()`（`middleware/auth.go:118`），支持 `X-API-Key` 或 `Authorization: Bearer`。解析出 `userID` 透传给计费层。

```go
// biz/data/handler/v1/data.go
func RegisterDataRoutes(w *web.Web, h *DataHandler, auth *middleware.AuthMiddleware, ...) {
    g := w.Group("/api/v1/data", auth.ApiKeyAuth(), billingMiddleware)  // ApiKey 鉴权 + 计费中间件
    g.GET("/stations/search", web.BaseHandler(h.SearchStations))
    g.GET("/stations/:id", web.BaseHandler(h.GetStation))
    // ... 其余 9 个
}
```

### 2.4 计费（按调用次数，本次新增维度）

**① 新增 ent schema** `ent/schema/data_api_pricing.go`（落 Go 的 Postgres master 库）：
```go
// DataApiPricing 数据 API 按次计费单价
type DataApiPricing struct{ ent.Schema }
// fields: id(uuid), api_code(string,唯一), name(string), credits_per_call(int64),
//         category(string), enabled(bool), description(string), created_at, updated_at
```
`api_code` 对应 11 个接口的标识（如 `station.detail`、`station.search`、`line.detail`...）。

**② 初始化数据**：migration 里 seed 11 行单价。**单价待业务定**（见待确认），先全设占位值（如 1 credit/次），后台可调。

**③ billing 装饰器**（`biz/data/handler/v1/billing.go`）：echo 中间件，按 matched route → `api_code` → 查 `data_api_pricing` 单价 → 接口成功返回后 `walletUsecase.Deduct(ctx, userID, consts.TransactionDataApiConsumption, credits, "数据API: "+apiCode, refID)`。余额不足返 `ErrInsufficientCredit`（HTTP 402，对齐 RedFox 的 3201 积分不足语义）。

> 复用现有 `walletUsecase.Deduct`（`biz/wallet/usecase/wallet.go:207`），`consts` 新增 `TransactionDataApiConsumption` 交易类型。计费与 LLM token 计费共用同一个 wallet 余额。

**④ 计费时机**：接口成功（HTTP 2xx）才扣费，失败不扣。缓存命中可配置是否计费（默认计费，便于统计；可后续调）。

### 2.5 用量统计（ClickHouse，本次新增表）

新增 migration `migration/clickhouse_*/data_api_usage_events.sql`：
```sql
CREATE TABLE IF NOT EXISTS data_api_usage_events (
  event_time DateTime,
  user_id    UUID,
  api_code   String,
  ref_id     String,
  credits    Int64,
  latency_ms UInt32,
  success    UInt8,
  error_msg  String
) ENGINE = MergeTree() ORDER BY (event_time, user_id);
```
billing 中间件异步落 CH（复用 `pkg/clickhouse` 写入管道，参考 `modelusage.Recorder`）。供 admin 用量看板后续接入。

### 2.6 缓存

复用现有 Redis（`*redis.Client`）。车站画像等重查询按 Java 的 `@Cacheable` 策略：key `data:station:{id}:{durationId}`，TTL 1h。在 usecase 层手动 get/set（Go 没有 Spring 注解，手写最简单）。

---

## 3. Web 端：新增「API 文档」页面

### 3.1 位置

在顶部导航「定价」**前面**加「API 文档」项。导航定义在 `apps/web/src/components/layout/Layout.tsx:9-13`：
```ts
const navItems = [
  { label: '技能热榜', path: '/skills/trending' },
  { label: '全部技能', path: '/skills' },
  { label: 'API 文档', path: '/apis' },      // ← 新增
  { label: '定价', path: '/pricing' },
];
```
同步改 `Layout.tsx:220-227` 的 footer 链接区。

### 3.2 路由

`apps/web/src/App.tsx:34` 前插：
```tsx
<Route path="apis" element={<ApiDocs />} />
<Route path="pricing" element={<Pricing />} />
```

### 3.3 页面设计（仿 RedFox `https://redfox.hk/apis/douyin/0OT1E306`）

**三栏布局**（参考 RedFox，落地为 mclaw 品牌色 `#EE7C4B`，遵循 `docs/skills-hub-DESIGN.md` 暖奶油画布风格）：

```
┌─────────────────────────────────────────────────────────────┐
│ 顶部：标题「API 文档」 + BASE URL 代码块（https://<api-host>） │
├──────────┬──────────────────────────────────────────────────┤
│ 左侧栏    │  右侧主区（单个接口详情）                          │
│ 分类+接口 │                                                  │
│          │  • 接口标题 + 「X 积分/次」 + 「需配置 API Key」徽章│
│ ▼ 车站画像│  • 接口描述                                       │
│   · 车站详│  • METHOD + 完整 URL                              │
│   · 人口  │  • API 密钥获取与配置（步骤：控制台→API密钥→请求头）│
│   · 标签  │  • 请求头表格（X-API-Key / Content-Type）         │
│   · 业态  │  • 请求参数表格（参数/类型/必填/说明/示例）        │
│   · 产业  │  • 响应字段表格（字段/类型/说明/示例）             │
│ ▼ 线路    │  • 请求示例（curl 代码块）                         │
│   · 线路详│  • 响应示例（JSON 代码块）                         │
│   · 线路站│  • 常见状态码（401鉴权失败/402积分不足/...）       │
│ ▼ 业态    │  • 「导出 API 文档」按钮（导出 Markdown）          │
│ ▼ 查询    │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**分类（左侧栏，对应 18 个接口的分组）**：
- 车站画像（5）：车站详情/人口/标签/业态汇总/产业
- 城市（7）：城市基本信息/全部历史/客流/最高客流/历年日均/线路列表/车站列表
- 线路（2）：线路详情/线路车站
- 业态（2）：业态汇总（BusinessVO）/业态详情
- 查询（2）：车站搜索/城市季度可用性

**接口数据源**：接口元信息（标题/描述/参数/响应字段/示例/单价）建议**用 Go 后端接口动态拉取**，而不是前端硬编码——新增 `GET /api/v1/data/docs`（公开免鉴权）返回所有接口的文档元数据 + 单价，前端渲染。这样加新接口只需后端注册，文档页自动更新（DRY）。`data_api_pricing` 表加文档字段（`name`/`description`/`params_json`/`response_fields_json`/`example_request`/`example_response`）或单独 `data_api_doc` 表。

> 折中：本次为赶进度可**先前端硬编码 11 个接口的文档 JSON**（一个 `apisData.ts` 常量），跑通页面；后续再改成后端动态。两种方案在计划里都列出，评审时定。

### 3.4 文件清单

```
apps/web/src/pages/Apis/
├── index.tsx              # ApiDocs 主页（三栏布局）
├── components/
│   ├── Sidebar.tsx        # 左侧分类+接口列表
│   ├── ApiDetail.tsx      # 右侧接口详情
│   ├── ParamTable.tsx     # 通用参数/响应字段表格
│   └── CodeBlock.tsx      # curl/JSON 代码块（带复制）
└── data/
    └── apisData.ts        # 11个接口的文档元数据（初期硬编码）
```

---

## 4. 分阶段任务（每阶段独立可验收）

### 阶段 0：基建（无业务逻辑，纯脚手架）
- [ ] **Git 补跟踪**：先把 apps/、src/、.claude/、.agents/、docs/ 等未进 git 的文件 `git add` 纳入版本管理（排除 node_modules/dist/dist-electron/.playwright-mcp 编译缓存）。先提交一次干净基线，再开干。
- [ ] Go：加 `go-sql-driver/mysql` + `sqlx` 依赖
- [ ] Go：`config` 加 `OohData` 数据源 + `config.yaml` 配置 + 环境变量
- [ ] Go：`pkg/oohdata/client.go` 只读连接池 + 注册到 `RegisterInfra`
- [ ] Go：连通性验证——写个临时 health 接口查 `sw_rim_station` 一条数据
- [ ] Go：新增 ent schema `data_api_pricing` + migration + seed 18 行（单价占位）
- [ ] Go：`consts` 加 `TransactionDataApiConsumption`
- [ ] Go：ClickHouse migration `data_api_usage_events` 表
- **验收**：go build 通过；连上 ooh_data 能查出车站；pricing 表有 11 行。

### 阶段 1：车站画像 P0（最高优先，skills 在用）
- [ ] 迁 `/api/station/{id}`（6步聚合 + Redis 缓存）
- [ ] 迁 `/api/query/search-stations`（车站搜索）
- [ ] `biz/data` 模块骨架（register/handler/usecase/repo/model）
- [ ] `/api/v1/data/*` 路由组挂 `ApiKeyAuth` + billing 中间件
- [ ] billing 中间件：按 `api_code` 扣 credit + 落 CH
- [ ] 对比 Java 返回结果逐字段一致
- **验收**：带 API Key 调 `/api/v1/data/stations/:id` 返回与 Java 一致；扣了 credit；CH 有用量记录；余额不足返 402。

### 阶段 2：其余 16 个接口
- [ ] 车站 population/labels(固定SQL)/business/industry（4个）
- [ ] 城市 7 个：city/all/passenger-flow/top-flow/yearly-flow/lines/stations（7个，注意 cityCode 数字+拼音兼容）
- [ ] city-durations + line + line/stations + business 两个（5个）
- [ ] 逐个对比 Java 结果
- **验收**：18 个接口全部可用，结果与 Java 一致，全部走计费。

### 阶段 3：Web API 文档页
- [ ] `pages/Apis` 页面骨架 + 三栏布局
- [ ] `apisData.ts` 硬编码 18 个接口文档元数据（或后端 `/data/docs`）
- [ ] 导航 `Layout.tsx` 加「API 文档」+ 路由 `App.tsx` 加 `/apis`
- [ ] 接口详情渲染（参数表/响应表/curl示例/JSON示例/状态码）
- [ ] 「导出 API 文档」按钮
- [ ] 移动端响应式（参考 skills-hub-DESIGN 断点）
- **验收**：浏览器打开 `/apis`，左侧分类切换，右侧接口详情完整，单价/Key 标识清晰。

### 阶段 4：联调与切换
- [ ] skills 调用切到 Go 数据 API（带 API Key）
- [ ] Java 侧这 11 个接口观察流量，确认无调用后可下线标记（Java 暂不删，留兜底）
- [ ] 文档/changelog 更新
- **验收**：端到端跑通，skill 能用 Go 接口拿到车站画像并完成计费。

---

## 5. 风险与坑

| 风险 | 应对 |
|------|------|
| ooh_data 远程库网络延迟（115:3309） | Redis 缓存 + 连接池；本地开发需能连内网 |
| labels 固定 SQL 与 Java DSL 结果不一致 | 阶段 2 重点对比 23 张标签表结果；DSL 的 DISTRIBUTION 聚合逻辑要 1:1 翻译 |
| 时区不一致导致时间字段偏移 | Go DSN `loc=Asia/Shanghai` + `parseTime=true`，与 Java 对齐 |
| 计费扣费时机争议（缓存命中是否计费） | 默认成功即计费；后续按需配置 |
| 单价未定 | 阶段 0 先占位 1 credit，业务定后调表 |
| Go 仓库前端未进 git | apps/web 在磁盘但 .gitignore 未含；本次改动需确认是否提交（见待确认 #5） |
| BusinessController 与 StationController 业态接口语义重叠 | Go 侧改名 `business-summary`/`business-detail` 区分 |

---

## 6. 待确认事项

1. **数据 API 计费单价**：11 个接口各定多少 credit/次？是否有每日免费额度？—— **阻塞阶段 0 seed**
2. **API 文档元数据来源**：前端硬编码 `apisData.ts`（快）还是后端 `GET /api/v1/data/docs` 动态（DRY，加接口自动更新）？—— **影响阶段 3 设计**
3. **缓存命中是否计费**：默认计费 / 免费引导缓存？—— **影响阶段 1 billing**
4. **API Key 鉴权对未登录用户的处理**：RedFox 是控制台生成 key 即可调（无需登录态）。mclaw 的 `ApiKeyAuth` 是否支持纯 key 调用（不依赖 session）？需确认 `middleware/auth.go:118` 的 `ApiKeyAuth` 在无 session 时能否纯靠 X-API-Key 鉴权。—— **影响阶段 1 鉴权**
5. **未跟踪源码补提交**（已确认）：用户明确"本地除编译和缓存外其他都要进 git，包括 .claude、agents 等"。现状：mclaw 仓库 apps/src/docs/packages 大部分已跟踪，但有一批**新源码未提交**——backend 的 expert 模块/skill service、apps 的动画组件和专家页、packages/shared 的 expert 组件、docs/changelog 及迁移文档等。`.playwright-mcp/` 是浏览器快照缓存要加进 .gitignore。**阶段 0 先补 .gitignore（加 `.playwright-mcp/`、`*.png` 截图按需）+ `git add` 这批未跟踪源码，提交一次干净基线**。—— **影响所有阶段交付**
6. **生产环境 ooh_data 连接信息**：dev 是 192.168.3.115:3309，生产（133 服务器 / 公网）地址账号是否一致？需走环境变量注入。—— **影响阶段 4 部署**
7. **接口返回结构是否统一**：Java 用 `R<T>`（code/msg/data），Go 是否对齐成同样 envelope？还是 Go 用自己的 JSON 结构？影响前端/skill 解析。—— **影响阶段 1 设计**

---

## 7. 关键文件索引

### Java 源（迁移参考）
- 接口清单：`station-match-backend/ruoyi-modules/ruoyi-query-service/src/main/java/org/dromara/query/controller/{Station,City,Query,Line,Business}Controller.java`
- 聚合逻辑：`.../query/service/impl/StationServiceImpl.java`（getStationDetail 6步、RESIDENT/VISITOR_LABEL_TABLES）
- SQL：`.../ruoyi-query-service/src/main/resources/mapper/query/*.xml`
- 数据源配置：`station-match-backend/ruoyi-admin/src/main/resources/application-dev.yml:79-85`
- 表结构：`station-match-backend/docs/ooh_data_sw_station.sql`

### Go 目标（改造/新增）
- Config：`config/config.go:259`（Database 结构加 OohData）
- 基建注册：`pkg/register.go:42`（RegisterInfra）
- 鉴权中间件：`middleware/auth.go:118`（ApiKeyAuth）
- 钱包扣费：`biz/wallet/usecase/wallet.go:207`（Deduct）
- 计费参考：`biz/billing/usecase/billing.go`（RecordUsageAndDeduct）
- 用量统计参考：`pkg/register.go:147`（clickhouse + modelusage）
- 模块脚手架参考：`biz/skill/register.go`、`biz/skill/handler/v1/skill.go`
- ent schema 参考：`ent/schema/skill.go`

### Web 目标（新增/改造）
- 导航：`apps/web/src/components/layout/Layout.tsx:9-13`（navItems）、`:220-227`（footer）
- 路由：`apps/web/src/App.tsx:34`（pricing 前插 apis）
- 新页：`apps/web/src/pages/Apis/`（新建）
- 设计规范：`docs/skills-hub-DESIGN.md`（暖奶油画布 + 地铁橙）
- 参考：RedFox `https://redfox.hk/apis/douyin/0OT1E306`（三栏 + 标价 + Key + 状态码）

---

## 8. 老王的点评

艹，这活儿不复杂但活儿细——11 个接口 SQL 照搬、计费复用现成轮子、web 页仿 RedFox。最大的两个坑是 **labels 的 DSL→固定SQL 翻译**（23 张表结果必须 1:1）和 **时区/返回结构对齐**（Java R<T> vs Go）。阶段 0 基建 + 阶段 1 车站画像先跑通计费闭环，证明链路通了再批量搬。待确认 7 条里，**单价**、**文档元数据来源**、**ApiKeyAuth 纯 key 鉴权**、**前端是否进 git** 这 4 条最卡——先拍板，老王就开干。
