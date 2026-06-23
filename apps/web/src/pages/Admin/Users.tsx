import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Loader2, ChevronDown, Coins, Zap } from 'lucide-react';
import { useAuthStore, canManageUsers, adminUserApi } from '@shared';
import type { AdminUserItem } from '@shared';

// 可分配的角色（对齐后端 validRoles）
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'user', label: '普通用户' },
  { value: 'publisher', label: '发布者' },
  { value: 'reviewer', label: '审核员' },
  { value: 'enterprise', label: '企业' },
  { value: 'admin', label: '管理员' },
  { value: 'super_admin', label: '超级管理员' },
];

// 套餐名标签
const PLAN_LABEL: Record<string, string> = {
  basic: '基础版',
  pro: '专业版',
  ultra: '旗舰版',
  enterprise: '企业版',
  free: '免费版',
};

function planLabel(name: string): string {
  if (!name) return '免费';
  return PLAN_LABEL[name] ?? name;
}

function formatNumber(n: number): string {
  if (!n) return '—';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString('zh-CN');
}

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

function roleBadgeClass(role: string): string {
  if (role === 'super_admin' || role === 'admin') return 'bg-yellow-100 text-yellow-700';
  if (role === 'reviewer') return 'bg-blue-100 text-blue-700';
  if (role === 'publisher') return 'bg-green-100 text-green-700';
  if (role === 'enterprise') return 'bg-purple-100 text-purple-700';
  return 'bg-secondary text-muted-foreground';
}

// 用户管理页 — 管理员管理所有用户及其角色（不区分团队）
export default function AdminUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminUserApi.listUsers({ limit: 100 });
      setUsers(resp.users ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser && canManageUsers(currentUser.role)) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [currentUser, fetchUsers]);

  const handleRoleChange = async (userId: string, role: string) => {
    setSavingId(userId);
    setError(null);
    try {
      await adminUserApi.updateRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  // 未登录提示
  if (!currentUser) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-4 py-24 text-center">
        <Shield className="h-10 w-10 text-black/30" />
        <h1 className="mt-4 text-3xl font-semibold">请先登录</h1>
        <p className="mt-3 text-sm text-muted-foreground">用户管理仅管理员可用。</p>
        <Link to="/login" className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          去登录
        </Link>
      </div>
    );
  }

  // 权限不足提示
  if (!canManageUsers(currentUser.role)) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-4 py-24 text-center">
        <Shield className="h-10 w-10 text-black/30" />
        <h1 className="mt-4 text-3xl font-semibold">无权限访问</h1>
        <p className="mt-3 text-sm text-muted-foreground">用户管理仅管理员可用。</p>
        <Link to="/skills" className="mt-6 rounded-lg border border-border px-5 py-2.5 text-sm transition-colors hover:bg-secondary">
          返回技能市场
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Users className="h-5 w-5" />
            用户管理
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            管理所有用户及其角色权限（共 {users.length} 人）
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-secondary"
        >
          刷新
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">暂无用户</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">角色</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">订阅套餐</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">积分余额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Token 消耗</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">注册时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  {/* 用户信息 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name || '未设置昵称'}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* 角色 —— 可编辑下拉 */}
                  <td className="px-4 py-3">
                    <RoleSelect
                      value={u.role}
                      disabled={savingId === u.id || u.id === currentUser.id}
                      onChange={(role) => handleRoleChange(u.id, role)}
                    />
                  </td>

                  {/* 订阅套餐 */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {planLabel(u.plan_name)}
                    </span>
                  </td>

                  {/* 积分余额 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs">
                      <Coins className="h-3.5 w-3.5 text-yellow-600" />
                      <span className="font-medium">{formatNumber(u.balance)}</span>
                    </div>
                  </td>

                  {/* Token 消耗 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Zap className="h-3.5 w-3.5" />
                      <span>{formatNumber(u.tokens_used)}</span>
                    </div>
                  </td>

                  {/* 注册时间 */}
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 角色选择器：当前角色显示为 badge，点击展开下拉切换
// 用 fixed 定位弹层，避免被父级 overflow-hidden 表格裁剪
function RoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (role: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (disabled) return;
    if (!open && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${roleBadgeClass(value)} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:opacity-80'}`}
      >
        <Shield className="h-3 w-3" />
        {ROLE_LABEL[value] ?? value}
        {!disabled && <ChevronDown className="h-3 w-3" />}
      </button>

      {open && !disabled && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 50 }}
            className="min-w-[8rem] max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
          >
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-secondary ${opt.value === value ? 'font-semibold text-brand' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
