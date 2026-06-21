/** 订阅/计费相关类型 —— 跟 Go 后端 domain/subscription.go 对齐 */

// 套餐等级
export type PlanLevel = 'basic' | 'pro' | 'ultra';

// 订阅状态
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

// 周期单位
export type PeriodUnit = 'month' | 'year';

// 套餐信息（对齐 domain.Plan）
export interface Plan {
  id: string;
  name: PlanLevel;
  display_name: string;
  price_month: number; // 月费（分）
  price_year: number; // 年费（分）
  basic_token_quota: number; // 每日基础模型 token 配额
  pro_token_quota: number; // 每日进阶模型 token 配额
  ultra_token_quota: number; // 每日高级模型 token 配额
  monthly_credits: number; // 每月赠送积分
  max_concurrency: number; // 最大并发任务数
  features: string[];
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

// 当前订阅响应（对齐 domain.SubscriptionResp，plan 是套餐 name 字符串，非 Plan 对象）
export interface UserSubscription {
  plan: string; // 套餐 name，如 basic/pro/ultra（未订阅为空）
  plan_id?: string;
  source?: string;
  expires_at?: string;
  auto_renew: boolean;
  enable_credit_consumption: boolean;
  status: SubscriptionStatus;
}
