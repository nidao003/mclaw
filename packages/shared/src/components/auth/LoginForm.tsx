import { useState } from 'react';
import { Mail, Key, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  loading?: boolean;
  error?: string;
  className?: string;
}

// 邮箱密码登录表单
// 输入框: card 白底 / 8px 圆角 / hairline 边框 / 44px 高
// CTA: 地铁橙 / 8px 圆角 / 40px 高
export function LoginForm({ onSubmit, loading, error, className }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          <Mail className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full h-11 rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          <Key className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full h-11 rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
          required
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={cn(
          'w-full h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors',
          'hover:bg-primary/90 active:bg-primary/80',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'inline-flex items-center justify-center gap-2',
        )}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
