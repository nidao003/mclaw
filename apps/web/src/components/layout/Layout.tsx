import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore, canReview, canManageUsers } from '@shared';
import { LogOut, Settings, Shield, ChevronDown, Download } from 'lucide-react';

// MClaw 顶栏导航 — 5项 + 下载按钮组
const NAV_ITEMS = [
  { label: '首页', path: '/' },
  { label: '专家', path: '/experts' },
  { label: '技能热榜', path: '/skills/trending' },
  { label: '全部技能', path: '/skills' },
  { label: '定价', path: '/pricing' },
] as const;

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading, checkAuth, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  // 每次路由变化时重新检查登录状态
  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 路由变化时关闭菜单
  useEffect(() => {
    setMenuOpen(false);
    setDownloadOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isLoggedIn = !loading && !!user;
  const isAdminRole = canReview(user?.role) || canManageUsers(user?.role);

  // 判断导航项是否激活：精确匹配或路径等于导航path（避免 /skills/trending 同时高亮 /skills）
  const isNavActive = (path: string) => pathname === path;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 h-[68px] border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 md:px-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-normal">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white">
              M
            </span>
            <span className="hidden sm:inline">MClaw</span>
          </Link>

          {/* 中间导航 */}
          <nav className="flex items-center gap-1 md:gap-2">
            {NAV_ITEMS.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors',
                  isNavActive(path)
                    ? 'bg-black text-white font-medium'
                    : 'text-black/70 hover:bg-secondary hover:text-foreground',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* 右侧：下载按钮 + 用户区 */}
          <div className="flex items-center gap-2">
            {/* 下载按钮 */}
            <div className="relative" ref={downloadRef}>
              <button
                onClick={() => setDownloadOpen(!downloadOpen)}
                className="skillhub-capsule-button py-2 px-4 text-xs md:text-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">下载</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', downloadOpen && 'rotate-180')} />
              </button>
              {downloadOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-black/10 bg-white py-1.5 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-top-1 duration-150">
                  <a
                    href="https://mclaw.dev/download/mclaw-latest.dmg"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-black/70 transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    下载 Mac 版
                  </a>
                  <a
                    href="https://mclaw.dev/download/mclaw-latest.exe"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-black/70 transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    下载 Windows 版
                  </a>
                </div>
              )}
            </div>

            {/* 用户区 */}
            {isLoggedIn && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                    menuOpen
                      ? 'bg-secondary text-foreground'
                      : 'text-black/70 hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand overflow-hidden">
	                    {user.avatar_url?.startsWith('http') ? (
	                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
	                    ) : user.avatar_url ? (
	                      user.avatar_url
	                    ) : (user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden max-w-[120px] truncate sm:inline">{user.name || user.email}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', menuOpen && 'rotate-180')} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-black/10 bg-white py-1.5 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-top-1 duration-150">
                    {isAdminRole && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-black/70 transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Shield className="h-4 w-4" />
                        管理后台
                      </Link>
                    )}
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-black/70 transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      个人中心
                    </Link>
                    <div className="mx-2 my-1 h-px bg-black/10" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-black/70 transition-colors hover:bg-destructive/5 hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  pathname === '/login'
                    ? 'bg-black text-white'
                    : 'bg-black/5 text-black/70 hover:bg-black/10',
                )}
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区：全宽落地页（个人中心/管理后台各自内置导航） */}
      <div className="flex flex-1">
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-black/[0.06] bg-white px-6 py-14">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            {/* 品牌区 */}
            <div className="max-w-xs">
              <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-white">
                  M
                </span>
                MClaw
              </Link>
              <p className="mt-3 text-sm leading-6 text-black/55">
                专为地铁资源经营打造的 AI 平台
              </p>
            </div>

            {/* 导航链接 */}
            <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <div>
                <p className="font-medium text-foreground">产品</p>
                <div className="mt-3 flex flex-col gap-2 text-black/55">
                  <Link to="/" className="hover:text-foreground transition-colors">首页</Link>
                  <Link to="/experts" className="hover:text-foreground transition-colors">专家</Link>
                  <Link to="/skills/trending" className="hover:text-foreground transition-colors">技能热榜</Link>
                  <Link to="/skills" className="hover:text-foreground transition-colors">全部技能</Link>
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground">支持</p>
                <div className="mt-3 flex flex-col gap-2 text-black/55">
                  <Link to="/pricing" className="hover:text-foreground transition-colors">定价</Link>
                  <Link to="/login" className="hover:text-foreground transition-colors">登录</Link>
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground">下载</p>
                <div className="mt-3 flex flex-col gap-2 text-black/55">
                  <a href="https://mclaw.dev/download/mclaw-latest.dmg" className="hover:text-foreground transition-colors">Mac 版</a>
                  <a href="https://mclaw.dev/download/mclaw-latest.exe" className="hover:text-foreground transition-colors">Windows 版</a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-black/[0.06] pt-6 text-center text-xs text-black/45">
            Copyright &copy; {new Date().getFullYear()} MClaw · 专为地铁资源经营打造的 AI 平台
            <span className="mx-1.5">·</span>
            Powered by <a href="https://mclaw.dev" className="text-skillhub-blue hover:underline">mclaw</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
