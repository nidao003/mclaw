import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore, canPublish } from '@shared';
import { cn } from '@/lib/utils';
import { User, Key, ArrowLeft, Package, Upload, Wallet, Bot } from 'lucide-react';

// 个人中心布局 — Skills Hub 设计规范
// 左侧栏：基础项（个人资料、API 密钥、我的账户）+ 发布者项（我的技能、上传技能）
// 内容区顶部：统一页面标题，按当前路由映射，切换菜单时有"着落感"
const PAGE_TITLES: Record<string, string> = {
  '/settings': '个人资料',
  '/settings/account': '我的账户',
  '/settings/api-keys': 'API 密钥',
  '/settings/models': '云端模型',
  '/settings/my-skills': '我的技能',
  '/settings/upload': '上传技能',
};

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  const navItems = [
    { to: '/settings', label: '个人资料', icon: User, exact: true },
    { to: '/settings/account', label: '我的账户', icon: Wallet },
    { to: '/settings/api-keys', label: 'API 密钥', icon: Key },
    { to: '/settings/models', label: '云端模型', icon: Bot },
    // 发布者可见：技能管理入口
    ...(!!user && canPublish(user.role)
      ? [
          { to: '/settings/my-skills', label: '我的技能', icon: Package },
          { to: '/settings/upload', label: '上传技能', icon: Upload },
        ]
      : []),
  ];

  const pageTitle = PAGE_TITLES[pathname] || '个人资料';

  return (
    <div className="container py-10">
      {/* 返回 + 标题 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Link>
        <span className="h-4 w-px bg-border" />
        <h1 className="text-2xl font-semibold tracking-tight">个人中心</h1>
      </div>

      {!user ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <User className="h-10 w-10" />
          <p className="mt-3 text-sm">请先登录</p>
          <Link
            to="/login"
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            去登录
          </Link>
        </div>
      ) : (
        <div className="flex gap-8">
          {/* 左侧导航 */}
          <nav className="w-44 shrink-0 space-y-1">
            {navItems.map(({ to, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* 右侧内容区：统一页面标题 + 子内容 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold tracking-tight mb-6">{pageTitle}</h2>
            <Outlet />
          </div>
        </div>
      )}
    </div>
  );
}
