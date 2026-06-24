/**
 * WalletPanel — Credit wallet overview and actions
 *
 * Shows wallet balance, daily token quotas, check-in button,
 * recharge options, and recent transactions.
 * Follows mclaw design spec: brand orange, card radius 16px.
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wallet as WalletIcon,
  CalendarCheck,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { walletApi, type Wallet } from '@mclaw/shared';

// --- Types ---

interface TransactionItem {
  id: string;
  kind: string;
  inout_type: 'in' | 'out';
  amount: number;
  balance: number;
  remark: string;
  created_at: number;
}

// Recharge pricing tiers (matching backend payment usecase)
const RECHARGE_OPTIONS = [
  { credits: 2000, price: 10, label: '2,000' },
  { credits: 15000, price: 50, label: '15,000', discount: '6.7折' },
  { credits: 100000, price: 250, label: '100,000', discount: '5.0折' },
  { credits: 500000, price: 1000, label: '500,000', discount: '4.0折' },
];

// Transaction kind display names
const KIND_LABELS: Record<string, string> = {
  signup_bonus: '注册奖励',
  voucher_exchange: '兑换码',
  invitation_reward: '邀请奖励',
  daily_grant: '每日发放',
  top_up: '充值',
  checkin: '签到奖励',
  model_consumption: '模型消耗',
  mcp_tool_consumption: 'MCP工具消耗',
  pro_subscription: '专业会员',
  pro_auto_renew: '专业会员续费',
  ultra_subscription: '旗舰会员',
  ultra_auto_renew: '旗舰会员续费',
  violation_fine: '违规扣罚',
};

// --- Component ---

interface WalletPanelProps {
  className?: string;
}

export function WalletPanel({ className }: WalletPanelProps) {
  const { t } = useTranslation('wallet');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Fetch wallet data
  const fetchWallet = useCallback(async () => {
    try {
      const data = await walletApi.getWallet();
      setWallet(data);
    } catch {
      toast.error(t('fetchError', { defaultValue: '获取钱包信息失败' }));
    }
  }, []);

  // Fetch check-in status
  const fetchCheckIn = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/users/wallet/checkin', { credentials: 'include' });
      const data = await res.json();
      setCheckedIn(data?.data?.checked_in ?? false);
    } catch {
      // silent
    }
  }, []);

  // Fetch recent transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/users/wallet/transaction?limit=10', { credentials: 'include' });
      const data = await res.json();
      setTransactions(data?.data?.transactions || []);
    } catch {
      // silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchWallet(), fetchCheckIn(), fetchTransactions()]).finally(() => setLoading(false));
  }, [fetchWallet, fetchCheckIn, fetchTransactions]);

  // Check-in handler
  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch('/api/v1/users/wallet/checkin', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data?.code === 0 || data?.code === 200) {
        setCheckedIn(true);
        toast.success(t('checkInSuccess', { defaultValue: '签到成功！获得100积分' }));
        fetchWallet();
      } else {
        toast.error(data?.message || t('alreadyCheckedIn', { defaultValue: '今日已签到' }));
        setCheckedIn(true);
      }
    } catch {
      toast.error(t('checkInError', { defaultValue: '签到失败' }));
    } finally {
      setCheckingIn(false);
    }
  };

  // Recharge handler
  const handleRecharge = async (credits: number) => {
    setRecharging(credits);
    try {
      const res = await fetch('/api/v1/users/wallet/recharge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits }),
      });
      const data = await res.json();
      if (data?.data?.url) {
        // Payment URL returned — redirect or open QR
        window.open(data.data.url, '_blank');
        toast.info(t('paymentRedirect', { defaultValue: '正在跳转支付...' }));
      } else if (data?.code === 0 || data?.code === 200) {
        // Direct grant (fallback mode)
        toast.success(t('rechargeSuccess', { defaultValue: '充值成功！' }));
        fetchWallet();
        fetchTransactions();
      }
    } catch {
      toast.error(t('rechargeError', { defaultValue: '充值失败' }));
    } finally {
      setRecharging(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t('noWallet', { defaultValue: '钱包信息不可用' })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Balance overview */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WalletIcon className="h-5 w-5 text-brand" />
              <CardTitle className="text-base">{t('myWallet', { defaultValue: '我的积分' })}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { fetchWallet(); fetchTransactions(); }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance display */}
          <div className="text-center">
            <div className="text-4xl font-bold text-brand">
              {wallet.balance.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {t('credits', { defaultValue: '积分' })}
            </div>
          </div>

          {/* Daily token quotas */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {wallet.daily_basic_token_balance > 0 && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="font-medium">{formatTokens(wallet.daily_basic_token_balance)}</div>
                <div className="text-muted-foreground">基础</div>
              </div>
            )}
            {wallet.daily_pro_token_balance > 0 && (
              <div className="rounded-lg bg-brand/8 p-2">
                <div className="font-medium text-brand">{formatTokens(wallet.daily_pro_token_balance)}</div>
                <div className="text-muted-foreground">专业</div>
              </div>
            )}
            {wallet.daily_ultra_token_balance > 0 && (
              <div className="rounded-lg bg-amber-500/10 p-2">
                <div className="font-medium text-amber-600">{formatTokens(wallet.daily_ultra_token_balance)}</div>
                <div className="text-muted-foreground">旗舰</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check-in */}
      <Card className="rounded-2xl">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className={cn('h-5 w-5', checkedIn ? 'text-muted-foreground' : 'text-brand')} />
            <span className="text-sm font-medium">
              {checkedIn
                ? t('alreadyCheckedIn', { defaultValue: '今日已签到' })
                : t('checkInReward', { defaultValue: '签到领取 100 积分' })}
            </span>
          </div>
          <Button
            size="sm"
            variant={checkedIn ? 'ghost' : 'soft'}
            disabled={checkedIn || checkingIn}
            onClick={handleCheckIn}
          >
            {checkingIn ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : checkedIn ? (
              <Check className="h-4 w-4" />
            ) : (
              t('checkIn', { defaultValue: '签到' })
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recharge options */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-5 w-5 text-brand" />
            {t('recharge', { defaultValue: '充值积分' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {RECHARGE_OPTIONS.map((opt) => (
              <Button
                key={opt.credits}
                variant="outline"
                className={cn(
                  'flex flex-col items-center gap-0.5 h-auto py-3',
                  opt.discount && 'border-brand/30',
                )}
                disabled={recharging !== null}
                onClick={() => handleRecharge(opt.credits)}
              >
                <span className="text-sm font-medium">{opt.label} 积分</span>
                <span className="text-xs text-muted-foreground">
                  ¥{opt.price}
                  {opt.discount && (
                    <Badge variant="brand-soft" className="ml-1 text-[10px] px-1 py-0">
                      {opt.discount}
                    </Badge>
                  )}
                </span>
                {recharging === opt.credits && (
                  <div className="mt-1 h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('recentTransactions', { defaultValue: '最近记录' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {tx.inout_type === 'in' ? (
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                  )}
                  <span>{KIND_LABELS[tx.kind] || tx.kind}</span>
                </div>
                <span className={cn(
                  'font-medium',
                  tx.inout_type === 'in' ? 'text-green-600' : 'text-red-500',
                )}>
                  {tx.inout_type === 'in' ? '+' : '-'}{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Helpers ---

function formatTokens(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(0)}千万`;
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`;
  return n.toLocaleString();
}
