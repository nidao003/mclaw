import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import type { Expert } from '../../types/expert';

interface ExpertCardProps {
  expert: Expert;
  className?: string;
}

/** 专家卡片组件 — 白底圆角卡片，hover轻微上移 */
export function ExpertCard({ expert, className }: ExpertCardProps) {
  const IconComponent =
    (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[expert.icon] ??
    LucideIcons.Sparkles;

  return (
    <Link
      to={`/experts/${expert.slug}`}
      className={`group min-h-[200px] rounded-[24px] border border-black/[0.06] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5 ${className ?? ''}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-skillhub-blue text-white">
        <IconComponent className="h-6 w-6" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold">{expert.name}</h3>
      <p className="mt-2 text-sm leading-6 text-black/60 line-clamp-3">{expert.subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {expert.scenarios.slice(0, 3).map((s) => (
          <span key={s} className="rounded-full bg-skillhub-blue/8 px-2.5 py-0.5 text-2xs text-skillhub-blue">
            {s}
          </span>
        ))}
        {expert.scenarios.length > 3 && (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-2xs text-black/45">
            +{expert.scenarios.length - 3}
          </span>
        )}
      </div>
    </Link>
  );
}
