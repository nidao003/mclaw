import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Crown, Coins, Activity, Loader2 } from 'lucide-react';
import { useAuthStore, canManageUsers, teamApi } from '@shared';
import type { TeamMemberInfo, MemberListResp } from '@shared';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' },
];

// 会员等级映射（后续对接 subscription API）
const MEMBERSHIP_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: '基础版', color: 'bg-secondary text-muted-foreground' },
  pro: { label: '专业版', color: 'bg-brand/10 text-brand-hover' },
  enterprise: { label: '企业版', color: 'bg-yellow-100 text-yellow-700' },
};

// 用户管理页 — Admin / Super admin 管理团队成员
export default function AdminUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const [data, setData] = useState<MemberListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await teamApi.listMembers();
      setData(resp);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser && canManageUsers(currentUser.role)) {
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [currentUser, fetchMembers]);

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
        <p className="mt-3 text-sm text-muted-foreground">用户管理仅超级管理员可用。</p>
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

  const members = data?.members ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Users className="h-5 w-5" />
            用户管理
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            管理团队成员、会员等级和资源使用
            {data?.member_limit ? ` （上限 ${data.member_limit} 人）` : ''}
          </p>
        </div>
        <button
          onClick={fetchMembers}
          disabled={loading}
          className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-secondary"
        >
          刷新
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">暂无团队成员</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">角色</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">会员等级</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Token 用量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">接口调用</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">最近活跃</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <MemberRow key={member.user.id} member={member} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MemberRow({ member }: { member: TeamMemberInfo }) {
  const { user, role, last_active_at } = member;
  const membership = MEMBERSHIP_LABELS[user.role] ?? MEMBERSHIP_LABELS.basic;

  return (
    <tr className="border-b border-border last:border-0">
      {/* 用户信息 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name || '未设置昵称'}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </td>

      {/* 角色 */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Shield className="h-3 w-3" />
          {ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role}
        </span>
      </td>

      {/* 会员等级 */}
      <td className="px-4 py-3">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', membership.color)}>
          <Crown className="h-3 w-3" />
          {membership.label}
        </span>
      </td>

      {/* Token 用量 — 后续对接 wallet API */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Coins className="h-3.5 w-3.5" />
          <span>—</span>
        </div>
      </td>

      {/* 接口调用量 — 后续对接统计 API */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          <span>—</span>
        </div>
      </td>

      {/* 最近活跃 */}
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {last_active_at
          ? new Date(last_active_at * 1000).toLocaleDateString('zh-CN')
          : '—'}
      </td>
    </tr>
  );
}
