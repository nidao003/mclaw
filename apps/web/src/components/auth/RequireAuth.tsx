import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@shared';
import { Loader2 } from 'lucide-react';

/** 路由守卫 — 未登录自动跳转 /login */
export default function RequireAuth() {
  const { user, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(!user);

  useEffect(() => {
    if (!user) {
      checkAuth().finally(() => setChecking(false));
    }
  }, [user, checkAuth]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
