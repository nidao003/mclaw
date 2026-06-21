-- 000016: data_api_pricings 加一级分组 group + 二级分类「车站画像」改名「画像」
-- 背景：API 文档页改为二级分类结构（一级「车站画像」/ 二级 画像/城市/线路/业态/查询），
-- 后续会新增与「车站画像」同级的一级分组（线路画像/城市画像等）。

-- 1. 加 group 列（一级分组，默认「车站画像」）
ALTER TABLE data_api_pricings ADD COLUMN IF NOT EXISTS "group" VARCHAR(64) NOT NULL DEFAULT '车站画像';
CREATE INDEX IF NOT EXISTS idx_data_api_pricings_group ON data_api_pricings ("group");

-- 2. 原 category「车站画像」改为二级「画像」（其余 category 城市/线路/业态/查询保持不变作二级）
UPDATE data_api_pricings SET category = '画像' WHERE category = '车站画像';
