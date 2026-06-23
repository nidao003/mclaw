/**
 * 路由守卫 —— 未登录自动跳转 /login
 * 复用 web 端实现，但启动时强制调用一次 checkAuth 避免刷新卡死
 */

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@mclaw/shared';
import { Loader2 } from 'lucide-react';

export default function RequireAuth() {
  const { user, checkAuth, logout } = useAuthStore();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    checkAuth()
      .catch(() => {
        // 401/未登录是正常状态
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [checkAuth]);

  // 监听用户变化（登出后自动跳登录页）
  useEffect(() => {
    if (!user && !checking && location.pathname !== '/login') {
      // 不在 login 页则跳过去
    }
  }, [user, checking, location.pathname]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-2xs text-muted-foreground">检查登录状态...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 暴露 logout 给子组件用（保留接口）
  void logout;

  return <Outlet />;
}