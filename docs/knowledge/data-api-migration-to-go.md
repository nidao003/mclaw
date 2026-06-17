# 数据 API 迁移至 Go 后端调研报告

> 调研时间：2026-06-17
> 决策方向：将 station-match-backend（Java）的 Query Service 数据接口**全部迁移至 mclaw Go 后端**，统一技术栈与计费体系。
> 计费模型：**按调用次数计费**（credit）。
> 状态：**调研完成，待评审**

---

## 1. 背景与目标

### 1.1 背景

mclaw 的 Skills 市场后续会持续新增大量技能，这些技能需要调用**数据 API**（目前已有"车站画像"接口，后续会扩展更多业务数据接口）。当前数据接口全部位于上层目录的 Java 后端 `station-match-backend` 的 `ruoyi-query-service` 模块。

### 1.2 核心诉求

1. **数据接口统一管理**：后续会不断增加新数据 API，希望收敛到一套后端，避免长期两套服务两套鉴权两套部署。
2. **API 请求计费**：按调用次数对数据 API 请求计费。
3. **Token 流量计费**：skill 执行时消耗的 LLM token 也要计费。
4. 两种计费统一在一个账单/用量体系里。

### 1.3 结论先行

- **架构方案**：方案 B——数据接口全部迁到 Go 后端（`mclaw/backend`）。
- **计费底座**：复用 Go 后端现有 `wallet` / `billing` / `subscription` 体系，**新增"按次计费"维度**。
- **用量统计**：复用现有 ClickHouse 基础设施，新增数据 API 用量表。
- **数据源**：Go 后端新增 MySQL driver，接 `ooh_data` 远程只读库。
- **迁移策略**：分阶段，车站画像优先，DSL 动态查询引擎单独评估。

---

## 2. 现状调研

### 2.1 Java 后端数据接口现状（Query Service）

**项目基线**：RuoYi-Vue-Plus 5.5.3（若依系增强版），Spring Boot 3.5.9 + Sa-Token 1.44 + MyBatis-Plus 3.5.16 + dynamic-datasource 4.3.1。单体多模块，最终打一个 `ruoyi-admin.jar`，生产 jar 直跑，端口 **6039**。

**数据查询接口全部集中在 `ruoyi-modules/ruoyi-query-service` 模块**，按业务域分组：

| 模块 | Controller | 路径前缀 | 接口数 | 数据来源 |
|------|-----------|---------|--------|---------|
| 车站画像 | StationController | `/api/station` | 5 | `sw_rim_station` + `sw_station_population` + 18 个 `sw_station_label_*` + `sw_station_business` + `sw_station_industry_data` |
| 城市 | CityController | `/api/city` | 7 | `sw_metro_cities` + `sw_rim_city` + `sw_metro_yearly_data` |
| 线路 | LineController | `/api/line` | 2 | `sw_rim_line` + `sw_rim_station_line_rel` |
| 业态 | BusinessController | `/api/business` | 2 | `sw_station_business` + `sw_station_business_detail` |
| 趋势 | TrendController | `/api/trend` | 3 | ooh_data（经 DSL 引擎） |
| **动态查询** | QueryController | `/api/query` | 5 | **DSL 引擎**（AGGREGATE/DISTRIBUTION/DETAIL 三模式，按 `query_metric` 元数据动态生成 SQL） |

**关键能力**：
- **DSL 动态查询引擎**：`/api/query/execute`，按 `metricCode` 查 `query_metric` 表元数据，动态生成聚合/分布/明细 SQL，带 EXPLAIN 防跑飞 + Redis 缓存。**加新指标零代码**——往 `query_metric` 表插一行，重启自动加载（`MetricRegistry.afterPropertiesSet`）。
- **车站画像聚合**：`StationServiceImpl.getStationDetail` 聚合 6 步查询，标签分布复用 DSL DISTRIBUTION 模式，`@Cacheable` 1 小时。
- **三重鉴权**（`QueryAuthService`）：Secret Token（服务间，给 AI agent）+ Sa-Token JWT（登录用户）+ 游客限流（日额度）。**无独立 appkey 层**，单一 `QUERY_SERVICE_SECRET_TOKEN`。

