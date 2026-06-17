import { create } from 'zustand';
import type { Plan, UserSubscription } from '../types/subscription';
import { subscriptionApi } from '../api/subscription';

interface SubscriptionState {
  plans: Plan[];
  current: UserSubscription | null;
  loading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  subscribe: (planId: string) => Promise<void>;
  clearError: () => void;
}

// 全局订阅状态 —— 跨页面共享套餐和订阅信息
export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plans: [],
  current: null,
  loading: false,
  error: null,

  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const plans = await subscriptionApi.listPlans();
      set({ plans, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchSubscription: async () => {
    try {
      const current = await subscriptionApi.getMySubscription();
      set({ current });
    } catch {
      // 未登录或未订阅
    }
  },

  subscribe: async (planId: string) => {
    set({ loading: true, error: null });
    try {
      const current = await subscriptionApi.subscribe(planId);
      set({ current, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
