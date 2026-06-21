-- 000017: plans 表 seed 三档套餐（basic/pro/ultra）
-- 背景：/api/v1/plans 之前返回空，个人中心「我的账户」页套餐列表无数据。
-- 字段对齐 ent schema: price_month/price_year(分) + *_token_quota + monthly_credits

INSERT INTO plans (id, name, display_name, price_month, price_year,
                   basic_token_quota, pro_token_quota, ultra_token_quota,
                   monthly_credits, max_concurrency, features, is_default, is_active, sort_order,
                   created_at, updated_at)
VALUES
('b0000000-0000-0000-0000-000000000001', 'basic', '基础版',
 0, 0,
 200000, 0, 0,
 100, 1,
 '["每日基础模型 20万 token","每月 100 积分","数据 API 按次计费","社区支持"]'::jsonb,
 true, true, 1,
 NOW(), NOW()),
('b0000000-0000-0000-0000-000000000002', 'pro', '专业版',
 9900, 99000,
 500000, 200000, 0,
 1000, 3,
 '["每日进阶模型 20万 token","每月 1000 积分","数据 API 按次计费","优先支持","3 并发任务"]'::jsonb,
 false, true, 2,
 NOW(), NOW()),
('b0000000-0000-0000-0000-000000000003', 'ultra', '旗舰版',
 29900, 299000,
 1000000, 500000, 200000,
 5000, 10,
 '["每日高级模型 20万 token","每月 5000 积分","数据 API 按次计费","专属客服","10 并发任务"]'::jsonb,
 false, true, 3,
 NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