**双数据源**：
- `master` 库（`station_match_user`）：用户/系统/会员/订单 + `query_metric` 指标配置（读写）。
- `ooh_data` 库（远程 `192.168.3.115:3309`，**只读**）：所有 `sw_*` 业务数据。Mapper 标 `@DS("ooh_data")`。

**计费能力**：**几乎没有**。只有 member-service 的游客日额度 / 会员额度扣减，无 token 计费、无 API 按次计费、无用量统计基础设施。

### 2.2 Go 后端能力现状（mclaw/backend）

**技术栈**：GoYoko/web（echo 封装）+ samber/do（DI）+ entgo.io/ent（ORM）+ Postgres + Redis + **ClickHouse**（用量统计）+ RustFS（S3 对象存储）+ taskflow（任务引擎）。docker-compose 部署，backend 容器端口 **8888**，路由前缀 `/api/v1/*`。

**已有基础设施（迁移可直接复用）**：

| 能力 | 模块/文件 | 现状 |
|------|----------|------|
| **计费** | `biz/billing/usecase/billing.go` | `RecordUsageAndDeduct`：按 token 扣日额度（basic/pro/ultra）→ 钱包 credit。**已打通 token→额度→钱包链路** |
| **钱包** | `biz/wallet` + `db/wallet` | 余额、交易流水（`transactionlog`） |
| **订阅** | `biz/subscription` + `db/plan` | 套餐 + token quota 分档 |
| **支付** | `biz/payment` + `db/paymentorder` | 订单 |
| **LLM 代理 + token 捕获** | `biz/llmproxy/usage_capture.go` | 抓 SSE 流的 input/output/cache tokens |
| **用户 API Key** | `biz/user/handler/v1/apikey.go` + `db/userapikey` | 用户自助创建，`X-API-Key` / `Bearer` 双鉴权 |
| **鉴权中间件** | `middleware/auth.go` | `Auth()`(JWT/session) + `ApiKeyAuth()`(X-API-Key/Bearer) + `TeamAuth` + `AdminAuth` |
| **技能市场** | `biz/skill` + `db/skill`/`skillversion`/`skillrating`/`skillreview` | `/api/v1/skills` 全套（列表/下载/版本/安装/评分/审核/admin） |
| **用量统计** | ClickHouse `model_usage_events` 表 + `db/taskusagestat` | 模型调用用量落 CH |
| **模型定价** | `db/modelpricing` | 模型价格表 |

**db driver 现状**：`lib/pq`(Postgres) + `clickhouse-go` + `mattn/go-sqlite3` + ent。**无 MySQL driver**。
**ent schema**：54 个，建模风格统一（`entsql.Table` 注解 + `entx` cursor）。
**配置**：`config/server/config.yaml.example`，Postgres master、Redis、ClickHouse、对象存储、admin_token、session.secret。

### 2.3 数据源现状

**ooh_data 库**（远程只读 MySQL，32 张表）：

```
基础维度：sw_duration(季度)、sw_metro_cities、sw_metro_yearly_data、sw_city_ranking
路网：    sw_rim_line、sw_rim_station、sw_rim_station_line_rel、sw_rim_city/line/station_image
人口：    sw_station_population
画像标签(18)：sw_station_label_{sex,age,marriage,consume,catering_consumption,
          catering_price,education,income,occupation,children,child_age,property,
          phone_price,car,carrier,travel,work,business_preference}
业态：    sw_station_business、sw_station_business_detail、sw_industry_info
产业：    sw_station_industry_data
```

表结构脚本：`station-match-backend/docs/ooh_data_sw_station.sql`。

**query_metric 指标表**（44 个指标，存 master 库）：字段含 `metric_code`、`source_table`、`source_field`、`agg_func`、`time_field`、`default_filters`、`metric_group`、`description`、`person_type_label`。分组：人口指标(12)、客流指标(7)、标签指标(18)、业态指标等。脚本：`station-match-backend/docs/query_metric_v4_restructure.sql`。

---

## 3. 方案选型

