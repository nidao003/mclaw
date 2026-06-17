import { useNavigate, Link } from 'react-router-dom';
import { LoginForm, OAuthButtons, useAuth } from '@shared';

// 登录页 — Skills Hub 设计规范
export default function Login() {
  const navigate = useNavigate();
  const { loading, error, login, isLoggedIn } = useAuth();

  // 已登录跳转首页
  if (isLoggedIn) {
    navigate('/', { replace: true });
    return null;
  }

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    navigate('/');
  };

  const handleOAuth = (provider: string) => {
    // OAuth 跳转到 Go 后端
    window.location.href = `/api/v1/auth/oauth/${provider}`;
  };

  return (
    <div className="container flex items-center justify-center py-20">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">登录 mclaw</h1>
          <p className="mt-2 text-base text-muted-foreground">
            登录后可以安装和管理技能
          </p>
        </div>

        <div className="mt-8">
          <LoginForm onSubmit={handleLogin} loading={loading} error={error ?? undefined} />
        </div>

        <div className="mt-6">
          <OAuthButtons onOAuthLogin={handleOAuth} />
        </div>

        <p className="mt-8 text-center text-2xs text-muted-foreground">
          还没有账号？{' '}
          <Link to="/pricing" className="text-primary hover:underline">
            查看方案并注册
          </Link>
        </p>
      </div>
    </div>
  );
}
