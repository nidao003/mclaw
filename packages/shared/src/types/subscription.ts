/** 订阅/计费相关类型 —— 跟 Go 后端 domain/subscription.go 对齐 */

// 套餐等级
export type PlanLevel = 'basic' | 'pro' | 'ultra';

// 订阅状态
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

// 周期单位
export type PeriodUnit = 'month' | 'year';

// 套餐信息
export interface Plan {
  id: string;
  name: PlanLevel;
  display_name: string;
  description: string;
  price: number; // 分
  token_quota: number; // 每日 token 配额
  monthly_credits: number;
  max_concurrency: number;
  features: string[];
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

// 用户订阅
export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan?: Plan;
  status: SubscriptionStatus;
  period_unit: PeriodUnit;
  period_count: number;
  auto_renew: boolean;
  enable_credit_consumption: boolean;
  started_at: string;
  expires_at: string;
}
