/**
 * 用户菜单 —— 头像 + 当前套餐 + 余额（积分 / 每日 token 配额）
 * 点击展开：套餐详情、登出按钮
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@mclaw/shared';
import { ChevronDown, LogOut, Coins, Zap, Crown, Sparkles, RefreshCw, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAccountStore, getPlanDisplayName, getPlanBadgeColor } from '@/stores/account';
import { useSettingsStore } from '@/stores/settings';

interface UserMenuProps {
  collapsed?: boolean;
}

export function UserMenu({ collapsed }: UserMenuProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setSettingsSheetOpen = useSettingsStore((s) => s.setSettingsSheetOpen);
  const resetAccount = useAccountStore((s) => s.reset);
  const subscription = useAccountStore((s) => s.subscription);
  const wallet = useAccountStore((s) => s.wallet);
  const fetchAll = useAccountStore((s) => s.fetchAll);

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userId = user?.id;

  // 用户态可用后立即刷新账户摘要，避免启动后必须先打开菜单才显示最新订阅/积分。
  useEffect(() => {
    if (!userId) return;
    void fetchAll();
  }, [fetchAll, userId]);

  // 进入菜单时拉取账户信息
  useEffect(() => {
    if (!open) return;
    void fetchAll();
  }, [open, fetchAll]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      resetAccount();
      navigate('/login', { replace: true });
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    void fetchAll();
  };

  const handleOpenSettings = () => {
    setOpen(false);
    setSettingsSheetOpen(true);
  };

  const initials = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="user-menu-trigger"
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
          'hover:bg-sidebar-hover text-sidebar-foreground',
        )}
      >
        {/* 头像 */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-hover text-xs font-semibold text-white shadow-sm overflow-hidden">
          {user.avatar_url?.startsWith('http') ? (
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : user.avatar_url ? (
            <span>{user.avatar_url}</span>
          ) : (
            initials
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{user.name || user.email}</div>
            <div className="mt-0.5 flex items-center gap-1">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded border px-1 py-px text-[10px] font-medium',
                  getPlanBadgeColor(subscription?.plan),
                )}
              >
                <Crown className="h-2.5 w-2.5" />
                {getPlanDisplayName(subscription?.plan)}
              </span>
              {wallet && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-sidebar-muted">
                  <Coins className="h-2.5 w-2.5" />
                  {formatNumber(wallet.balance)}
                </span>
              )}
            </div>
          </div>
        )}
        {!collapsed && (
          <ChevronDown
            className={cn('h-3 w-3 shrink-0 text-sidebar-muted transition-transform', open && 'rotate-180')}
          />
        )}
      </button>

      {open && (
        <div
          data-testid="user-menu-dropdown"
          className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-surface-modal shadow-xl shadow-black/10 p-1 animate-in fade-in slide-in-from-bottom-1 duration-150"
        >
          {/* 账户摘要 */}
          <div className="px-3 py-2.5 border-b border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xs font-medium text-muted-foreground">{t('userMenu.currentSubscription')}</div>
              <button
                onClick={handleRefresh}
                className="text-muted-foreground hover:text-foreground"
                title={t('actions.refresh')}
                aria-label={t('actions.refresh')}
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-2xs font-semibold',
                  getPlanBadgeColor(subscription?.plan),
                )}
              >
                <Crown className="h-3 w-3" />
                {getPlanDisplayName(subscription?.plan)}
              </span>
              {subscription?.auto_renew && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-2xs font-medium text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="h-2.5 w-2.5" />
                  {t('userMenu.autoRenew')}
                </span>
              )}
            </div>

            {/* 积分 + 配额 */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-accent/40 p-2">
                <div className="flex items-center gap-1 text-2xs text-muted-foreground">
                  <Coins className="h-3 w-3" />
                  <span>{t('userMenu.creditBalance')}</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums">
                  {wallet ? formatNumber(wallet.balance) : '—'}
                </div>
              </div>
              <div className="rounded-lg bg-accent/40 p-2">
                <div className="flex items-center gap-1 text-2xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>{t('userMenu.todayTokens')}</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums">
                  {wallet ? formatNumber(tokenRemaining(wallet)) : '—'}
                </div>
              </div>
            </div>

            {/* Token 配额明细 */}
            {wallet && (wallet.daily_basic_token_balance > 0 || wallet.daily_pro_token_balance > 0 || wallet.daily_ultra_token_balance > 0) && (
              <div className="mt-2 space-y-0.5 text-2xs text-muted-foreground">
                {wallet.daily_basic_token_balance > 0 && (
                  <div className="flex justify-between">
                    <span>{t('userMenu.basicModel')}</span>
                    <span className="tabular-nums">{formatNumber(wallet.daily_basic_token_balance)}</span>
                  </div>
                )}
                {wallet.daily_pro_token_balance > 0 && (
                  <div className="flex justify-between">
                    <span>{t('userMenu.proModel')}</span>
                    <span className="tabular-nums">{formatNumber(wallet.daily_pro_token_balance)}</span>
                  </div>
                )}
                {wallet.daily_ultra_token_balance > 0 && (
                  <div className="flex justify-between">
                    <span>{t('userMenu.ultraModel')}</span>
                    <span className="tabular-nums">{formatNumber(wallet.daily_ultra_token_balance)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 操作 */}
          <button
            type="button"
            onClick={handleOpenSettings}
            data-testid="sidebar-nav-settings"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-2xs font-medium hover:bg-accent transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            {t('sidebar.settings')}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            data-testid="user-menu-logout"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-2xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}

function tokenRemaining(wallet: { daily_basic_token_balance: number; daily_pro_token_balance: number; daily_ultra_token_balance: number }): number {
  return wallet.daily_basic_token_balance + wallet.daily_pro_token_balance + wallet.daily_ultra_token_balance;
}
