-- 000018: 会员计费重构 —— 三档会员 × 日/周/月 token 额度 + 月度积分
-- 背景：旧版按模型级别(basic/pro/ultra)分池且只有日维度；新版改为统一 token 池 + 日/周/月三周期。
-- 字段由 ent Schema.Create 自动新增，此处 ALTER IF NOT EXISTS 保险 + UPDATE 配额数据。
-- 换算口径：1 积分 = 10000 token（consts.CreditsPerToken）。
--
-- 档位配额（token 数）：
--   basic: 日 200万 / 周 1400万(日×7,不额外约束) / 月 6000万(日×30) / 月送 200 积分
--   pro:   日 1000万 / 周 5000万 / 月 20000万 / 月送 1000 积分
--   ultra: 日 4000万 / 周 20000万 / 月 66000万 / 月送 5000 积分

-- plans 表新增统一池配额字段（ent 自动迁移通常已加，此处保险）
ALTER TABLE plans ADD COLUMN IF NOT EXISTS daily_token_quota bigint DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS weekly_token_quota bigint DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS monthly_token_quota bigint DEFAULT 0;

-- wallets 表新增统一池余额字段
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS daily_token_balance bigint DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS weekly_token_balance bigint DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS monthly_token_balance bigint DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS weekly_reset_at timestamptz;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS monthly_reset_at timestamptz;

-- 更新三档配额 + 月度积分
UPDATE plans SET
  daily_token_quota   = 2000000,
  weekly_token_quota  = 14000000,
  monthly_token_quota = 60000000,
  monthly_credits     = 200,
  features            = '["每日 200万 token","每月 200 积分","数据 API 按次计费","社区支持"]'::jsonb
WHERE name = 'basic';

UPDATE plans SET
  daily_token_quota   = 10000000,
  weekly_token_quota  = 50000000,
  monthly_token_quota = 200000000,
  monthly_credits     = 1000,
  features            = '["每日 1000万 token","每周 5000万 token","每月 20000万 token","每月 1000 积分","数据 API 按次计费","优先支持","3 并发任务"]'::jsonb
WHERE name = 'pro';

UPDATE plans SET
  daily_token_quota   = 40000000,
  weekly_token_quota  = 200000000,
  monthly_token_quota = 660000000,
  monthly_credits     = 5000,
  features            = '["每日 4000万 token","每周 20000万 token","每月 66000万 token","每月 5000 积分","数据 API 按次计费","专属客服","10 并发任务"]'::jsonb
WHERE name = 'ultra';

-- 清空 existing wallets 的日重置时间，强制下次请求触发三周期重置（填充新余额字段）
UPDATE wallets SET daily_reset_at = NULL;
