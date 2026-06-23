/**
 * mclaw 桌面端登录页
 * 复用 shared LoginForm + useAuthStore，调用 Go 后端 /api/v1/users/password-login
 * 会话 cookie 由 Electron BrowserWindow 自动管理
 */

import { useEffect } from 'react';
import { useNavigate, HashRouter } from 'react-router-dom';
import { LoginForm, OAuthButtons, useAuthStore } from '@mclaw/shared';
import { Loader2, Bot } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, error, login, checkAuth, clearError } = useAuthStore();

  // 启动时检查登录态
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  // 已登录 → 直接跳首页
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    navigate('/', { replace: true });
  };

  const handleOAuth = (provider: string) => {
    // 通过浏览器打开后端 OAuth 入口，回调时会带 session cookie 回到桌面端
    window.open(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/oauth/${provider}`, '_blank');
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-[400px] px-6">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">登录 mclaw</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">登录后使用地铁行业 AI 助手</p>
          </div>
        </div>

        {/* 登录表单 */}
        <LoginForm onSubmit={handleLogin} loading={loading} error={error ?? undefined} />

        <div className="mt-6">
          <OAuthButtons onOAuthLogin={handleOAuth} providers={['github']} loading={loading} />
        </div>

        {/* 错误清理 */}
        {error && (
          <button
            onClick={clearError}
            className="mt-4 block w-full text-center text-2xs text-muted-foreground hover:text-foreground"
          >
            清除错误
          </button>
        )}

        {/* 加载提示（checkAuth 进行中且尚未登录） */}
        {loading && !user && (
          <div className="mt-6 flex items-center justify-center gap-2 text-2xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>正在连接服务端...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// 独立渲染入口（用于路由之外直接挂载）
export function LoginPageStandalone() {
  return (
    <HashRouter>
      <LoginPage />
    </HashRouter>
  );
}