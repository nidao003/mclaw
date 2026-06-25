---
name: query-guide
description: "自然语言到查询参数的映射指南。帮助把用户的口语化提问翻译成正确的 query_type 和参数组合。"
---

# 自然语言 → 查询参数映射指南

## 核心原则

- **绝不编造 ID**：`stationId`/`lineId` 未知时，先 `search_stations` / `city_lines` 拿到再查
- **城市码用数字**：`code`/`cityCode` 用 6 位行政区划码（如青岛 `370200`），用户给中文名时用 `cityName`
- **时间不编**：用户没说具体时间就不传时间参数；说季度就先 `city_durations` 拿 `durationId`

## 映射示例

| 用户口语 | query_type + 参数 |
|----------|-------------------|
| "五四广场站怎么样" | 先 `search_stations --stationName 五四广场 --cityName 青岛`，再 `station_profile --id <id>` |
| "五四广场站常驻人口" | `search_stations` 拿 id → `station_population --id <id> --personType 1` |
| "五四广场站周边商圈" | `search_stations` 拿 id → `business_summary --id <id>`（或 `station_business`） |
| "五四广场站附近有没有星巴克" | `search_stations` 拿 id → `business_detail --id <id> --keyword 星巴克` |
| "青岛3号线客流" | `city_lines --code 370200` 拿线路 id → `line_info --id <id>`（线路级客流看 `line_info` 返回） |
| "青岛地铁线路有哪些" | `city_lines --code 370200` |
| "青岛3号线有哪些站" | `city_lines` 拿 id → `line_stations --id <id>` |
| "青岛上月客流" | `city_passenger_flow --code 370200 --yearMonth 2026-05` |
| "对比五四广场和台东站" | 分别 `search_stations` 拿两个 id → 各查 `station_profile` / `station_population` 等 |
| "青岛历史最高客流" | `city_top_flow --code 370200` |
| "青岛今年日均客流" | `city_yearly_flow --code 370200` |

## 参数校验规则

- 至少有一个定位参数：`stationId`、`code`/`cityCode`、或 `id`（线路）
- `stationName` 仅 `search_stations` 用，其他查询用 `search_stations` 返回的数字 `stationId`
- `dateRange`/`yearMonth` 仅 `city_passenger_flow` 用；车站级查询只能用 `durationId`（季度）
- 人口类查询不传 `personType` 时默认常驻（`1`）

## 时间表达处理

| 用户表达 | 处理 |
|----------|------|
| "现在/最近/当前/今年" | 不传时间参数，拿最新 |
| "上个季度/2025Q4" | 先 `city_durations` 拿 `durationId`，再传 |
| "某月" | 仅城市客流可用 `yearMonth`；车站级告知只有季度粒度 |
| "去年" | 城市级可用 `city_yearly_flow`；车站级用对应季度 `durationId` |

## 常见错误

- ❌ 直接编 `stationId`（应先 `search_stations`）
- ❌ 用拼音/缩写当 `cityCode`（应用 6 位数字码）
- ❌ 给车站级接口传 `yearMonth`（只有季度 `durationId`）
- ❌ 编造 `durationId`（应先 `city_durations` 查）
