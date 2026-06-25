-- 000019 down: 回滚 runtime key 加固字段（数据不恢复，仅删列）
ALTER TABLE model_api_keys DROP COLUMN IF EXISTS device_secret;
ALTER TABLE model_api_keys DROP COLUMN IF EXISTS expires_at;
ALTER TABLE model_api_keys DROP COLUMN IF EXISTS revoked_at;