| 维度 | 方案 A：Go 做计费网关 | **方案 B：数据接口全迁 Go** | 方案 C：Java 直连+各自计费 |
|------|---------------------|---------------------------|--------------------------|
| 数据查询 | Java 原样保留 | **Go 重写**（直连 ooh_data） | Java 保留 |
| 计费 | Go 网关层做 | **Go 统一做** | Java 从零写 |
| Token 计费 | Go（已有） | **Go（已有）** | 两套割裂 |
| 短期工作量 | 最小 | **大**（重写查询+DSL） | 中（Java 补计费） |
| 长期维护 | 两套服务 | **一套服务** | 两套计费 |
| 统一栈 | 否 | **是** | 否 |
| 重复造轮子 | 否 | 部分（DSL 引擎） | 是（计费） |

### 3.1 选 B 的理由（用户拍板）

1. **后续数据接口会持续大量增加**——长期看，每加一个接口都要在 Java 写一套 controller/service/mapper + 改两个拦截器排除路径，再让 Go 转发，两套服务两套鉴权两套部署，维护成本随接口数线性膨胀。统一到 Go 一套栈，长期省心。
2. **计费统一**：数据 API 按次计费 + LLM token 计费天然落在 Go 的 wallet/credit/ClickHouse 体系，一个账单一个用量看板。Java 没这底子，从零写不值当。
3. **技能市场已在 Go**：skill 注册/分发/安装全在 Go，数据 API 留在 Java 等于 skill 调数据要跨服务，链路割裂。

### 3.2 B 方案的真实成本（不能装看不见）

- **DSL 动态查询引擎重写**是最大一块。Java 那套 DSL（三模式 + 元数据驱动 + 动态 SQL + EXPLAIN + 缓存 + 18 标签分布复用）逻辑不简单，Go 重写约 1-2 人周。需单独评估是否值得（见 4.3）。
- **32 张只读表的查询逻辑迁移**：固定接口（车站/城市/线路/业态/趋势）约 19 个端点，逐个搬 SQL + 聚合逻辑，约 1 人周。
- **Go 接 MySQL**：加 driver + 配只读数据源，0.5 人天。
- **Java 不能整体下线**：若依管理后台（admin-web 用的 `/system/*`）还得保留，只是 Query Service 数据查询部分迁走。Java 侧 Query Service 模块迁完后可下线或保留兜底。

---

## 4. 方案 B 详细设计

### 4.1 数据源接入（ooh_data MySQL）

**问题**：Go 后端是 Postgres 栈，无 MySQL driver；ooh_data 是远程只读 MySQL。

**方案**：
1. `go.mod` 加 `github.com/go-sql-driver/mysql`。
2. `config.yaml` 新增 `ooh_data` 数据源配置（独立于 master postgres）：
   ```yaml
   ooh_data:
     dsn: "yaoyaobot:***@tcp(192.168.3.115:3309)/ooh_data?charset=utf8mb4&parseTime=true&loc=Asia%2FShanghai&readTimeout=30s"
     max_open_conns: 50
     max_idle_conns: 20
     readonly: true   # 强约束：只读账号 + 代码层禁写
   ```
3. **建模方式选择**（关键决策）：

   | 选项 | 做法 | 评价 |
   |------|------|------|
   | ent 建模 | 给 32 张 sw_* 表写 ent schema | ❌ 违背 YAGNI：32 张只读表全建 schema 太重，且 ooh_data 表结构由数据方维护、不归我们管 |
   | **裸 SQL + 轻量 struct** | `database/sql` + `sqlx` 风格手写查询 | ✅ **推荐**：只读、查询模式固定，KISS |

   固定接口用裸 SQL（参考 Java Mapper XML 的 SQL 直接搬），DSL 引擎用裸 SQL 动态拼接（同 Java 思路）。**不引入 ent 管理 ooh_data**，ent 只管 Go 自家 Postgres 业务库。

4. 新增 `pkg/oohdata`（或 `biz/data/repo`）封装只读连接池，`SELECT` 白名单，禁一切写操作。

### 4.2 接口迁移清单与优先级

迁移到 Go 后，路由前缀统一 `/api/v1/data/*`：

