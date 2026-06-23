export type UsageHistoryEntry = {
  timestamp: string;
  sessionId: string;
  agentId: string;
  model?: string;
  provider?: string;
  content?: string;
  usageStatus?: 'available' | 'missing' | 'error';
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  costUsd?: number;
};

export type UsageWindow = '7d' | '30d' | 'all';
export type UsageGroupBy = 'model' | 'day';

/** 单条 token 记录归属：'cloud' 账号绑定的云端模型；'local' 用户本地配置的 ProviderAccount；'unknown' 无法判定 */
export type UsageSourceKind = 'cloud' | 'local' | 'unknown';

/** 归类一条 entry 的来源：cloudProviders 是当前账号云端模型 provider 字符串集合（如 { 'minimax', 'anthropic' }）；provider 不在白名单里就归为本地 */
export function classifyUsageEntry(
  entry: Pick<UsageHistoryEntry, 'provider'>,
  cloudProviders: ReadonlySet<string>,
): UsageSourceKind {
  const provider = entry.provider?.trim().toLowerCase();
  if (!provider) return 'unknown';
  if (cloudProviders.has(provider)) return 'cloud';
  return 'local';
}

/** 给一组 entry 批量打标 */
export function classifyUsageEntries(
  entries: UsageHistoryEntry[],
  cloudProviders: ReadonlySet<string>,
): UsageSourceKind[] {
  return entries.map((entry) => classifyUsageEntry(entry, cloudProviders));
}

/** 中文显示文案 */
export function getUsageSourceKindLabel(kind: UsageSourceKind): string {
  switch (kind) {
    case 'cloud':
      return '云端';
    case 'local':
      return '本地';
    default:
      return '未知';
  }
}

export type UsageGroup = {
  label: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  sortKey: number | string;
};

export function resolveStableUsageHistory(
  previousStableEntries: UsageHistoryEntry[],
  nextEntries: UsageHistoryEntry[],
  options: { preservePreviousOnEmpty?: boolean } = {},
): UsageHistoryEntry[] {
  if (nextEntries.length > 0) {
    return nextEntries;
  }

  return options.preservePreviousOnEmpty ? previousStableEntries : [];
}

export function resolveVisibleUsageHistory(
  currentEntries: UsageHistoryEntry[],
  stableEntries: UsageHistoryEntry[],
  options: { preferStableOnEmpty?: boolean } = {},
): UsageHistoryEntry[] {
  if (options.preferStableOnEmpty && currentEntries.length === 0) {
    return stableEntries;
  }

  return currentEntries;
}

export function formatUsageDay(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getUsageDaySortKey(timestamp: string): number {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 0;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function groupUsageHistory(
  entries: UsageHistoryEntry[],
  groupBy: UsageGroupBy,
): UsageGroup[] {
  const grouped = new Map<string, UsageGroup>();

  for (const entry of entries) {
    const label = groupBy === 'model'
      ? (entry.model || 'Unknown')
      : formatUsageDay(entry.timestamp);
    const current = grouped.get(label) ?? {
      label,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      sortKey: groupBy === 'day' ? getUsageDaySortKey(entry.timestamp) : label.toLowerCase(),
    };
    current.totalTokens += entry.totalTokens;
    current.inputTokens += entry.inputTokens;
    current.outputTokens += entry.outputTokens;
    current.cacheTokens += entry.cacheReadTokens + entry.cacheWriteTokens;
    grouped.set(label, current);
  }

  const sorted = Array.from(grouped.values()).sort((a, b) => {
    if (groupBy === 'day') {
      return Number(a.sortKey) - Number(b.sortKey);
    }
    return b.totalTokens - a.totalTokens;
  });

  return groupBy === 'model' ? sorted.slice(0, 8) : sorted;
}

export function filterUsageHistoryByWindow(
  entries: UsageHistoryEntry[],
  window: UsageWindow,
  now = Date.now(),
): UsageHistoryEntry[] {
  if (window === 'all') return entries;

  const days = window === '7d' ? 7 : 30;
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const timestamp = Date.parse(entry.timestamp);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
}
