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
      console.log('[RequireAuth] No user, calling checkAuth...');
      checkAuth()
        .then(() => {
          console.log('[RequireAuth] checkAuth succeeded, user:', useAuthStore.getState().user);
        })
        .catch((err) => {
          console.error('[RequireAuth] checkAuth failed:', err);
        })
        .finally(() => setChecking(false));
    }
  }, [user, checkAuth]);

  console.log('[RequireAuth] Render - user:', user, 'checking:', checking);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    console.log('[RequireAuth] No user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  console.log('[RequireAuth] User authenticated, rendering outlet');
  return <Outlet />;
}
