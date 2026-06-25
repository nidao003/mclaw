-- 000019: 云端模型访问绑定加固 —— runtime key 时效 + 客户端 HMAC 签名密钥
-- 背景：原 runtime key（model_api_keys.api_key）无过期、无撤销、无设备绑定，
-- 拿到 key + 公网 llmproxy 地址即可 curl 白嫖。本期给 key 加 device_secret/expires_at/revoked_at。
-- 字段由 ent Schema.Create 自动新增，此处 ALTER IF NOT EXISTS 保险 + 老key填默认过期。
--
-- 老key兼容策略：device_secret 留空 → llmproxy 验签时强制拒绝（老key作废），
-- 客户端首次启动自动重新签发带 device_secret 的新 key。干净利落不留后门。

ALTER TABLE model_api_keys ADD COLUMN IF NOT EXISTS device_secret varchar;
ALTER TABLE model_api_keys ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE model_api_keys ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- 给现有未过期的【桌面端】老 key（非 VM 绑定）填 24h 过期，给客户端留续签窗口；
-- device_secret 留空使其在下次签发前被 llmproxy 拒绝（老桌面端 key 作废需重新签发）。
-- VM key（virtualmachine_id 非空）是后端可信调度环境签发，不在用户配置文件，第一期豁免签名，不设过期。
UPDATE model_api_keys
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE expires_at IS NULL AND revoked_at IS NULL AND virtualmachine_id IS NULL;
