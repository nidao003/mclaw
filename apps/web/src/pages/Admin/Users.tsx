import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuthStore, canManageUsers } from '@shared';
import type { UserRole } from '@shared/types/user';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: '普通用户' },
  { value: 'publisher', label: '技能上传者' },
  { value: 'reviewer', label: '审核员' },
  { value: 'admin', label: '管理员' },
  { value: 'super_admin', label: '超级管理员' },
];

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar_url?: string;
  created_at: string;
}

// 用户管理页 — Super admin / Admin 管理用户
export default function AdminUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !canManageUsers(currentUser.role)) return;
    fetch('/api/v1/admin/users', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setUsers(data.data?.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      }
    } catch {
      // 角色更新失败，静默处理
    }
  };

  // 未登录提示
  if (!currentUser) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-4 py-24 text-center">
        <Shield className="h-10 w-10 text-black/30" />
        <h1 className="mt-4 font-display text-3xl font-semibold">请先登录</h1>
        <p className="mt-3 text-sm text-black/55">用户管理仅管理员可用。</p>
        <Link to="/login" className="skillhub-capsule-button mt-6">
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
        <h1 className="mt-4 font-display text-3xl font-semibold">无权限访问</h1>
        <p className="mt-3 text-sm text-black/55">用户管理仅超级管理员可用。</p>
        <Link to="/skills" className="skillhub-ghost-button mt-6">
          返回技能市场
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-skillhub-ink/40">加载中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-skillhub-ink mb-2">用户管理</h1>
      <p className="text-skillhub-ink/50 mb-8">管理用户角色和权限分配</p>

      <div className="bg-white border border-skillhub-line rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-skillhub-soft border-b border-skillhub-line">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">用户</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">邮箱</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">角色</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">注册时间</th>
              <th className="px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-skillhub-line">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-sm font-medium text-brand">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-skillhub-ink">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-skillhub-ink/50">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-skillhub-soft rounded-full text-xs font-medium text-skillhub-ink/70">
                    <Shield className="w-3 h-3" />
                    {ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-skillhub-ink/50">
                  {new Date(u.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    disabled={u.id === currentUser?.id}
                    className="px-3 py-1.5 bg-white border border-skillhub-line rounded-lg text-sm focus:outline-none focus:border-skillhub-blue disabled:opacity-40"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-12 text-center text-skillhub-ink/40">暂无用户数据</div>
        )}
      </div>
    </div>
  );
}
