import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  FolderKanban,
  MessageSquareText,
  Target,
} from 'lucide-react';
import { useTeamDashboard } from '@shared';
import type { TeamDashboardResp, TeamDashboardTrendPoint } from '@shared';
import { cn } from '@/lib/utils';

// ── 工具函数 ─────────────────────────────────────────

function formatDuration(seconds?: number) {
  if (!seconds) return '暂无';
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
  return `${(seconds / 3600).toFixed(1)} 小时`;
}

function formatTokens(value?: number) {
  if (!value) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatCount(value?: number) {
  return String(value ?? 0);
}

function formatRate(value?: number) {
  return `${Math.round(value ?? 0)}%`;
}

function formatChartDate(value?: string) {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  return value;
}

// ── 子组件 ───────────────────────────────────────────

const RANGE_OPTIONS = [
  { value: '7d' as const, label: '近 7 天' },
  { value: '30d' as const, label: '近 30 天' },
  { value: 'today' as const, label: '今日' },
];

function TimeRangeTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: 'today' | '7d' | '30d') => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-secondary p-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  title,
  value,
  stats,
  icon,
}: {
  title: string;
  value: string;
  stats: { label: string; value: string }[];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="text-muted-foreground/50">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        {stats.map((s) => (
          <span key={s.label}>
            {s.label}: <span className="font-medium text-foreground">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TrendCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5', className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InsightTable({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InsightRow({
  title,
  subtitle,
  value,
  badge,
}: {
  title: string;
  subtitle: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md px-2 py-2 text-sm hover:bg-muted/60">
      <div className="min-w-0">
        <div className="truncate font-medium">{title}</div>
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          {badge && (
            <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium">
              {badge}
            </span>
          )}
          <span className="truncate text-xs">{subtitle}</span>
        </div>
      </div>
      <div className="shrink-0 font-medium text-brand">{value}</div>
    </div>
  );
}

function InsightEmpty() {
  return (
    <div className="rounded-md border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
      当前周期暂无数据
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-4 py-2 text-sm shadow-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-brand">{formatCount(payload[0]?.value)}</div>
    </div>
  );
}

function DashboardLineChart({ data }: { data: TeamDashboardTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="dashboardTrendArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#EE7C4B" stopOpacity={0.18} />
            <stop offset="55%" stopColor="#EE7C4B" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#EE7C4B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="currentColor" strokeDasharray="4 8" strokeOpacity={0.1} vertical={false} />
        <XAxis
          dataKey="date"
          interval="preserveStartEnd"
          minTickGap={32}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatChartDate}
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.36 }}
        />
        <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.36 }} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#EE7C4B', strokeOpacity: 0.14 }} />
        <Area type="monotone" dataKey="value" stroke="#EE7C4B" strokeWidth={2} fill="url(#dashboardTrendArea)" fillOpacity={1} dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TaskStatsPanel({ data }: { data: TeamDashboardResp }) {
  const { metrics } = data;
  const total = metrics.running_task_count + metrics.finished_task_count;
  const finishedRate = total > 0 ? Math.round((metrics.finished_task_count / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">任务统计</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">运行状态、耗时与模型调用</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="text-xs text-muted-foreground">运行中</div>
          <div className="mt-1 text-xl font-semibold">{metrics.running_task_count}</div>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="text-xs text-muted-foreground">已结束</div>
          <div className="mt-1 text-xl font-semibold">{metrics.finished_task_count}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">完成占比</span>
          <span className="font-medium">{finishedRate}%</span>
        </div>
        <div className="h-2 rounded-full bg-brand/12">
          <div className="h-2 rounded-full bg-brand" style={{ width: `${finishedRate}%` }} />
        </div>
      </div>

      <div className="mt-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">平均耗时</span>
          <span className="font-medium">{formatDuration(metrics.average_duration)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Token 消耗</span>
          <span className="font-medium">{formatTokens(metrics.total_tokens)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">模型调用</span>
          <span className="font-medium">{metrics.llm_requests ?? 0} 次</span>
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ───────────────────────────────────────────

export default function AdminOverview() {
  const { data, loading, range, setRange } = useTeamDashboard();

  const metrics = data?.metrics;
  const projectStats = data?.project_stats;
  const taskStats = data?.task_stats;
  const conversationStats = data?.conversation_stats;
  const projectTrend = useMemo(() => projectStats?.daily_created ?? [], [projectStats]);
  const taskTrend = useMemo(() => taskStats?.daily_created ?? [], [taskStats]);
  const conversationTrend = useMemo(() => conversationStats?.daily_created ?? [], [conversationStats]);
  const hasTrendData = projectTrend.length > 0 || taskTrend.length > 0 || conversationTrend.length > 0;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 + 时间范围 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">管理概览</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">项目、任务、对话与资源消耗</p>
        </div>
        <TimeRangeTabs value={range} onChange={setRange} />
      </div>

      {/* 指标卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="任务总数"
          value={formatCount(taskStats?.total)}
          stats={[
            { label: '近 7 天', value: formatCount(taskStats?.active_7d) },
            { label: '今日', value: formatCount(taskStats?.active_today) },
          ]}
          icon={<Target className="h-4 w-4" />}
        />
        <MetricCard
          title="项目总数"
          value={formatCount(projectStats?.total)}
          stats={[
            { label: '近 7 天', value: formatCount(projectStats?.active_7d) },
            { label: '今日', value: formatCount(projectStats?.active_today) },
          ]}
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <MetricCard
          title="对话总数"
          value={formatCount(conversationStats?.total)}
          stats={[
            { label: '近 7 天', value: formatCount(conversationStats?.count_7d) },
            { label: '今日', value: formatCount(conversationStats?.count_today) },
          ]}
          icon={<MessageSquareText className="h-4 w-4" />}
        />
        <MetricCard
          title="活跃成员"
          value={`${metrics?.active_members ?? 0} / ${metrics?.total_members ?? 0}`}
          stats={[
            { label: '活跃率', value: formatRate(metrics?.active_rate) },
            { label: '总成员', value: formatCount(metrics?.total_members) },
          ]}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* 趋势图 + 任务统计 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="grid gap-4">
          <TrendCard title="任务创建趋势" description="按日期统计新增任务" className="min-h-[280px]">
            <div className="h-64">
              {taskTrend.length > 0 ? <DashboardLineChart data={taskTrend} /> : <InsightEmpty />}
            </div>
          </TrendCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <TrendCard title="项目创建趋势" description="按日期统计新增项目" className="min-h-[200px]">
              <div className="h-44">
                {projectTrend.length > 0 ? <DashboardLineChart data={projectTrend} /> : <InsightEmpty />}
              </div>
            </TrendCard>
            <TrendCard title="对话创建趋势" description="按日期统计新增对话" className="min-h-[200px]">
              <div className="h-44">
                {conversationTrend.length > 0 ? <DashboardLineChart data={conversationTrend} /> : <InsightEmpty />}
              </div>
            </TrendCard>
          </div>
        </div>
        {data && <TaskStatsPanel data={data} />}
      </div>

      {/* 洞察表格 */}
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightTable title="高活跃成员" description="按任务数量排序">
          <div className="space-y-1">
            {(data?.insights?.active_members ?? []).length === 0 && <InsightEmpty />}
            {(data?.insights?.active_members ?? []).map((item) => (
              <InsightRow
                key={item.user_id}
                title={item.name || item.email || '未命名成员'}
                subtitle={item.group_name || '未分组'}
                value={`${item.task_count ?? 0} 个任务`}
              />
            ))}
          </div>
        </InsightTable>
        <InsightTable title="高消耗对象" description="按 Token 消耗排序">
          <div className="space-y-1">
            {(data?.insights?.high_consumption ?? []).length === 0 && <InsightEmpty />}
            {(data?.insights?.high_consumption ?? []).map((item) => (
              <InsightRow
                key={item.id}
                title={item.name || '未知对象'}
                subtitle="Token 消耗"
                value={formatTokens(item.total_tokens)}
                badge={item.type === 'project' ? '项目' : '成员'}
              />
            ))}
          </div>
        </InsightTable>
        <InsightTable title="长时间运行任务" description="按运行时长排序">
          <div className="space-y-1">
            {(data?.insights?.long_running_tasks ?? []).length === 0 && <InsightEmpty />}
            {(data?.insights?.long_running_tasks ?? []).map((item) => (
              <InsightRow
                key={item.task_id}
                title={item.title || '未命名任务'}
                subtitle={item.creator || item.host_name || '未知创建人'}
                value={formatDuration(item.duration)}
              />
            ))}
          </div>
        </InsightTable>
      </div>

      {!hasTrendData && (
        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          当前周期还没有足够趋势数据，创建项目或任务后这里会展示增长曲线。
        </div>
      )}
    </div>
  );
}
