---
name: query-service
description: "地铁数据查询技能。通过执行 scripts/query.py 调用 mclaw Go 后端查询车站/城市/线路的客流、人口、画像、商业数据。覆盖 18 种查询类型。"
---

# 地铁数据查询技能（Query Service）

## 何时使用

- 用户询问车站数据（客流、人口、画像、业态、产业）
- 用户询问城市/线路统计（线路、站点、客流趋势、历史峰值）
- 用户要求对比车站或线路

## 调用方式

执行本 skill 目录下的脚本（**不要**发明 `query_service` 工具、DSL payload 或 XML 调用块）：

```bash
python scripts/query.py <query_type> --参数1 值1 --参数2 值2
```

脚本输出 JSON 到 stdout 供你读取组织回答；错误信息打到 stderr。所有参数命名用 **camelCase**，与 Go 后端一致。

### 凭证（双模式，无需 agent 关心）

- **mclaw 客户端内**：环境变量 `MCLAW_DATA_API_KEY` 由客户端自动注入，agent 无需配置。
- **非 mclaw 环境**：用户需 `--api-key mclaw_xxx` 或 `export MCLAW_DATA_API_KEY=mclaw_xxx`。若脚本报 401，提示用户重新登录（mclaw 内）或检查 key 配置（非 mclaw）。

> 数据 API key 是通用 `X-API-Key` 鉴权，不绑定 mclaw 客户端，用户可自行在别处使用。

## 支持的 query_type

| query_type | 说明 | 关键参数 |
|------------|------|----------|
| `search_stations` | 按名称搜索车站（拿到 stationId 供后续查询）| `stationName`，可选 `cityName`/`cityCode`/`limit` |
| `city_durations` | 城市可用数据期次（拿 durationId）| 可选 `cityCode` |
| `city_info` | 城市概览 | `code` |
| `city_all` | 城市全部记录 | `code` |
| `city_passenger_flow` | 城市客流 | `code`，可选 `yearMonth` |
| `city_stations` | 城市车站分页列表 | `code`，可选 `page`/`pageSize` |
| `city_top_flow` | 城市历史峰值客流 | `code` |
| `city_yearly_flow` | 城市年度日均客流 | `code` |
| `city_lines` | 城市地铁线路（拿线路 id）| `code` |
| `line_info` | 线路详情 | `id` |
| `line_stations` | 线路所有车站（按顺序）| `id` |
| `station_profile` | 车站完整画像 | `id`，可选 `durationId` |
| `station_population` | 车站人口 | `id`，可选 `durationId`/`personType` |
| `station_labels` | 车站人群标签分布 | `id`，可选 `durationId`/`personType` |
| `station_business` | 车站业态汇总 | `id`，可选 `durationId` |
| `station_industry` | 车站产业（房价、租金）| `id`，可选 `durationId` |
| `business_summary` | 业态配套汇总 | `id`，可选 `durationId` |
| `business_detail` | 业态详情（POI 检索）| `id`，可选 `industryType`/`keyword`/`durationId`/`limit` |

## 参数规则

- `code` / `cityCode`：6 位行政区划数字码，例如青岛 `370200`。**不要**传拼音或缩写（`qingdao`/`QD` 无效）。
- 用户给中文城市名时，优先用 `cityName`（如 `"cityName": "青岛"`）。
- `id`：车站/线路原始 ID（大整数），来自 `search_stations` / `city_lines` 等返回，**绝不编造**。
- `personType`：人口类型。`1`=常驻人口，`2`=到访人口，`3`=工作人口，`4`=居住人口。常住人口默认传 `1`。
- 车站卡片资源字段保持 camelCase：`stationId`、`cityCode`、`cityId`、`lineId`。

### 时间参数

| 字段 | 粒度 | 格式 | 适用 | 不传默认 |
|------|------|------|------|----------|
| `durationId` | 季度 | 整数 | `station_*` / `business_*` | 最新激活季度 |
| `yearMonth` | 月度 | `yyyy-MM` | 仅 `city_passenger_flow` | 最新一天 |

车站级接口（`station_*` / `business_*`）只有季度粒度，**不接受 `yearMonth`**。

使用约束：
- 用户没说具体时间窗口，**不传任何时间参数**（"现在/最近/今年" 等模糊措辞同样不传）
- 用户明确说季度（"2025Q4"、"上个季度"）→ 先调 `city_durations` 拿对应 `durationId`，**绝不编 ID**
- 用户问"某月车站数据"时，告知该项只有季度粒度，给出最近季度数据

### 数据范围

车站级数据（人口、画像、商业、产业、标签）默认采集范围为车站中心 **800 米半径圆形区域**。解释数据含义时让用户理解这个空间口径。

## 典型流程

### 1. 用户只给车站名

先搜索拿 stationId：

```bash
python scripts/query.py search_stations --stationName 五四广场 --cityName 青岛 --limit 5
```

用返回的 `stationId` 继续后续查询。同时保留返回的 `cityCode`/`lineId` 以便前端渲染站点卡片。

返回结果：
- **单一明确候选**：用该 `stationId` 继续
- **多候选**：带城市/线路提示问澄清问题后再继续
- **零候选**：尝试一个可能的纠正候选，再请用户确认

### 2. 查常住人口

```bash
python scripts/query.py station_population --id 900000030289028 --personType 1
```

## 错误处理

- 脚本 exit 2：参数错误/key 缺失 → 检查参数，提示用户配置 key
- 脚本 exit 401：key 无效/失效 → mclaw 内提示重新登录，非 mclaw 提示检查 key
- 脚本 exit 404：数据未找到 → 告知用户该数据暂无
- 脚本 exit 3：网络错误 → 建议稍后重试

## 回复规则

- 先执行脚本拿到数据再回答，绝不凭记忆编造
- 以用户问的答案开头
- 车站搜索返回多候选时，问一个简短澄清问题
- 车站搜索零候选且像错别字时，提出最可能的纠正站名并请用户确认
- 同一轮不要用相同参数重复调用同一 query_type
- 不要把后端原始信封（code/msg/data）暴露给用户，除非用户明确要求
- **不要丢弃**结构化返回里的车站资源 ID（stationId/cityCode/cityId/lineId），即使最终面向用户的文字省略了它们

## 澄清示例

- 歧义：
  - "鼓楼有多个候选站点：南京鼓楼、天津鼓楼、宁波鼓楼。您想查哪个城市的鼓楼站？"
- 疑似错别字：
  - "我没查到'公元前'站，您是不是想问广州 1/2 号线的'公园前'？"
