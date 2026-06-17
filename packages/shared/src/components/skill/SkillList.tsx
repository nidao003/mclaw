import type { SkillDetail } from '../../types/skill';
import { SkillCard } from './SkillCard';
import { cn } from '../../utils/cn';

interface SkillListProps {
  skills: SkillDetail[];
  loading?: boolean;
  className?: string;
}

// 技能列表 — skillhub.cn 风格的纵向技能流
export function SkillList({ skills, loading, className }: SkillListProps) {
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-[24px] border border-black/[0.06] bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-secondary" />
                <div className="h-3 w-full rounded bg-secondary" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-meta">没有找到技能</p>
        <p className="mt-1 text-2xs">试试调整搜索条件</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  );
}
