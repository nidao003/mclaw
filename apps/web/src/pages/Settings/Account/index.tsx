import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  walletApi,
  useAuthStore,
  useSubscriptionStore,
  subscriptionApi,
  type Wallet,
  type Plan,
  type UserSubscription,
} from '@shared';
import { Crown, Coins, Wallet as WalletIcon, RefreshCw, Check, Sparkles } from 'lucide-react';

// 我的账户页：会员套餐 + 积分余额。放在个人中心下，/apis 等业务页不再呈现。
export default function Account() {
  const user = useAuthStore((s) => s.user);
  const subCurrent = useSubscriptionStore((s) => s.current);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    const [w, , subs] = await Promise.all([
      walletApi.getWallet().catch(() => null),
      fetchSubscription(),
      subscriptionApi.listPlans().catch(() => []),
    ]);
    setWallet(w);
    setPlans(subs || []);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground">请先登录</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>;
  }

  // 套餐名展示：优先匹配 plans 列表里的 display_name，否则用 plan name，再否则免费版
  const planName =
    plans.find((p) => p.name === subCurrent?.plan)?.display_name ||
    (subCurrent?.plan ? subCurrent.plan : '免费版');
  const status = subCurrent?.status === 'active' ? '生效中' : subCurrent?.status ? '已过期' : '未订阅';
  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-8">
      {/* 套餐 + 余额 双卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 会员套餐 */}
        <div className="flex items-center gap-4 rounded-xl border border-black/[0.06] bg-white px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EE7C4B]/10">
            <Crown className="h-5 w-5 text-[#EE7C4B]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-black/45">当前套餐</p>
            <p className="truncate text-lg font-semibold text-foreground">{planName}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              subCurrent?.status === 'active'
                ? 'bg-[#EE7C4B]/10 text-[#D95A2B]'
                : 'bg-black/[0.05] text-black/50'
            }`}
          >
            {status}
          </span>
        </div>

        {/* 积分余额 */}
        <div className="flex items-center gap-4 rounded-xl border border-black/[0.06] bg-white px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EE7C4B]/10">
            <Coins className="h-5 w-5 text-[#EE7C4B]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-black/45">积分余额</p>
            <p className="text-lg font-semibold text-foreground">
              {balance.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-black/40">积分</span>
            </p>
          </div>
          <Link
            to="/pricing"
            className="shrink-0 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs text-black/60 hover:bg-black/[0.03]"
          >
            充值
          </Link>
        </div>
      </div>

      {/* 刷新按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs text-black/60 hover:bg-black/[0.03] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 流水概览 */}
      {wallet && (
        <div className="rounded-xl border border-black/[0.06] bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <WalletIcon className="h-4 w-4 text-[#EE7C4B]" />
            账户流水
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="累计充值" value={wallet.total_recharged} />
            <Stat label="累计消耗" value={wallet.total_consumed} />
            <Stat label="累计赠送" value={wallet.total_granted} />
            <Stat label="当前余额" value={wallet.balance} highlight />
          </div>
        </div>
      )}

      {/* 套餐列表 */}
      {plans.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-[#EE7C4B]" />
            可选套餐
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} current={subCurrent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-black/45">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-[#D95A2B]' : 'text-foreground'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function PlanCard({ plan, current }: { plan: Plan; current: UserSubscription | null }) {
  const isCurrent = current?.plan === plan.name;
  const priceYuan = (plan.price_month / 100).toFixed(2);
  return (
    <div
      className={`relative rounded-xl border p-5 ${
        isCurrent ? 'border-[#EE7C4B] bg-[#EE7C4B]/5' : 'border-black/[0.06] bg-white'
      }`}
    >
      {isCurrent && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#EE7C4B] px-2 py-0.5 text-[10px] font-medium text-white">
          <Check className="h-3 w-3" />
          当前
        </span>
      )}
      <p className="text-sm font-semibold text-foreground">{plan.display_name || plan.name}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">
        ¥{priceYuan}
        <span className="ml-1 text-xs font-normal text-black/40">/{plan.is_default ? '免费' : '月'}</span>
      </p>
      {plan.features && plan.features.length > 0 && (
        <ul className="mt-3 space-y-1">
          {plan.features.slice(0, 4).map((f, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-black/60">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#EE7C4B]" />
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 text-xs text-black/40">每月 {plan.monthly_credits.toLocaleString()} 积分</div>
    </div>
  );
}
