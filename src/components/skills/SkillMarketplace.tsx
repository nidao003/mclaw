/**
 * 技能市场模态框 —— 调用 Go 后端 /api/v1/skills 拉取已发布技能
 * 与 Web 端 Skills 页面共用同一 API 客户端
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Package,
  Download,
  Star,
  Loader2,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { skillApi, type SkillDetail } from '@mclaw/shared';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SkillMarketplaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  metro: '地铁',
  data: '数据',
  doc: '文档',
  analytics: '分析',
  default: '其他',
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat.toLowerCase()] ?? cat;
}

export function SkillMarketplace({ open, onOpenChange }: SkillMarketplaceProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [skills, setSkills] = useState<SkillDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<SkillDetail | null>(null);

  // 搜索去抖
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 拉取数据
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    skillApi
      .list({
        search: debounced || undefined,
        sort_by: 'installs',
        limit: 50,
      } as unknown as Record<string, string>)
      .then((resp: { skills?: SkillDetail[] }) => {
        if (cancelled) return;
        setSkills(resp.skills ?? []);
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
  }, [open, debounced]);

  const filtered = useMemo(() => {
    if (!debounced) return skills;
    const q = debounced.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [skills, debounced]);

  const handleInstall = async (skill: SkillDetail) => {
    setInstalling((m) => ({ ...m, [skill.id]: true }));
    try {
      await skillApi.install(skill.id);
      toast.success(`已安装 ${skill.name}`);
    } catch (err) {
      toast.error(`安装失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setInstalling((m) => ({ ...m, [skill.id]: false }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[640px] p-0 flex flex-col border-l border-border bg-surface-modal shadow-[0_0_40px_rgba(0,0,0,0.2)]"
        side="right"
      >
        <SheetHeader className="px-7 py-6 border-b border-border">
          <SheetTitle className="text-2xl font-serif font-normal tracking-tight">
            浏览技能市场
          </SheetTitle>
          <SheetDescription className="text-meta text-foreground/70">
            发现并安装来自云端的技能（来自 Go 后端 /api/v1/skills）
          </SheetDescription>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex items-center bg-accent/50 rounded-xl px-3 py-2 border border-border flex-1">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="搜索技能..."
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
              <p className="text-sm">加载云端技能中...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="h-10 w-10 mb-4 opacity-50" />
              <p>{debounced ? '没有匹配的技能' : '暂无已发布的技能'}</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((skill) => (
                <div
                  key={skill.id}
                  data-testid="marketplace-skill-item"
                  className="group flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer border border-transparent hover:border-border/50"
                  onClick={() => setSelected(skill)}
                >
                  <div className="h-10 w-10 shrink-0 flex items-center justify-center text-xl bg-accent/50 border border-border/50 rounded-xl overflow-hidden">
                    {skill.icon_name || skill.icon || '🧩'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {skill.name}
                      </h3>
                      {skill.categories?.[0] && (
                        <Badge variant="secondary" className="shrink-0 text-2xs px-1.5 py-0 h-5 bg-accent/50 border-0 shadow-none">
                          {categoryLabel(skill.categories[0])}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-1">
                      {skill.summary || skill.description}
                    </p>
                    <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                      {skill.rating_count > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {skill.rating_avg.toFixed(1)}
                          <span className="ml-0.5">({skill.rating_count})</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5">
                        <Download className="h-3 w-3" />
                        {skill.install_count}
                      </span>
                      {skill.source_type && (
                        <span className="text-muted-foreground/70">
                          {skill.source_type === 'official' ? '官方' : '社区'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleInstall(skill);
                    }}
                    disabled={!!installing[skill.id]}
                    className="h-8 px-3 shrink-0 rounded-full text-2xs shadow-none"
                  >
                    {installing[skill.id] ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        安装
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 详情面板 */}
        {selected && (
          <div className="border-t border-border bg-accent/30 px-7 py-5 max-h-[40%] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{selected.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.skill_id}</p>
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
            {selected.tags && selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {selected.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-2xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => void handleInstall(selected)}
                disabled={!!installing[selected.id]}
                className={cn('h-8 rounded-full shadow-none')}
              >
                {installing[selected.id] ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    安装此技能
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const slug = selected.skill_id || selected.id;
                  window.open(`https://skills.mclaw.example.com/api/v1/skills/by-slug/${slug}`, '_blank');
                }}
                className="h-8 rounded-full"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                详情
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}