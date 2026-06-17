import { Link } from 'react-router-dom';
import { ArrowRight, Download, ShieldCheck, Star } from 'lucide-react';
import type { SkillDetail } from '../../types/skill';
import { formatCount } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useSpotlight } from '../animations/useSpotlight';

interface SkillCardProps {
  skill: SkillDetail;
  className?: string;
}

// 技能卡片 — skillhub.cn 风格横向列表项，hover 蓝色聚光跟随
export function SkillCard({ skill, className }: SkillCardProps) {
  const requiresConfig = Boolean(skill.args_schema && Object.keys(skill.args_schema).length > 0);
  const { layerStyle, bind } = useSpotlight('rgba(57, 87, 255, 0.10)');

  return (
    <Link
      to={`/skills/${skill.skill_id}`}
      {...bind}
      className={cn(
        'group relative flex gap-4 overflow-hidden rounded-[24px] border border-black/[0.06] bg-white p-5',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-black/10 hover:shadow-xl hover:shadow-black/5',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-in-out"
        style={layerStyle}
      />
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg font-semibold text-skillhub-blue">
        {skill.icon || skill.name.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1 pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-display text-lg font-semibold leading-snug">{skill.name}</h3>
          {requiresConfig && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] font-medium text-black/55">
              <ShieldCheck className="h-3 w-3" />
              需配置 API Key
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/60">
          {skill.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-black/50">
          <div className="flex items-center gap-1.5">
            {skill.rating_count > 0 ? (
              <>
                <Star className="h-3.5 w-3.5 fill-skillhub-blue text-skillhub-blue" />
                <span className="font-medium text-foreground">{skill.rating_avg.toFixed(1)}</span>
                <span>{skill.rating_count}</span>
              </>
            ) : (
              <span>暂无评分</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>{formatCount(skill.install_count)}</span>
          </div>
          {skill.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-black/55">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <ArrowRight className="absolute right-5 top-6 h-4 w-4 text-black/35 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
