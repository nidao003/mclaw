/**
 * mclaw 桌面端"账号绑定的云端模型"状态管理
 * 数据/UI 状态层，非 chat 调度层。chat 实际走 OpenClaw Gateway
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { modelsApi } from '../api/models';
import type { Model, ListModelResp } from '../types/model';

// ── State 接口 ───────────────────────────────────────────

interface CloudModelState {
  // 数据
  cloudModels: Model[];
  defaultCloudModel: Model | null;
  defaultCloudModelId: string | null; // 持久化用
  userOverrideDefaultToLocal: boolean; // 持久化用
  activeLocalAccountId: string | null; // 持久化用：覆盖到本地时具体用的那个服务商
  // UI 状态
  loading: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  // Action
  fetchModels: (force?: boolean) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  switchToLocal: (accountId?: string) => void;
  clearLocalOverride: () => void;
  reset: () => void;
}

// ── Store 实现 ───────────────────────────────────────────

// 防止 setDefault 并发竞态
let pendingDefaultId: string | null = null;

export const useCloudModelStore = create<CloudModelState>()(
  persist(
    (set, get) => ({
      // 初始状态
      cloudModels: [],
      defaultCloudModel: null,
      defaultCloudModelId: null,
      userOverrideDefaultToLocal: false,
      activeLocalAccountId: null,
      loading: false,
      error: null,
      lastSyncedAt: null,

      // ── Actions ───────────────────────────────────────

      fetchModels: async (force = false) => {
        const { loading: isLoading, lastSyncedAt } = get();
        // 忽略非 force 的缓存请求
        if (!force && lastSyncedAt && Date.now() - lastSyncedAt < 60 * 1000) {
          return;
        }
        // 忽略进行中的请求
        if (isLoading) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const resp: ListModelResp = await modelsApi.list();
          const models = resp.models ?? [];
          // 从 is_default 找到默认模型
          const defaultModel = models.find((m) => m.is_default) ?? null;
          const defaultId = defaultModel?.id ?? null;

          set({
            cloudModels: models,
            defaultCloudModel: defaultModel,
            defaultCloudModelId: defaultId,
            lastSyncedAt: Date.now(),
            loading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch cloud models',
            loading: false,
          });
        }
      },

      setDefault: async (id: string) => {
        // 简单防抖：忽略进行中的请求
        if (pendingDefaultId) {
          return;
        }
        pendingDefaultId = id;

        set({ loading: true, error: null });
        try {
          await modelsApi.setDefault(id);
          // 成功后重新拉取
          await get().fetchModels(true);
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to set default model',
            loading: false,
          });
        } finally {
          pendingDefaultId = null;
        }
      },

      switchToLocal: (accountId?: string) => {
        set({
          userOverrideDefaultToLocal: true,
          activeLocalAccountId: accountId ?? null,
        });
      },

      clearLocalOverride: () => {
        set({
          userOverrideDefaultToLocal: false,
          activeLocalAccountId: null,
        });
      },

      reset: () => {
        set({
          cloudModels: [],
          defaultCloudModel: null,
          defaultCloudModelId: null,
          userOverrideDefaultToLocal: false,
          activeLocalAccountId: null,
          loading: false,
          error: null,
          lastSyncedAt: null,
        });
      },
    }),
    {
      name: 'mclaw-cloud-model',
      storage: createJSONStorage(() => localStorage),
      // 只持久化 userOverrideDefaultToLocal、defaultCloudModelId、activeLocalAccountId
      partialize: (state) => ({
        userOverrideDefaultToLocal: state.userOverrideDefaultToLocal,
        defaultCloudModelId: state.defaultCloudModelId,
        activeLocalAccountId: state.activeLocalAccountId,
      }),
    },
  ),
);

// ── Selector Hooks ───────────────────────────────────────

export const selectDefaultCloudModel = (state: CloudModelState) => state.defaultCloudModel;
export const selectIsOverriddenToLocal = (state: CloudModelState) => state.userOverrideDefaultToLocal;