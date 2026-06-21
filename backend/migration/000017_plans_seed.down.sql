-- 000017 down: 删除 seed 的三档套餐
DELETE FROM plans WHERE name IN ('basic', 'pro', 'ultra');
