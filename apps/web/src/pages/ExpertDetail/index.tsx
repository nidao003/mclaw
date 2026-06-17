import { useParams, Link } from 'react-router-dom';
import { useExpertDetail } from '@shared';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// 专家详情页 — 阶段3会完整实现，这里是占位
export default function ExpertDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { expert, loading, error } = useExpertDetail(slug);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-16 text-center">
        <p className="text-sm text-destructive">{error || '未找到该专家'}</p>
        <Link to="/experts" className="mt-4 inline-flex items-center gap-2 text-sm text-skillhub-blue hover:underline">
          <ArrowLeft className="h-4 w-4" />
          返回专家列表
        </Link>
      </div>
    );
  }

  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[expert.icon] ?? LucideIcons.Sparkles;

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-16 md:px-10">
      <Link to="/experts" className="inline-flex items-center gap-2 text-sm text-black/55 transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回专家列表
      </Link>

      <div className="mt-8 rounded-[32px] border border-black/[0.06] bg-white p-8 md:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-skillhub-blue text-white">
          <IconComponent className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold md:text-4xl">{expert.name}</h1>
        <p className="mt-4 text-base leading-7 text-black/60">{expert.description}</p>

        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold">适用场景</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {expert.scenarios.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm text-black/70">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-skillhub-blue" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="https://mclaw.dev/download/mclaw-latest.dmg" className="skillhub-capsule-button">
            <Download className="h-4 w-4" />
            下载 Mac 版
          </a>
          <a href="https://mclaw.dev/download/mclaw-latest.exe" className="skillhub-ghost-button">
            <Download className="h-4 w-4" />
            下载 Windows 版
          </a>
        </div>
      </div>
    </div>
  );
}
