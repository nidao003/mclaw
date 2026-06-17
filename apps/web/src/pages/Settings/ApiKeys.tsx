import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, apiKeyApi } from '@shared';
import type { ApiKeyDetail } from '@shared';
import { Key, Plus, Trash2, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/clipboard';

// API Key 管理页 — Skills Hub 设计规范
export default function ApiKeys() {
  const user = useAuthStore((s) => s.user);
  const [keys, setKeys] = useState<ApiKeyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiKeyApi.list();
      setKeys(data.keys);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchKeys();
  }, [user, fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const resp = await apiKeyApi.create({ name: newKeyName.trim() });
      setRevealedKey(resp.key);
      setKeys((prev) => [resp.detail, ...prev]);
      setNewKeyName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!revealedKey) return;
    await copyToClipboard(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('确定要吊销这个 API Key 吗？吊销后所有使用此 Key 的服务将无法访问。')) return;
    setRevokingId(id);
    try {
      await apiKeyApi.revoke(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevokingId(null);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Key className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-meta text-muted-foreground">请先登录</p>
        <Link to="/login" className="mt-2 text-sm text-primary hover:underline">去登录</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-meta text-muted-foreground">
          管理你的 API Keys，用于外部服务访问 SkillHub
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-2xs underline">关闭</button>
        </div>
      )}

      {/* 创建新 Key */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">创建新 API Key</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="输入 Key 名称，如：我的脚本、CI/CD"
            className="flex-1 h-11 rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40"
            disabled={creating}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newKeyName.trim()}
            className={cn(
              'rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors',
              'hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {creating ? '创建中...' : '创建'}
          </button>
        </div>

        {/* 明文 Key 展示（仅一次） */}
        {revealedKey && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-card p-4">
            <p className="text-2xs font-medium text-destructive flex items-center gap-1 mb-2">
              <AlertCircle className="h-3 w-3" />
              请立即复制并妥善保存，关闭后无法再次查看！
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-sm font-mono break-all select-all">
                {revealedKey}
              </code>
              <button
                onClick={handleCopy}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  copied ? 'bg-green-100 text-green-700' : 'bg-secondary hover:bg-secondary/70',
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keys 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Key className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-meta text-muted-foreground">还没有 API Key</p>
          <p className="mt-1 text-2xs text-muted-foreground">创建一个 Key 以在外部服务中调用 SkillHub API</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{key.name}</h4>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-2xs font-medium',
                    key.is_active ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground',
                  )}>
                    {key.is_active ? '活跃' : '已吊销'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-2xs text-muted-foreground">
                  <code className="font-mono">{key.key_prefix}...</code>
                  {key.last_used_at && <span>最近使用: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                  <span>创建于 {new Date(key.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {key.is_active && (
                <button
                  onClick={() => handleRevoke(key.id)}
                  disabled={revokingId === key.id}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {revokingId === key.id ? '吊销中...' : '吊销'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* API 使用说明 — 代码块用 JetBrains Mono */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold text-sm">如何使用 API Key</h3>
        <div className="mt-3 space-y-2 text-meta text-muted-foreground">
          <p>在请求中添加以下 header 即可认证：</p>
          <code className="block rounded-lg bg-secondary px-4 py-3 text-sm font-mono">
            X-API-Key: mclaw_your_key_here
          </code>
          <p>或使用 Authorization header：</p>
          <code className="block rounded-lg bg-secondary px-4 py-3 text-sm font-mono">
            Authorization: Bearer mclaw_your_key_here
          </code>
        </div>
      </div>
    </div>
  );
}
