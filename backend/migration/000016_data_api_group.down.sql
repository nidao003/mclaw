-- 000016 down: 回滚 group 列 + 二级「画像」改回「车站画像」
UPDATE data_api_pricings SET category = '车站画像' WHERE category = '画像';
DROP INDEX IF EXISTS idx_data_api_pricings_group;
ALTER TABLE data_api_pricings DROP COLUMN IF EXISTS "group";