| 优先级 | Java 原路径 | Go 新路径 | 接口 | 复杂度 |
|--------|-----------|----------|------|--------|
| **P0** | `/api/station/{id}` | `/api/v1/data/stations/:id` | 车站完整画像（6 步聚合） | 高 |
| P0 | `/api/query/search-stations` | `/api/v1/data/stations/search` | 车站名搜索 | 低 |
| P1 | `/api/station/{id}/population` | `/api/v1/data/stations/:id/population` | 人口 | 低 |
| P1 | `/api/station/{id}/labels` | `/api/v1/data/stations/:id/labels` | 标签分布（复用 DSL） | 中 |
| P1 | `/api/station/{id}/business` | `/api/v1/data/stations/:id/business` | 业态汇总 | 低 |
| P1 | `/api/station/{id}/industry` | `/api/v1/data/stations/:id/industry` | 产业 | 低 |
| P2 | `/api/city/*` | `/api/v1/data/cities/*` | 城市 7 接口 | 中 |
| P2 | `/api/line/*` | `/api/v1/data/lines/*` | 线路 2 接口 | 低 |
| P2 | `/api/business/*` | `/api/v1/data/business/*` | 业态详情 2 接口 | 低 |
| P2 | `/api/trend/*` | `/api/v1/data/trends/*` | 趋势 3 接口（经 DSL） | 中 |
| **P3** | `/api/query/execute` | `/api/v1/data/query/execute` | **DSL 动态查询**（见 4.3） | 高 |
| P3 | `/api/query/metrics` | `/api/v1/data/metrics` | 指标列表 | 低 |
| P3 | `/api/query/city-durations` | `/api/v1/data/cities/:code/durations` | 季度可用性 | 低 |

**P0 先迁车站画像**——这是 skills 当前在用的，迁完即可让 skills 切到 Go，跑通计费闭环。

### 4.3 DSL 动态查询引擎迁移策略（需进一步评审）

**Java DSL 引擎现状**：`/api/query/execute` 接 `metricCode` → 查 `query_metric` 元数据 → 按 AGGREGATE/DISTRIBUTION/DETAIL 三模式动态生成 SQL → EXPLAIN 校验 → Redis 缓存 → 执行。`MetricRegistry` 启动加载所有指标到内存。

**Go 侧两种选择**：

- **B1：用 Go 重写 DSL 引擎**（推荐若后续新指标仍靠配置化）
  - 把 `query_metric` 表搬到 Go 的 Postgres master 库（或新建 `data_metric` 表）
  - Go 实现 `MetricRegistry` + 三模式 SQL 生成器 + EXPLAIN + 缓存
  - 优点：保留"加新指标零代码"能力，长期扩展性强
  - 成本：约 1-2 人周

- **B2：放弃 DSL，全部用固定接口**
  - 每个新指标需求都写一个固定 Go 接口
  - 优点：KISS，短期省事
  - 缺点：后续每加指标都要写代码，违背 Java 那边已验证的配置化思路

**建议**：先按 B1 规划，但 P0/P1/P2 阶段先用固定接口把核心查询搬过去并跑通计费，DSL 引擎作为 P3 单独迭代。是否重写 DSL 取决于"后续新指标的出现频率"——若每月都有新指标，B1 值得；若半年加一个，B2 够用。**此项待评审确认**。

### 4.4 鉴权设计

复用 Go 现有中间件，**零新增鉴权代码**：

```
skill 调用 → /api/v1/data/* → middleware.ApiKeyAuth()（X-API-Key / Bearer）
                                ↓
                         解析出 userID
                                ↓
                     billing.ChargeDataApiCall(userID, ...)
```

- **外部调用方**（skills、第三方）：用用户 API Key（`X-API-Key`），走 `ApiKeyAuth` 中间件，已有。
- **内部服务间**（若 ooh-manus/agent 还要调）：复用 `admin_token` 或新增内部 Secret Token，走 `AdminAuth` 风格。
- Java 那套 Secret Token/JWT/游客三重认证不再需要——Go 这边 ApiKeyAuth + 计费天然覆盖。

### 4.5 计费设计（按调用次数，新增维度）

**现状**：Go `billing.RecordUsageAndDeduct` 只支持按 LLM token 扣额度→钱包。数据 API 按"次"计费，模型不同，需新增维度。

**设计**：

