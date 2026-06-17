import { useExpertList, ExpertCard } from '@shared';
import { Loader2 } from 'lucide-react';

// 专家列表页 — 10个地铁资源经营行业专家
export default function Experts() {
  const { experts, loading, error } = useExpertList();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-16 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-16 md:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-normal md:text-5xl">
          地铁资源经营行业专家
        </h1>
        <p className="mt-4 text-base leading-7 text-black/60">
          专家不是通用问答助手，而是面向地铁资源经营场景沉淀的专业能力，帮助用户获得更符合行业实际的分析、判断、建议和输出。
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {experts.map((expert) => (
          <ExpertCard key={expert.slug} expert={expert} />
        ))}
      </div>
    </div>
  );
}
