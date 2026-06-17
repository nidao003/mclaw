import { cn } from '../../utils/cn';
import type { PlanLevel } from '../../types/subscription';
import { PLAN_NAMES } from '../../utils/constants';

interface PlanBadgeProps {
  level: PlanLevel;
  className?: string;
}

const BADGE_STYLES: Record<PlanLevel, string> = {
  basic: 'bg-surface-input text-muted-foreground border-border',
  pro: 'bg-brand/10 text-brand border-brand/30',
  ultra: 'bg-foreground/10 text-foreground border-foreground/30',
};

// 套餐等级标签
export function PlanBadge({ level, className }: PlanBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2 py-0.5 text-2xs font-medium',
        BADGE_STYLES[level],
        className,
      )}
    >
      {PLAN_NAMES[level]}
    </span>
  );
}
