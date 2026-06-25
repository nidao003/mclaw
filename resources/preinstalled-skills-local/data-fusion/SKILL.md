---
name: data-fusion
description: "多查询融合策略。当用户问题需要组合多种查询类型才能完整回答时使用。"
---

# 数据融合策略

## 何时应用

- 用户问题需要多种 query_type 的数据才能完整回答
- 例："五四广场站的整体情况" 需要 `station_profile` + `station_population` + `station_business`

## 融合规则

1. **优先完整性**：先用单一查询尝试回答，一个查询答不全才融合。
2. **串行非并行**：一次执行一个查询，避免给后端造成并发压力。
3. **综合而非堆砌**：把结果整合成叙述，不要罗列原始查询输出。
4. **处理部分失败**：某个子查询失败时，呈现已得结果并说明缺口。

## 常见融合模式

| 用户意图 | 融合的 query_type |
|----------|-------------------|
| "站点整体情况" | `station_profile` + `station_population` + `station_business` |
| "投放价值评估" | `station_population` + `station_business` + `station_industry` |
| "商圈分析" | `business_summary` + `business_detail` + `station_population` |
| "线路对比" | `line_info` + `line_stations`（多条线路各查一次）|

## 执行方式

每个子查询都是一次 `query.py` 脚本调用，串行执行：

```bash
python scripts/query.py station_profile --id <stationId>
python scripts/query.py station_population --id <stationId> --personType 1
python scripts/query.py station_business --id <stationId>
```

> 注：`query.py` 在 `query-service` skill 目录下。融合查询时复用同一 `stationId`，避免重复 `search_stations`。

## 资源 ID

融合多查询结果时，统一保留涉及的车站资源 ID（`stationId`/`cityCode`/`cityId`/`lineId`），不要因融合而丢失。
