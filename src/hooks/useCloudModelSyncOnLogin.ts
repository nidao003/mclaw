/**
 * mclaw 桌面端桥接 hook：监听用户登录，在 user 从 null 变 non-null 时自动同步云端默认模型到 OpenClaw provider
 *
 * 副作用：用户登录成功 → 自动 fetchModels(true) → 找到默认云端模型 → 调 syncCloudModelAsProviderAccount 设默认
 * 前提条件：user 已切到本地则跳过同步
 */
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@mclaw/shared';
import { useCloudModelStore } from '@mclaw/shared/stores/cloudModelStore';
import { syncCloudModelAsProviderAccount, CloudSyncError } from '@/lib/cloud-provider-sync';

export function useCloudModelSyncOnLogin(): void {
  const user = useAuthStore(s => s.user);
  const lastSyncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      lastSyncedUserIdRef.current = null;
      return;
    }
    // 避免同一 user 重复同步
    if (lastSyncedUserIdRef.current === user.id) {
      return;
    }
    lastSyncedUserIdRef.current = user.id;

    (async () => {
      try {
        await useCloudModelStore.getState().fetchModels(true);
        const { defaultCloudModel, userOverrideDefaultToLocal } = useCloudModelStore.getState();
        if (userOverrideDefaultToLocal) {
          console.warn('[useCloudModelSyncOnLogin] user has switched to local model, skipping cloud sync');
          return;
        }
        if (!defaultCloudModel) {
          return;
        }
        const result = await syncCloudModelAsProviderAccount(defaultCloudModel, { setAsDefault: true });
        if (!result.accountId) {
          console.info('[useCloudModelSyncOnLogin] cloud model sync skipped (OAuth account not logged in)');
        }
      } catch (err) {
        if (err instanceof CloudSyncError) {
          console.error('[useCloudModelSyncOnLogin] cloud model sync failed:', err.message);
        } else {
          console.error('[useCloudModelSyncOnLogin] cloud model sync failed:', err);
        }
      }
    })();
    // 用 user.id 而非 user 避免对象引用变化触发重复同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}