1. **新增计费规则表**（ent schema，Postgres master）`data_api_pricing`：
   ```
   id | api_code (如 "station.detail") | credits_per_call | enabled | description
   ```
   每个数据接口配一个 credit 单价，可在 admin 后台调。

2. **billing 新增方法**：
   ```go
   // ChargeDataApiCall 按次计费：扣 wallet.Balance，记流水，记用量
   func (uc *billingUsecase) ChargeDataApiCall(ctx, userID, apiCode, refID string) error
   ```
   逻辑：查 `data_api_pricing` 拿单价 → 校验钱包余额 → `walletUsecase.Deduct` 扣 credit（交易类型新增 `TransactionDataApiConsumption`）→ 余额不足返 `ErrInsufficientCredit`。

3. **计费时机**：接口成功返回后扣费（失败不扣，避免争议）。在 data handler 的中间件/装饰器里统一拦截，按 `api_code` 计费。

4. **与 token 计费的关系**：两条独立扣费链路，都落同一个 `wallet`，同一份余额。用户充值一次，token 和数据 API 都从里面扣。`subscription` 套餐可分配"数据 API 每日免费次数额度"（类比 token quota），额度内免费、超出扣 credit——复用 subscription 的 quota 机制扩展。

5. **免费策略**：可对部分接口（如车站搜索）设 `credits_per_call=0` 免费引流。

### 4.6 用量统计（ClickHouse）

**现状**：Go 已有 ClickHouse `model_usage_events` 表记 LLM 用量。

**新增表** `data_api_usage_events`：
```sql
CREATE TABLE data_api_usage_events (
  event_time DateTime,
  user_id UUID,
  api_code String,
  ref_id String,          -- 如 stationId
  credits Int64,
  latency_ms UInt32,
  success UInt8,
  error_msg String
) ENGINE = MergeTree() ORDER BY (event_time, user_id);
```

每次调用异步落 CH，供 admin 用量看板查询。复用 Go 现有 ClickHouse 写入管道（`pkg/clickhouse`）。

### 4.7 缓存策略

照搬 Java 的思路：Go 侧用 Redis（已有）做缓存：
- 车站画像：按 `stationId + durationId` 缓存 1h。
- 指标元数据：启动加载到内存（`MetricRegistry`）。
- 城市基础信息：长缓存。

缓存命中仍可计费（可选：命中打折或免费，引导缓存复用）。

---

## 5. 迁移路径（分阶段）

| 阶段 | 内容 | 产出 | 验收 |
|------|------|------|------|
| **0. 基建** | Go 加 MySQL driver + ooh_data 只读数据源 + `data_api_pricing` 表 + billing 按次计费方法 + CH 用量表 | 计费闭环可跑 | 单元测试：调一次 mock 接口能扣 credit + 落 CH |
| **1. 车站画像** | 迁 P0：车站完整画像 + 车站搜索，裸 SQL 实现 + Redis 缓存 | `/api/v1/data/stations/*` 可用 | 对比 Java 返回结果一致；skill 切到 Go 跑通 |
| **2. 其余固定接口** | 迁 P1/P2：人口/标签/业态/产业/城市/线路/趋势 | `/api/v1/data/*` 全覆盖 | 逐接口对比 Java 结果 |
| **3. DSL 引擎** | 评估 B1/B2，按结论实现 DSL 动态查询 + 指标元数据迁移 | `/api/v1/data/query/execute` | 新增指标零代码验证 |
| **4. 切换下线** | skills / ooh-manus / uniapp 全部切到 Go 数据 API；Java Query Service 下线或保留兜底 | 单一数据入口 | Java Query Service 流量为零后下线 |

**每个阶段都能独立交付、独立验收**，不搞大爆炸式上线。

---

## 6. 风险与坑

