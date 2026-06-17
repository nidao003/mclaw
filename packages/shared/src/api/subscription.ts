/**
 * 订阅/套餐 API 客户端
 * 对接 Go 后端 subscription 模块
 */

import { apiRequest } from './client';
import type { Plan, UserSubscription } from '../types/subscription';

export const subscriptionApi = {
  /** 套餐列表 */
  listPlans() {
    return apiRequest<Plan[]>('/api/v1/plans');
  },

  /** 套餐详情 */
  getPlan(id: string) {
    return apiRequest<Plan>(`/api/v1/plans/${id}`);
  },

  /** 我的订阅 */
  getMySubscription() {
    return apiRequest<UserSubscription>('/api/v1/subscription');
  },

  /** 订阅套餐 */
  subscribe(planId: string, autoRenew = false) {
    return apiRequest<UserSubscription>('/api/v1/subscription', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, auto_renew: autoRenew }),
    });
  },

  /** 切换自动续费 */
  toggleAutoRenew(enable: boolean) {
    return apiRequest<null>('/api/v1/subscription/auto-renew', {
      method: 'PUT',
      body: JSON.stringify({ enable }),
    });
  },
};
