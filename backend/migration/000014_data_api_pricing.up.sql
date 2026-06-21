-- 000014: 数据 API 计费单价 + 接口文档元数据表
-- 对应 ent schema: data_api_pricings
-- 一行 = 一个数据查询接口，既存按次计费单价，也存 API 文档页元数据
CREATE TABLE IF NOT EXISTS data_api_pricings (
    id               UUID PRIMARY KEY,
    api_code         VARCHAR(128) NOT NULL UNIQUE,
    name             VARCHAR(255) NOT NULL,
    category         VARCHAR(64)  NOT NULL,
    method           VARCHAR(16)  NOT NULL DEFAULT 'GET',
    path             VARCHAR(255) NOT NULL,
    summary          VARCHAR(512),
    description      TEXT,
    credits_per_call BIGINT       NOT NULL DEFAULT 1,
    enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
    need_api_key     BOOLEAN      NOT NULL DEFAULT TRUE,
    params           JSONB,
    response_fields  JSONB,
    example_request  TEXT,
    example_response TEXT,
    sort_order       INTEGER      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_api_pricings_category ON data_api_pricings (category);
CREATE INDEX IF NOT EXISTS idx_data_api_pricings_enabled ON data_api_pricings (enabled);

-- ============================================================
-- Seed: 18 个数据查询接口（按次计费，单价占位 1 credit/次，后续后台可调）
-- 分类：车站画像(5) / 城市(7) / 线路(2) / 业态(2) / 查询(2)
-- 文档元数据（params/response_fields/example）此处先留空，阶段3 由后端 /data/docs 补充或后台维护
-- ============================================================

INSERT INTO data_api_pricings (id, api_code, name, category, method, path, summary, credits_per_call, sort_order) VALUES
-- 车站画像
('a0000000-0000-0000-0000-000000000001', 'station.detail',      '查询车站完整画像', '车站画像', 'GET', '/api/v1/data/stations/:id',                   '车站基础信息+人口+标签+业态+产业', 1, 1),
('a0000000-0000-0000-0000-000000000002', 'station.population',  '查询车站人口数据', '车站画像', 'GET', '/api/v1/data/stations/:id/population',        '常驻/到访/工作/居住人口', 1, 2),
('a0000000-0000-0000-0000-000000000003', 'station.labels',      '查询车站人群标签分布', '车站画像', 'GET', '/api/v1/data/stations/:id/labels',     '常驻18+到访5标签分布', 1, 3),
('a0000000-0000-0000-0000-000000000004', 'station.business',    '查询车站业态汇总', '车站画像', 'GET', '/api/v1/data/stations/:id/business',          '业态类别汇总', 1, 4),
('a0000000-0000-0000-0000-000000000005', 'station.industry',    '查询车站产业数据', '车站画像', 'GET', '/api/v1/data/stations/:id/industry',          '房价/物业/建筑/租赁', 1, 5),
-- 城市
('a0000000-0000-0000-0000-000000000010', 'city.detail',         '查询城市基本信息', '城市', 'GET', '/api/v1/data/cities/:code',                   '名称/线路数/车站数/客运量', 1, 1),
('a0000000-0000-0000-0000-000000000011', 'city.all',            '查询城市全部历史', '城市', 'GET', '/api/v1/data/cities/:code/all',               '城市全部历史记录', 1, 2),
('a0000000-0000-0000-0000-000000000012', 'city.passenger_flow', '查询城市客流', '城市', 'GET', '/api/v1/data/cities/:code/passenger-flow',     '可按月查询每日客流', 1, 3),
('a0000000-0000-0000-0000-000000000013', 'city.top_flow',       '查询城市最高客流', '城市', 'GET', '/api/v1/data/cities/:code/top-flow',           '历史最高客流', 1, 4),
('a0000000-0000-0000-0000-000000000014', 'city.yearly_flow',    '查询城市历年日均客流', '城市', 'GET', '/api/v1/data/cities/:code/yearly-flow', '历年日均客流', 1, 5),
('a0000000-0000-0000-0000-000000000015', 'city.lines',          '查询城市线路列表', '城市', 'GET', '/api/v1/data/cities/:code/lines',              '城市地铁线路列表', 1, 6),
('a0000000-0000-0000-0000-000000000016', 'city.stations',       '查询城市车站列表', '城市', 'GET', '/api/v1/data/cities/:code/stations',           '城市车站分页列表', 1, 7),
-- 线路
('a0000000-0000-0000-0000-000000000020', 'line.detail',         '查询线路详情', '线路', 'GET', '/api/v1/data/lines/:id',                      '线路完整信息', 1, 1),
('a0000000-0000-0000-0000-000000000021', 'line.stations',       '查询线路所有车站', '线路', 'GET', '/api/v1/data/lines/:id/stations',              '线路车站按顺序', 1, 2),
-- 业态（BusinessController，区别于 station.business）
('a0000000-0000-0000-0000-000000000030', 'business.summary',    '查询车站业态汇总(明细)', '业态', 'GET', '/api/v1/data/stations/:id/business-summary', '业态汇总(BusinessVO)', 1, 1),
('a0000000-0000-0000-0000-000000000031', 'business.detail',     '查询车站业态详情', '业态', 'GET', '/api/v1/data/stations/:id/business-detail',   '商铺级业态详情', 1, 2),
-- 查询
('a0000000-0000-0000-0000-000000000040', 'query.search_stations','搜索车站', '查询', 'GET', '/api/v1/data/stations/search',                '车站名模糊搜索', 1, 1),
('a0000000-0000-0000-0000-000000000041', 'query.city_durations','查询城市季度可用性', '查询', 'GET', '/api/v1/data/cities/durations',          '城市季度数据可用情况', 1, 2)
ON CONFLICT (api_code) DO NOTHING;
