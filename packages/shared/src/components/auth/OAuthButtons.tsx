import { Github } from 'lucide-react';
import { cn } from '../../utils/cn';

interface OAuthButtonsProps {
  onOAuthLogin: (provider: string) => void;
  providers?: string[];
  loading?: boolean;
  className?: string;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  github: <Github className="h-4 w-4" />,
  wechat: <span className="text-sm font-medium">微</span>,
};

const PROVIDER_NAMES: Record<string, string> = {
  github: 'GitHub',
  wechat: '微信',
};

// OAuth 登录按钮组
export function OAuthButtons({
  onOAuthLogin,
  providers = ['github'],
  loading,
  className,
}: OAuthButtonsProps) {
  if (providers.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-2xs">
          <span className="bg-background px-2 text-muted-foreground">或使用第三方登录</span>
        </div>
      </div>

      <div className="flex gap-2">
        {providers.map((provider) => (
          <button
            key={provider}
            onClick={() => onOAuthLogin(provider)}
            disabled={loading}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border',
              'px-4 py-2.5 text-sm font-medium transition-colors',
              'hover:bg-surface-input disabled:opacity-50',
            )}
          >
            {PROVIDER_ICONS[provider] || provider}
            <span>{PROVIDER_NAMES[provider] || provider}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
