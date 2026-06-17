/**
 * AdminPanel — Management console for admin users
 *
 * Only visible when the user has admin role.
 * Provides: plan management, subscription grants, wallet adjustments, exchange code generation.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Plus,
  Gift,
  CreditCard,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Types ---

interface AdminPanelProps {
  className?: string;
}

// --- Component ---

export function AdminPanel({ className }: AdminPanelProps) {
  const { t } = useTranslation('admin');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-brand" />
        <h3 className="text-sm font-semibold">{t('title', { defaultValue: '管理后台' })}</h3>
        <Badge variant="brand" className="text-[10px]">ADMIN</Badge>
      </div>

      {/* Plan Management */}
      <AdminSection
        icon={<CreditCard className="h-4 w-4" />}
        title={t('planManagement', { defaultValue: '套餐管理' })}
        section="plans"
        expanded={expandedSection}
        onToggle={toggleSection}
      >
        <PlanManagement />
      </AdminSection>

      {/* Grant Subscription */}
      <AdminSection
        icon={<Users className="h-4 w-4" />}
        title={t('grantSubscription', { defaultValue: '授权订阅' })}
        section="subscription"
        expanded={expandedSection}
        onToggle={toggleSection}
      >
        <GrantSubscription />
      </AdminSection>

      {/* Wallet Adjustment */}
      <AdminSection
        icon={<Gift className="h-4 w-4" />}
        title={t('walletAdjustment', { defaultValue: '积分调整' })}
        section="wallet"
        expanded={expandedSection}
        onToggle={toggleSection}
      >
        <WalletAdjustment />
      </AdminSection>

      {/* Exchange Code Generation */}
      <AdminSection
        icon={<Plus className="h-4 w-4" />}
        title={t('exchangeCodes', { defaultValue: '兑换码生成' })}
        section="codes"
        expanded={expandedSection}
        onToggle={toggleSection}
      >
        <ExchangeCodeGenerator />
      </AdminSection>
    </div>
  );
}

// --- Sub-components ---

function AdminSection({
  icon,
  title,
  section,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  section: string;
  expanded: string | null;
  onToggle: (s: string) => void;
  children: React.ReactNode;
}) {
  const isExpanded = expanded === section;
  return (
    <Card className="rounded-xl">
      <CardHeader
        className="cursor-pointer py-3 px-4"
        onClick={() => onToggle(section)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {title}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {isExpanded && <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>}
    </Card>
  );
}

function PlanManagement() {
  const { t } = useTranslation('admin');
  // TODO: implement plan CRUD
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('planManagementDesc', { defaultValue: '创建和管理订阅套餐' })}
      </p>
      <Button variant="outline" size="sm">
        <Plus className="mr-1 h-4 w-4" />
        {t('createPlan', { defaultValue: '新建套餐' })}
      </Button>
    </div>
  );
}

function GrantSubscription() {
  const { t } = useTranslation('admin');
  const [userId, setUserId] = useState('');
  const [plan, setPlan] = useState('pro');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);

  const handleGrant = useCallback(async () => {
    if (!userId) {
      toast.error(t('userIdRequired', { defaultValue: '请输入用户ID' }));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/subscriptions/grant', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          plan,
          period_unit: period,
        }),
      });
      const data = await res.json();
      if (data?.code === 0 || data?.code === 200) {
        toast.success(t('grantSuccess', { defaultValue: '订阅授权成功' }));
      } else {
        toast.error(data?.message || t('grantFailed', { defaultValue: '授权失败' }));
      }
    } catch {
      toast.error(t('grantFailed', { defaultValue: '授权失败' }));
    } finally {
      setLoading(false);
    }
  }, [userId, plan, period, t]);

  return (
    <div className="space-y-3">
      <Input
        placeholder={t('userIdPlaceholder', { defaultValue: '用户 ID (UUID)' })}
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <div className="flex gap-2">
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        >
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="ultra">Ultra</option>
        </select>
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="month">{t('month', { defaultValue: '月' })}</option>
          <option value="year">{t('year', { defaultValue: '年' })}</option>
        </select>
      </div>
      <Button size="sm" disabled={loading} onClick={handleGrant}>
        {loading ? '...' : t('grant', { defaultValue: '授权' })}
      </Button>
    </div>
  );
}

function WalletAdjustment() {
  const { t } = useTranslation('admin');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdjust = useCallback(async () => {
    if (!userId || !amount) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/wallet/adjust', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount: parseInt(amount),
          remark,
        }),
      });
      const data = await res.json();
      if (data?.code === 0 || data?.code === 200) {
        toast.success(t('adjustSuccess', { defaultValue: '余额调整成功' }));
      } else {
        toast.error(data?.message || t('adjustFailed', { defaultValue: '调整失败' }));
      }
    } catch {
      toast.error(t('adjustFailed', { defaultValue: '调整失败' }));
    } finally {
      setLoading(false);
    }
  }, [userId, amount, remark, t]);

  return (
    <div className="space-y-3">
      <Input
        placeholder={t('userIdPlaceholder', { defaultValue: '用户 ID' })}
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <Input
        type="number"
        placeholder={t('amountPlaceholder', { defaultValue: '金额 (正=增加, 负=扣减)' })}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        placeholder={t('remarkPlaceholder', { defaultValue: '备注' })}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
      />
      <Button size="sm" disabled={loading} onClick={handleAdjust}>
        {loading ? '...' : t('adjust', { defaultValue: '调整' })}
      </Button>
    </div>
  );
}

function ExchangeCodeGenerator() {
  const { t } = useTranslation('admin');
  const [credits, setCredits] = useState('1000');
  const [count, setCount] = useState('10');
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/wallet/exchange-codes', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credits: parseInt(credits),
          count: parseInt(count),
        }),
      });
      const data = await res.json();
      if (data?.code === 0 || data?.code === 200) {
        toast.success(t('generateSuccess', { defaultValue: '兑换码生成成功' }));
      } else {
        toast.error(data?.message || t('generateFailed', { defaultValue: '生成失败' }));
      }
    } catch {
      toast.error(t('generateFailed', { defaultValue: '生成失败' }));
    } finally {
      setLoading(false);
    }
  }, [credits, count, t]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder={t('creditsPerCode', { defaultValue: '每张积分' })}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
        <Input
          type="number"
          placeholder={t('codeCount', { defaultValue: '生成数量' })}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
      </div>
      <Button size="sm" disabled={loading} onClick={handleGenerate}>
        {loading ? '...' : t('generate', { defaultValue: '生成' })}
      </Button>
    </div>
  );
}

// --- Helper ---

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}