| 风险 | 影响 | 应对 |
|------|------|------|
| ooh_data 远程库网络延迟（115:3309） | 接口慢 | Redis 缓存 + 连接池；极端情况评估本地只读副本 |
| DSL 引擎重写成本 | 阶段 3 工期不确定 | 先固定接口跑通，DSL 单独评估 B1/B2 |
| 计费精度争议 | 按次计费可能对"返回数据量差异大"的接口不公 | 先按次，后续按需给特定接口改按量；命中缓存免费 |
| Java 不能整体下线 | 若依管理后台还在用 | 只迁 Query Service，admin-web 用的 `/system/*` 保留 |
| 迁移期两套并存 | 数据一致性、双计费 | 灰度切流，新旧并行比对结果；计费只在 Go 侧计，Java 侧迁完即停计 |
| ooh_data 表结构变动 | 数据方改表 | 只读账号 + 代码层抽象，改表时同步更新 Go 查询 |
| Go 接 MySQL 的只读安全 | 误写 | 只读 DB 账号 + repo 层只暴露 SELECT 方法 + CI 检查 |

---

## 7. 待确认事项

1. **DSL 引擎是否重写（B1/B2）**：取决于后续新指标出现频率，需业务方确认。—— **阻塞阶段 3**
2. **skills 调数据 API 的链路**：mclaw 桌面端直接 fetch Go 网关（带用户 API Key）？还是经 agent 中转？影响 API Key 注入方式。—— **影响阶段 1 鉴权对接**
3. **计费单价规则**：每个数据接口定多少 credit？是否有每日免费额度？需产品/业务定。—— **影响阶段 0 计费规则**
4. **Java Query Service 迁完是否完全下线**：还是保留给 admin-web/uniapp 兜底？uniapp 是否也切 Go？—— **影响阶段 4**
5. **ooh_data 是否需要本地只读副本**：远程库延迟若不可接受，是否在 Go 部署机搭 MySQL 只读副本。—— **影响阶段 0 数据源**
6. **query_metric 指标元数据落库位置**：搬 Go 的 Postgres master，还是单独库？—— **影响阶段 3**

---

## 8. 关键文件索引

### Java 后端（station-match-backend）
- Query Service 模块：`ruoyi-modules/ruoyi-query-service/`
- 车站画像：`.../query/controller/StationController.java`、`.../query/service/impl/StationServiceImpl.java`
- DSL 引擎：`.../query/controller/QueryController.java`、`.../query/service/impl/QueryServiceImpl.java`、`.../query/service/MetricRegistry.java`
- 鉴权：`.../query/service/QueryAuthService.java`、`.../query/config/QueryWebMvcConfig.java`
- 双数据源：`ruoyi-admin/src/main/resources/application-dev.yml`
- ooh_data 表结构：`docs/ooh_data_sw_station.sql`
- 指标表：`docs/query_metric_v4_restructure.sql`
- 接口文档：`docs/QUERY_SERVICE_API.md`、`docs/查询服务完整使用指南.md`、`docs/ooh-manus对接指南-query-service-v2.1.md`

### Go 后端（mclaw/backend）
- 计费：`biz/billing/usecase/billing.go`、`domain/subscription.go`
- 钱包：`biz/wallet/`、`db/wallet/`
- LLM 用量捕获：`biz/llmproxy/usage_capture.go`
- 鉴权中间件：`middleware/auth.go`（`Auth`/`ApiKeyAuth`/`TeamAuth`/`AdminAuth`）
- 用户 API Key：`biz/user/handler/v1/apikey.go`、`db/userapikey/`
- 技能市场：`biz/skill/handler/v1/skill.go`（`/api/v1/skills`）
- 用量统计：ClickHouse `model_usage_events`、`pkg/clickhouse/`
- ent schema：`ent/schema/`（54 个）
- 配置：`config/server/config.yaml.example`
- 部署：`docker-compose.yml`、`cmd/server/main.go`、`bridge.go`

---

## 9. 老王的点评

艹，这事儿长期看是对的——数据接口越加越多，迟早得收敛到一套栈，早迁早享受 Go 那套现成的计费/钱包/用量基础设施，省得 Java 那边从零撸一套还跟 Go 割裂。但别头脑发热一把梭：**阶段 0 计费闭环 + 阶段 1 车站画像先跑通**，证明整条链路（鉴权→查数据→按次计费→落用量）能跑，再批量搬其余接口。DSL 引擎那个大坑单独评审，别让它拖死前两阶段。

待确认那 6 条先拉个会拍板，尤其 DSL 重写和计费单价——这俩不定，阶段 0/3 没法动。
