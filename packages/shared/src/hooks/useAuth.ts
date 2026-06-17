import { useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types/user';
import { ApiRequestError } from '../api/client';

// 认证 hook —— 登录/注册/登出/当前用户
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 启动时检查是否已登录
  useEffect(() => {
    authApi.me()
      .then((data: unknown) => {
        // /users/status 返回 { user: User, team: Team } 格式
        const d = data as { user?: User };
        setUser(d.user ?? (data as User));
      })
      .catch(() => {});
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const resp = await authApi.login({ email, password });
        setUser(resp.user);
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : '登录失败';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      setLoading(true);
      setError(null);
      try {
        const resp = await authApi.register({ email, password, name });
        setUser(resp.user);
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : '注册失败';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return { user, loading, error, login, register, logout, isLoggedIn: !!user };
}
