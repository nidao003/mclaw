/**
 * 桌面端账户 store —— 订阅 + 钱包（积分 / token 额度）
 * 调用 Go 后端 subscription/wallet API
 */

import { create } from 'zustand';
import {
  subscriptionApi,
  walletApi,
  type Plan,
  type UserSubscription,
  type Wallet,
} from '@mclaw/shared';

interface AccountState {
  plans: Plan[];
  subscription: UserSubscription | null;
  wallet: Wallet | null;
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  fetchWallet: () => Promise<void>;
  reset: () => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  plans: [],
  subscription: null,
  wallet: null,
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [plansRes, subRes, walletRes] = await Promise.allSettled([
        subscriptionApi.listPlans(),
        subscriptionApi.getMySubscription(),
        walletApi.getWallet(),
      ]);
      set({
        plans: plansRes.status === 'fulfilled' ? plansRes.value : [],
        subscription: subRes.status === 'fulfilled' ? subRes.value : null,
        wallet: walletRes.status === 'fulfilled' ? walletRes.value : null,
        loading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchSubscription: async () => {
    try {
      const sub = await subscriptionApi.getMySubscription();
      set({ subscription: sub });
    } catch {
      set({ subscription: null });
    }
  },

  fetchWallet: async () => {
    try {
      const wallet = await walletApi.getWallet();
      set({ wallet });
    } catch {
      set({ wallet: null });
    }
  },

  reset: () => set({ plans: [], subscription: null, wallet: null, error: null }),
}));

// 派生工具：套餐名映射 + 展示名
export function getPlanDisplayName(planName: string | undefined): string {
  switch (planName) {
    case 'basic':
      return '基础版';
    case 'pro':
      return '进阶版';
    case 'ultra':
      return '旗舰版';
    case '':
    case undefined:
    case null:
      return '未订阅';
    default:
      return planName;
  }
}

export function getPlanBadgeColor(planName: string | undefined): string {
  switch (planName) {
    case 'ultra':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'pro':
      return 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30';
    case 'basic':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}