/**
 * PricingTable — Subscription plan comparison table
 *
 * Fetches plans from GET /api/v1/plans and renders a comparison card layout.
 * Each card shows: plan name, price, features, and CTA button.
 * Follows mclaw design spec: brand orange #EE7C4B, card radius 16px, shadow system.
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Types ---

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_month: number;
  price_year: number;
  basic_token_quota: number;
  pro_token_quota: number;
  ultra_token_quota: number;
  monthly_credits: number;
  max_concurrency: number;
  features: string[];
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

interface PricingTableProps {
  currentPlan?: string;
  onSelectPlan?: (plan: Plan, period: 'month' | 'year') => void;
  className?: string;
}

// --- Helpers ---

function formatPrice(cents: number): string {
  return `¥${(cents / 100).toLocaleString()}`;
}

function formatTokens(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(0)}千万`;
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`;
  return n.toLocaleString();
}

function formatCredits(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`;
  return n.toLocaleString();
}

const planIcons: Record<string, React.ReactNode> = {
  basic: <Zap className="h-5 w-5" />,
  pro: <Sparkles className="h-5 w-5" />,
  ultra: <Crown className="h-5 w-5" />,
};

const planColors: Record<string, string> = {
  basic: 'text-muted-foreground',
  pro: 'text-brand',
  ultra: 'text-amber-500',
};

// --- Component ---

export function PricingTable({ currentPlan, onSelectPlan, className }: PricingTableProps) {
  const { t } = useTranslation('subscription');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'year'>('month');

  useEffect(() => {
    // Fetch plans from the Go backend
    // TODO: replace with shared API client once packages/shared/api is set up
    fetch('/api/v1/plans')
      .then((res) => res.json())
      .then((data) => {
        const items = data?.data || [];
        setPlans(items.filter((p: Plan) => p.is_active).sort((a: Plan, b: Plan) => a.sort_order - b.sort_order));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = useCallback(
    (plan: Plan) => {
      onSelectPlan?.(plan, period);
    },
    [onSelectPlan, period],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t('noPlansAvailable', { defaultValue: '暂无可用套餐' })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Period toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            period === 'month' ? 'bg-brand/12 text-brand' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setPeriod('month')}
        >
          {t('monthly', { defaultValue: '月付' })}
        </button>
        <button
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            period === 'year' ? 'bg-brand/12 text-brand' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setPeriod('year')}
        >
          {t('yearly', { defaultValue: '年付' })}
          {period === 'year' && (
            <Badge variant="brand-soft" className="ml-1.5 text-[10px] px-1.5 py-0">
              {t('save', { defaultValue: '省' })}
            </Badge>
          )}
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.name;
          const price = period === 'month' ? plan.price_month : plan.price_year;
          const isPro = plan.name === 'pro';
          const isUltra = plan.name === 'ultra';

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden rounded-2xl transition-shadow',
                isPro && 'ring-2 ring-brand shadow-lg',
                isUltra && 'ring-2 ring-amber-400/50 shadow-lg',
              )}
            >
              {isPro && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-brand px-3 py-1 text-xs font-medium text-white">
                  {t('popular', { defaultValue: '推荐' })}
                </div>
              )}
              {isUltra && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white">
                  {t('bestValue', { defaultValue: '最划算' })}
                </div>
              )}

              <CardHeader className="pb-3">
                <div className={cn('flex items-center gap-2', planColors[plan.name] || 'text-foreground')}>
                  {planIcons[plan.name] || <Zap className="h-5 w-5" />}
                  <CardTitle className="text-lg">{plan.display_name || plan.name}</CardTitle>
                </div>
                <CardDescription className="sr-only">
                  {plan.display_name} subscription plan
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div>
                  <span className="text-3xl font-bold">{formatPrice(price)}</span>
                  <span className="text-sm text-muted-foreground">
                    /{period === 'month' ? t('month', { defaultValue: '月' }) : t('year', { defaultValue: '年' })}
                  </span>
                  {plan.price_month === 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {t('freeForever', { defaultValue: '永久免费' })}
                    </span>
                  )}
                </div>

                {/* Token quotas */}
                <div className="space-y-1.5 text-sm">
                  {plan.basic_token_quota > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand" />
                      <span>{t('basicTokenQuota', { defaultValue: '基础模型' })} {formatTokens(plan.basic_token_quota)} Token/{t('day', { defaultValue: '天' })}</span>
                    </div>
                  )}
                  {plan.pro_token_quota > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand" />
                      <span>{t('proTokenQuota', { defaultValue: '专业模型' })} {formatTokens(plan.pro_token_quota)} Token/{t('day', { defaultValue: '天' })}</span>
                    </div>
                  )}
                  {plan.ultra_token_quota > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand" />
                      <span>{t('ultraTokenQuota', { defaultValue: '旗舰模型' })} {formatTokens(plan.ultra_token_quota)} Token/{t('day', { defaultValue: '天' })}</span>
                    </div>
                  )}
                  {plan.monthly_credits > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand" />
                      <span>{t('monthlyCredits', { defaultValue: '每月赠送' })} {formatCredits(plan.monthly_credits)} {t('credits', { defaultValue: '积分' })}</span>
                    </div>
                  )}
                  {plan.max_concurrency > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand" />
                      <span>{t('maxConcurrency', { defaultValue: '任务并发' })} {plan.max_concurrency}</span>
                    </div>
                  )}
                </div>

                {/* Features list */}
                {plan.features && plan.features.length > 0 && (
                  <div className="space-y-1.5 text-sm">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-brand" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <Button
                  className="w-full"
                  variant={isPro ? 'default' : isUltra ? 'default' : 'outline'}
                  disabled={isCurrent}
                  onClick={() => handleSelect(plan)}
                >
                  {isCurrent
                    ? t('currentPlan', { defaultValue: '当前套餐' })
                    : t('selectPlan', { defaultValue: '选择此套餐' })}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
