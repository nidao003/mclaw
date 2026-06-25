#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
地铁数据查询脚本 —— 调 mclaw Go 后端 /api/v1/data/* 接口。

用法:
  python query.py <query_type> [--param value ...]
  python query.py search_stations --stationName 五四广场 --cityName 青岛 --limit 5
  python query.py station_profile --id 900000030289028
  python query.py station_population --id 900000030289028 --personType 1

凭证（双模式，与大模型 runtime key 不同：数据 key 不绑 mclaw 客户端，通用可用）:
  - mclaw 内使用：自动从环境变量 MCLAW_DATA_API_KEY 读取（客户端注入，无需配置）
  - 非 mclaw 使用：--api-key 参数，或 export MCLAW_DATA_API_KEY=mclaw_xxx

输出：成功时 JSON（Go 后端 data 字段）打到 stdout 供 agent 读取；错误信息打到 stderr，
退出码非 0。401 表示 key 失效或无效，需重新配置/登录。
"""
import os
import sys
import json
import argparse
import urllib.request
import urllib.parse
import urllib.error

BASE_URL = os.environ.get("MCLAW_DATA_BASE_URL", "https://[REDACTED]")
DEFAULT_TIMEOUT = 30

# query_type → (path_template, path_params, query_params)
#   path_params : 出现在路径 {占位} 的参数名（必填）
#   query_params: 出现在 query string 的参数名（按需，有值才拼）
# 路径/参数命名对齐 Go 后端（camelCase）。
QUERY_MAP = {
    "search_stations":     ("/api/v1/data/stations/search",                     [],       ["stationName", "cityName", "cityCode", "limit"]),
    "city_durations":      ("/api/v1/data/cities/durations",                    [],       ["cityCode"]),
    "city_info":           ("/api/v1/data/cities/{code}",                       ["code"], []),
    "city_all":            ("/api/v1/data/cities/{code}/all",                   ["code"], []),
    "city_passenger_flow": ("/api/v1/data/cities/{code}/passenger-flow",        ["code"], ["yearMonth"]),
    "city_top_flow":       ("/api/v1/data/cities/{code}/top-flow",              ["code"], []),
    "city_yearly_flow":    ("/api/v1/data/cities/{code}/yearly-flow",           ["code"], []),
    "city_lines":          ("/api/v1/data/cities/{code}/lines",                 ["code"], []),
    "city_stations":       ("/api/v1/data/cities/{code}/stations",              ["code"], ["page", "pageSize"]),
    "line_info":           ("/api/v1/data/lines/{id}",                          ["id"],   []),
    "line_stations":       ("/api/v1/data/lines/{id}/stations",                 ["id"],   []),
    "station_profile":     ("/api/v1/data/stations/{id}",                       ["id"],   ["durationId"]),
    "station_population":  ("/api/v1/data/stations/{id}/population",            ["id"],   ["durationId", "personType"]),
    "station_labels":      ("/api/v1/data/stations/{id}/labels",                ["id"],   ["durationId", "personType"]),
    "station_business":    ("/api/v1/data/stations/{id}/business",              ["id"],   ["durationId"]),
    "station_industry":    ("/api/v1/data/stations/{id}/industry",              ["id"],   ["durationId"]),
    "business_summary":    ("/api/v1/data/stations/{id}/business-summary",      ["id"],   ["durationId"]),
    "business_detail":     ("/api/v1/data/stations/{id}/business-detail",       ["id"],   ["durationId", "industryType", "keyword", "limit"]),
}

# 所有可能参数（argparse 动态注册，均 optional，必填由 query_type 校验）
ALL_PARAMS = [
    "stationName", "cityName", "cityCode", "limit",
    "code", "id", "yearMonth", "page", "pageSize",
    "durationId", "personType", "industryType", "keyword",
]


def die(msg, code=1):
    sys.stderr.write("query.py: " + msg + "\n")
    sys.exit(code)


def resolve_api_key(args):
    """双模式取 key：--api-key 参数 > env MCLAW_DATA_API_KEY > env DATA_API_KEY。"""
    key = getattr(args, "api_key", None) or os.environ.get("MCLAW_DATA_API_KEY") or os.environ.get("DATA_API_KEY")
    if not key:
        sys.stderr.write(
            "query.py: 缺少数据 API key。\n"
            "  - mclaw 客户端内使用：自动注入，无需配置（若缺失请重新登录）\n"
            "  - 非 mclaw 环境：--api-key mclaw_xxx 或 export MCLAW_DATA_API_KEY=mclaw_xxx\n"
        )
        sys.exit(2)
    return key


def build_url(query_type, args):
    spec = QUERY_MAP.get(query_type)
    if not spec:
        die("未知 query_type: '%s'。可用: %s" % (query_type, ", ".join(sorted(QUERY_MAP.keys()))), 2)
    path_tmpl, path_params, query_params = spec

    # 填路径参数
    path = path_tmpl
    for p in path_params:
        val = getattr(args, p, None)
        if val is None or val == "":
            die("query_type '%s' 缺少必填参数 --%s" % (query_type, p), 2)
        path = path.replace("{%s}" % p, urllib.parse.quote(str(val), safe=""))

    # 拼 query string（有值才加）
    qs = {}
    for p in query_params:
        val = getattr(args, p, None)
        if val is not None and val != "":
            qs[p] = str(val)
    if qs:
        path = path + "?" + urllib.parse.urlencode(qs)
    return BASE_URL.rstrip("/") + path


def request_json(url, api_key):
    req = urllib.request.Request(url, headers={
        "X-API-Key": api_key,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        if e.code == 401:
            die("401 数据 API key 无效或已失效（%s）。mclaw 内请重新登录；非 mclaw 请检查 --api-key/env。" % body, 401)
        if e.code == 404:
            die("404 接口不存在或数据未找到: %s" % body, 404)
        die("HTTP %d: %s" % (e.code, body), e.code)
    except urllib.error.URLError as e:
        die("网络错误: %s" % e.reason, 3)

    try:
        parsed = json.loads(raw)
    except ValueError:
        # 非 JSON，原样输出
        sys.stdout.write(raw)
        return

    # Go 后端统一信封 {code, message, data}：code 非 0 视为业务错误
    if isinstance(parsed, dict) and "code" in parsed and "data" in parsed:
        code = parsed.get("code", 0)
        if code not in (0, 200):
            die("业务错误 code=%s message=%s" % (code, parsed.get("message", "")), 4)
        sys.stdout.write(json.dumps(parsed.get("data"), ensure_ascii=False, indent=2))
    else:
        sys.stdout.write(json.dumps(parsed, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")


def main():
    parser = argparse.ArgumentParser(
        prog="query.py",
        description="地铁数据查询（mclaw Go 后端 /api/v1/data/*）",
        usage="python query.py <query_type> [--param value ...]",
    )
    parser.add_argument("query_type", help="查询类型，如 search_stations / station_profile")
    parser.add_argument("--api-key", dest="api_key", default=None,
                        help="数据 API key（非 mclaw 环境用；mclaw 内自动注入）")
    for p in ALL_PARAMS:
        parser.add_argument("--" + p, dest=p, default=None)
    args = parser.parse_args()

    api_key = resolve_api_key(args)
    url = build_url(args.query_type, args)
    request_json(url, api_key)


if __name__ == "__main__":
    main()
