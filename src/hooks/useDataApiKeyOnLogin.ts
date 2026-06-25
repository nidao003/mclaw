/**
 * mclaw 桌面端桥接 hook：监听用户登录，在 user 从 null 变 non-null 时自动确保本地
 * keychain 有一把有效的数据查询 API key（供 skill 脚本经 env 读取消费）。
 *
 * 副作用：用户登录成功 → ensureDataApiKey（prefix 验证 + 同名清理 + 按需 create）
 * 失败不阻断主流程，仅打日志（数据 skill 不可用不致命）。
 */
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@mclaw/shared';
import { ensureDataApiKey } from '@/lib/data-api-key-sync';

export function useDataApiKeyOnLogin(): void {
  const user = useAuthStore(s => s.user);
  const lastEnsuredUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      lastEnsuredUserIdRef.current = null;
      return;
    }
    // 避免同一 user 重复 ensure
    if (lastEnsuredUserIdRef.current === user.id) {
      return;
    }
    lastEnsuredUserIdRef.current = user.id;

    (async () => {
      try {
        await ensureDataApiKey();
      } catch (err) {
        console.error('[useDataApiKeyOnLogin] ensure data api key failed:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
