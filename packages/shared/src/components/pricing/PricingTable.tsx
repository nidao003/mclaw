import { Check } from 'lucide-react';
import type { Plan } from '../../types/subscription';
import { formatPrice } from '../../utils/format';
import { PLAN_NAMES } from '../../utils/constants';
import { cn } from '../../utils/cn';

interface PricingTableProps {
  plans: Plan[];
  currentPlan?: string;
  onSubscribe?: (planId: string) => void;
  loading?: boolean;
  className?: string;
}

// 定价表 — skillhub.cn 风格白色卡片 + 黑色 CTA
export function PricingTable({ plans, currentPlan, onSubscribe, loading, className }: PricingTableProps) {
  if (loading) {
    return (
      <div className={cn('grid gap-5 md:grid-cols-3', className)}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-[28px] border border-black/[0.06] bg-white p-6" />
        ))}
      </div>
    );
  }

  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className={cn('grid gap-5 md:grid-cols-3', className)}>
      {sorted.map((plan) => {
        const isPro = plan.name === 'pro';
        const isCurrent = currentPlan === plan.name;

        return (
          <div
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-[28px] border p-6 transition-all duration-200',
              isPro
                ? 'border-skillhub-blue bg-[#F7F8FF] ring-1 ring-skillhub-blue/20'
                : 'border-black/[0.06] bg-white',
            )}
          >
            {/* Pro 标签 */}
            {isPro && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-skillhub-blue px-3 py-0.5 text-2xs font-semibold uppercase tracking-wider text-white">
                最受欢迎
              </div>
            )}

            <h3 className="font-display text-xl font-semibold">{PLAN_NAMES[plan.name] || plan.display_name}</h3>

            <div className="mt-4">
              <span className="font-display text-4xl font-semibold">{formatPrice(plan.price_month)}</span>
              <span className="text-sm text-black/50">/月</span>
            </div>

            {/* 特性列表 */}
            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-black/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-skillhub-blue" />
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA 按钮 — 8px 圆角 */}
            {onSubscribe && (
              <button
                onClick={() => onSubscribe(plan.id)}
                disabled={loading || isCurrent}
                className={cn(
                  'mt-6 w-full rounded-full py-3 text-sm font-medium transition-all',
                  isCurrent
                    ? 'cursor-not-allowed bg-secondary text-black/45'
                    : isPro
                      ? 'bg-skillhub-black text-white hover:bg-[#383838] hover:shadow-lg'
                      : 'border border-black/10 bg-white hover:bg-secondary',
                )}
              >
                {isCurrent ? '当前方案' : isPro ? '立即订阅' : plan.price_month === 0 ? '免费开始' : '订阅'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
