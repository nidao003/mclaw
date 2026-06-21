import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, canReview, canManageUsers } from '@shared';
import { Shield, ClipboardCheck, Upload, Users, LayoutDashboard, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_NAV: { to: string; label: string; icon: typeof ClipboardCheck }[] = [
  { to: '/admin/overview', label: '概览', icon: LayoutDashboard },
  { to: '/admin/skills', label: '技能审核', icon: ClipboardCheck },
  { to: '/admin/users', label: '用户管理', icon: Users },
  { to: '/admin/models', label: '模型管理', icon: Bot },
  { to: '/admin/create', label: '上传技能', icon: Upload },
];

// 管理后台入口 — Skills Hub 设计规范
export default function Admin() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const isAdminRole = canReview(user?.role) || canManageUsers(user?.role);

  if (!user) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-4 py-24 text-center">
        <Shield className="h-10 w-10 text-black/30" />
        <h1 className="mt-4 font-display text-3xl font-semibold">请先登录</h1>
        <p className="mt-3 text-sm text-black/55">管理后台仅管理员可用。</p>
        <Link to="/login" className="skillhub-capsule-button mt-6">
          去登录
        </Link>
      </div>
    );
  }

  if (!isAdminRole) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-4 py-24 text-center">
        <Shield className="h-10 w-10 text-black/30" />
        <h1 className="mt-4 font-display text-3xl font-semibold">无权限访问</h1>
        <p className="mt-3 text-sm text-black/55">发布和审核技能仅管理员账号可以使用。</p>
        <Link to="/skills" className="skillhub-ghost-button mt-6">
          返回技能市场
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">管理后台</h1>
      </div>

      <div className="flex gap-8">
        {/* 左侧导航 — 与个人中心布局一致 */}
        <nav className="w-44 shrink-0 space-y-1">
          {ADMIN_NAV.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || pathname.startsWith(to + '/');
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

        {/* 右侧内容区：子路由 */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
