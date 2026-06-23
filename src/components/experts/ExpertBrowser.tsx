/**
 * 专家浏览器 —— 调用 Go 后端 /api/v1/experts 拉取云端专家列表
 * 与 Web 端 Experts 页面共用同一 API 客户端
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Bot,
  Loader2,
  AlertCircle,
  X,
  Puzzle,
  Sparkles,
} from 'lucide-react';
import { expertApi, type Expert } from '@mclaw/shared';
import { cn } from '@/lib/utils';

interface ExpertBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpertBrowser({ open, onOpenChange }: ExpertBrowserProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Expert | null>(null);

  // 搜索去抖
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 拉取数据
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // 打开 Sheet 时重置 loading/error 后再发起请求 —— 这是异步数据获取的标准模式
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    expertApi
      .list()
      .then((data: Expert[]) => {
        if (cancelled) return;
        setExperts(data ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!debounced) return experts;
    const q = debounced.toLowerCase();
    return experts.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.scenarios ?? []).some((s) => s.toLowerCase().includes(q)),
    );
  }, [experts, debounced]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[640px] p-0 flex flex-col border-l border-border bg-surface-modal shadow-[0_0_40px_rgba(0,0,0,0.2)]"
        side="right"
      >
        <SheetHeader className="px-7 py-6 border-b border-border">
          <SheetTitle className="text-2xl font-serif font-normal tracking-tight">
            浏览专家
          </SheetTitle>
          <SheetDescription className="text-meta text-foreground/70">
            来自云端的地铁行业专家（来自 Go 后端 /api/v1/experts）
          </SheetDescription>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex items-center bg-accent/50 rounded-xl px-3 py-2 border border-border flex-1">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="搜索专家..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-2 h-auto border-0 bg-transparent p-0 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-meta"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-foreground/50 hover:text-foreground shrink-0 ml-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">加载云端专家中...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bot className="h-10 w-10 mb-4 opacity-50" />
              <p>{debounced ? '没有匹配的专家' : '暂无可用专家'}</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((expert) => (
                <div
                  key={expert.id}
                  data-testid="expert-item"
                  className="group flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer border border-transparent hover:border-border/50"
                  onClick={() => setSelected(expert)}
                >
                  <div className="h-10 w-10 shrink-0 flex items-center justify-center text-lg bg-gradient-to-br from-violet-500/15 to-blue-500/15 border border-violet-500/20 rounded-xl overflow-hidden">
                    <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {expert.name}
                      </h3>
                      {expert.sort_order != null && (
                        <Badge variant="secondary" className="shrink-0 text-2xs px-1.5 py-0 h-5 bg-accent/50 border-0 shadow-none">
                          #{expert.sort_order}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {expert.subtitle || expert.description}
                    </p>
                    {expert.scenarios && expert.scenarios.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {expert.scenarios.slice(0, 3).map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="text-2xs px-1.5 py-0 h-4 border-border/60 text-muted-foreground"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 详情面板 */}
        {selected && (
          <div className="border-t border-border bg-accent/30 px-7 py-5 max-h-[45%] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500/15 to-blue-500/15 border border-violet-500/20 rounded-lg">
                  <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold truncate">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selected.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selected.description && (
              <p className="text-sm text-foreground/80 leading-relaxed mb-3 whitespace-pre-line">
                {selected.description}
              </p>
            )}

            {selected.scenarios && selected.scenarios.length > 0 && (
              <div className="mb-3">
                <p className="text-2xs font-medium text-muted-foreground mb-1.5">
                  适用场景
                </p>
                <div className="flex flex-wrap gap-1">
                  {selected.scenarios.map((s) => (
                    <Badge key={s} variant="secondary" className="text-2xs">
                      <Sparkles className="h-2.5 w-2.5 mr-1" />
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selected.related_skills && selected.related_skills.length > 0 && (
              <div>
                <p className="text-2xs font-medium text-muted-foreground mb-1.5">
                  相关技能
                </p>
                <div className="flex flex-wrap gap-1">
                  {selected.related_skills.map((s) => (
                    <Badge key={s} variant="outline" className="text-2xs">
                      <Puzzle className="h-2.5 w-2.5 mr-1" />
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// 抑制未使用变量警告
void cn;