import { Bot, Check, X, Loader2, Wifi } from 'lucide-react';
import { useTeamModels } from '@shared';

// 云端模型设置页 — 只读，显示团队已配置的 AI 模型
export default function CloudModels() {
  const { models, loading, error } = useTeamModels();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Bot className="h-5 w-5 text-brand" />
          云端模型
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          登录后自动使用团队配置的云端模型进行对话和分析
        </p>
      </div>

      {models.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Wifi className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">团队尚未配置云端模型</p>
          <p className="mt-1 text-xs text-muted-foreground">请联系管理员在管理后台配置 AI 模型</p>
        </div>
      ) : (
        <div className="space-y-3">
          {models.filter((m) => !m.is_hidden).map((model) => (
            <div
              key={model.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{model.model}</h3>
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {model.interface_type}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {model.provider && `${model.provider} · `}
                  {model.base_url}
                </p>
              </div>
              <div className="shrink-0">
                {model.last_check_success ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3.5 w-3.5" />
                    可用
                  </span>
                ) : model.last_check_error ? (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive">
                    <X className="h-3.5 w-3.5" />
                    异常
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">未检查</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
