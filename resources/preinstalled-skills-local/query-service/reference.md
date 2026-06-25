# query-service 进阶参考

> 本文档为 progressive disclosure 的进阶细节。日常查询看 SKILL.md 即可，需要解释字段含义/口径/时间粒度时再查此处。

## 数据口径

### 800 米半径

车站级数据（`station_population`、`station_labels`、`station_business`、`business_summary`、`business_detail`、`station_industry`）默认采集范围为**车站中心 800 米半径圆形区域**。这是所有车站级统计的空间基准，向用户解释数据时务必点明口径，避免与"车站本身"或"行政区"混淆。

### 人口类型 personType

| 值 | 含义 | 说明 |
|----|------|------|
| `1` | 常驻人口 | 长期驻留，默认 |
| `2` | 到访人口 | 短期来访 |
| `3` | 工作人口 | 工作日白天聚集 |
| `4` | 居住人口 | 夜间居住 |

`station_labels` 不传 `personType` 返回全部；常驻 18 个标签，到访 5 个标签。

## 时间粒度

### 季度 durationId

车站级接口（`station_profile`/`station_population`/`station_labels`/`station_business`/`business_summary`/`business_detail`/`station_industry`）使用季度粒度，由 `durationId` 标识。

- 不传 `durationId` → 后端返回最新激活季度数据
- 用户明确指定季度 → **必须**先调 `city_durations` 拿到对应 `durationId`，**绝不编造 ID**
- `durationId` 来自 `sw_duration` 表，是后端内部季度主键

### 月度 yearMonth

仅 `city_passenger_flow` 支持，格式 `yyyy-MM`（如 `2026-03`），返回该月每日数据。不传则返回最新一天。

车站级接口**不接受** `yearMonth`，只有季度粒度。用户问"某月车站数据"时，告知该项只有季度粒度，给出最近季度数据。

## 城市编码 code / cityCode

6 位行政区划数字码，例如：

| 城市 | code |
|------|------|
| 北京 | 110100 |
| 上海 | 310100 |
| 青岛 | 370200 |
| 广州 | 440100 |
| 南京 | 320100 |

**不要**传拼音或缩写（`qingdao`/`QD` 无效）。用户给中文城市名时优先用 `cityName`，脚本会透传给后端做名称匹配。

## 线路 ID

`city_lines` 返回每条线路的 `id`（原始线路 ID，大整数），用于 `line_info` / `line_stations` 的 `--id` 参数。**不要**用线路序号或自编 ID。

## 资源 ID 传递

车站/线路/城市的原始 ID 是前端渲染站点卡片、跨轮对话上下文的关键。从 `search_stations`、`station_profile`、`city_lines`、`line_info` 等返回里拿到的 `stationId`/`cityCode`/`cityId`/`lineId` 必须**原样保留**，不要四舍五入或转成字符串歧义格式。多车站场景按用户提及顺序对应。

## 接口清单（18 个）

| query_type | 路径 | 必填 | 可选 |
|------------|------|------|------|
| search_stations | `/stations/search` | `stationName` | `cityName`/`cityCode`/`limit` |
| city_durations | `/cities/durations` | — | `cityCode` |
| city_info | `/cities/{code}` | `code` | — |
| city_all | `/cities/{code}/all` | `code` | — |
| city_passenger_flow | `/cities/{code}/passenger-flow` | `code` | `yearMonth` |
| city_top_flow | `/cities/{code}/top-flow` | `code` | — |
| city_yearly_flow | `/cities/{code}/yearly-flow` | `code` | — |
| city_lines | `/cities/{code}/lines` | `code` | — |
| city_stations | `/cities/{code}/stations` | `code` | `page`/`pageSize` |
| line_info | `/lines/{id}` | `id` | — |
| line_stations | `/lines/{id}/stations` | `id` | — |
| station_profile | `/stations/{id}` | `id` | `durationId` |
| station_population | `/stations/{id}/population` | `id` | `durationId`/`personType` |
| station_labels | `/stations/{id}/labels` | `id` | `durationId`/`personType` |
| station_business | `/stations/{id}/business` | `id` | `durationId` |
| station_industry | `/stations/{id}/industry` | `id` | `durationId` |
| business_summary | `/stations/{id}/business-summary` | `id` | `durationId` |
| business_detail | `/stations/{id}/business-detail` | `id` | `durationId`/`industryType`/`keyword`/`limit` |

所有路径前缀 `/api/v1/data`，鉴权头 `X-API-Key`。
