import { useState } from 'react';
import { useAuthStore, authApi } from '@shared';
import { Loader2, Save, User, Mail, Shield, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// 角色中文映射
const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  enterprise: '企业用户',
  individual: '个人用户',
  subaccount: '子账户',
  user: '普通用户',
};

// 个人资料页 — Skills Hub 设计规范
export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 密码修改
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await authApi.updateProfile({ name: name.trim(), avatar_url: avatarUrl.trim() || undefined });
      await checkAuth();
      setMessage({ type: 'success', text: '资料已更新' });
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return;
    if (newPassword.length < 6) {
      setPwdMessage({ type: 'error', text: '新密码至少 6 位' });
      return;
    }
    setChangingPwd(true);
    setPwdMessage(null);
    try {
      await authApi.changePassword({ old_password: oldPassword, new_password: newPassword });
      setPwdMessage({ type: 'success', text: '密码已修改' });
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setPwdMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setChangingPwd(false);
    }
  };

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const createdDate = new Date(user.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* 用户概览卡片 */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold tracking-tight mb-4">账户信息</h2>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold overflow-hidden">
              {user.avatar_url?.startsWith('http') ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : user.avatar_url ? (
                user.avatar_url
              ) : name?.charAt(0)?.toUpperCase() || <User className="h-6 w-6" />}
            </div>
            <div>
              <p className="font-semibold">{user.name || '未设置昵称'}</p>
              <p className="text-meta text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-2 mt-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="text-meta">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 shrink-0" />
              <span className="text-meta">{roleLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="text-meta">注册于 {createdDate}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-meta font-mono text-2xs">ID: {user.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 编辑资料 — 8px 圆角输入框 */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold tracking-tight mb-4">编辑资料</h2>

        {message && (
          <div
            className={cn(
              'mb-4 rounded-lg px-3 py-2 text-sm',
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-destructive/10 text-destructive',
            )}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4 max-w-md">
          <div>
            <label className="mb-1.5 block text-sm font-medium">昵称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入昵称"
              className="w-full h-11 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">头像 (Emoji 或 URL)</label>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-lg overflow-hidden">
                {avatarUrl?.startsWith('http') ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : avatarUrl ? (
                  avatarUrl
                ) : name?.charAt(0)?.toUpperCase() || '👤'}
              </div>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="输入 emoji 或头像 URL"
                className="flex-1 h-11 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40"
              />
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving || !name.trim()}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors',
              'hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50',
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>

      {/* 修改密码 */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold tracking-tight mb-4">修改密码</h2>

        {pwdMessage && (
          <div
            className={cn(
              'mb-4 rounded-lg px-3 py-2 text-sm',
              pwdMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-destructive/10 text-destructive',
            )}
          >
            {pwdMessage.text}
          </div>
        )}

        <div className="space-y-4 max-w-md">
          <div>
            <label className="mb-1.5 block text-sm font-medium">当前密码</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="输入当前密码"
              className="w-full h-11 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="输入新密码（至少 6 位）"
              className="w-full h-11 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPwd || !oldPassword || !newPassword}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-medium transition-colors',
              'hover:bg-secondary/70 disabled:opacity-50',
            )}
          >
            {changingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {changingPwd ? '修改中...' : '修改密码'}
          </button>
        </div>
      </div>
    </div>
  );
}
