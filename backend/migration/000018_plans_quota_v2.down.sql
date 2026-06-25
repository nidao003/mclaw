-- 000018 down: 回滚配额到旧值（保留新字段，因 ent schema 仍需它们）
UPDATE plans SET
  daily_token_quota = 0,
  weekly_token_quota = 0,
  monthly_token_quota = 0,
  monthly_credits = 100
WHERE name = 'basic';

UPDATE plans SET
  daily_token_quota = 0,
  weekly_token_quota = 0,
  monthly_token_quota = 0,
  monthly_credits = 1000
WHERE name = 'pro';

UPDATE plans SET
  daily_token_quota = 0,
  weekly_token_quota = 0,
  monthly_token_quota = 0,
  monthly_credits = 5000
WHERE name = 'ultra';
