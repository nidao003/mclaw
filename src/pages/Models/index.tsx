import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  RefreshCw,
  Loader2,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import { useProviderStore } from '@/stores/providers';
import { useCloudModelStore } from '@mclaw/shared/stores/cloudModelStore';
import { hostApi } from '@/lib/host-api';
import { trackUiEvent } from '@/lib/telemetry';
import { ProvidersSettings } from '@/components/settings/ProvidersSettings';
import { FeedbackState } from '@/components/common/FeedbackState';
import {
  filterUsageHistoryByWindow,
  groupUsageHistory,
  resolveStableUsageHistory,
  resolveVisibleUsageHistory,
  classifyUsageEntry,
  getUsageSourceKindLabel,
  type UsageGroupBy,
  type UsageHistoryEntry,
  type UsageSourceKind,
  type UsageWindow,
} from './usage-history';
const DEFAULT_USAGE_FETCH_MAX_ATTEMPTS = 2;
const WINDOWS_USAGE_FETCH_MAX_ATTEMPTS = 3;
const USAGE_FETCH_RETRY_DELAY_MS = 1500;
const USAGE_AUTO_REFRESH_INTERVAL_MS = 15_000;

const HIDDEN_USAGE_MARKERS = ['gateway-injected', 'delivery-mirror'];

function isHiddenUsageSource(source?: string): boolean {
  if (!source) return false;
  const normalizedSource = source.trim().toLowerCase();
  return HIDDEN_USAGE_MARKERS.some((marker) => normalizedSource.includes(marker));
}

// ── CloudModelsSection: 账号绑定的云端模型 ───────────────────────────
function CloudModelsSection() {
  const {
    cloudModels,
    defaultCloudModel,
    activeLocalAccountId,
    userOverrideDefaultToLocal,
    loading,
    error,
    setDefault,
    switchToLocal,
    clearLocalOverride,
  } = useCloudModelStore();
  const { accounts: localAccounts, defaultAccountId: localDefaultAccountId } = useProviderStore();
  const [showLocalPicker, setShowLocalPicker] = useState(false);

  // 只在挂载时拉一次；通过 getState() 取最新 fetchModels，避免 zustand action 引用变化导致 useEffect 反复触发、fetchModels 被 isLoading 保护静默吞掉、loading 卡在 true
  useEffect(() => {
    useCloudModelStore.getState().fetchModels(true);
  }, []);

  const handleSwitchToLocal = (accountId?: string) => {
    switchToLocal(accountId);
    setShowLocalPicker(false);
  };

  const handleRevertToCloud = () => {
    clearLocalOverride();
  };

  // 「立即使用」：一步到位把账号默认切到这个模型，并清除本地覆盖
  const handleUseNow = async (id: string) => {
    clearLocalOverride();
    await setDefault(id);
  };

  // 格式化 provider 名称（首字母大写）
  const formatProviderName = (provider: string) => {
    if (!provider) return '未知';
    return provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
  };

  // 当前真正在用的模型：覆盖本地 -> 显示对应本地服务商；否则显示账号云端默认
  const activeLocalAccount = userOverrideDefaultToLocal
    ? localAccounts.find((account) => account.id === (activeLocalAccountId ?? localDefaultAccountId))
    : null;

  // 加载状态
  if (loading && cloudModels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {'账号绑定的云端模型'}
          </CardTitle>
          <CardDescription>
            {'登录账号下配置的模型，默认登录后使用。'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {'账号绑定的云端模型'}
          </CardTitle>
          <CardDescription>
            {'登录账号下配置的模型，默认登录后使用。'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => useCloudModelStore.getState().fetchModels(true)}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {'重试'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 空状态
  if (cloudModels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {'账号绑定的云端模型'}
          </CardTitle>
          <CardDescription>
            {'登录账号下配置的模型，默认登录后使用。'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p>{'当前账号下未配置云端模型。'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            <CardTitle>{'账号绑定的云端模型'}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => useCloudModelStore.getState().fetchModels(true)}
            disabled={loading}
            className="h-8"
            title="刷新列表"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          {'登录账号下配置的模型，默认登录后使用。'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {cloudModels.map((model) => {
            const isActive = defaultCloudModel?.id === model.id && !userOverrideDefaultToLocal;
            return (
              <div
                key={model.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">
                      {formatProviderName(model.provider)}
                    </p>
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        {'当前使用'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                    {model.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant={isActive ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => void handleUseNow(model.id)}
                    title="立即使用此模型对话"
                  >
                    {'立即使用'}
                  </Button>
                  {!isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setDefault(model.id)}
                      title="仅设为账号默认（不立即切换当前对话）"
                    >
                      {'设为默认'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: 当前使用状态 + 切换按钮 */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-accent/50 p-3 gap-3">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Cloud className="h-4 w-4 text-muted-foreground shrink-0" />
            {userOverrideDefaultToLocal ? (
              <span className="text-muted-foreground truncate">
                {'当前使用本地模型：'}
                <span className="text-foreground font-medium">
                  {activeLocalAccount?.label ?? '尚未选择本地服务商'}
                </span>
              </span>
            ) : (
              <span className="text-foreground truncate">
                {'当前使用云端模型：'}
                <span className="font-medium">
                  {defaultCloudModel ? formatProviderName(defaultCloudModel.provider) : '尚未设置'}
                </span>
              </span>
            )}
          </div>
          {userOverrideDefaultToLocal ? (
            <Button variant="outline" size="sm" onClick={handleRevertToCloud}>
              {'恢复云端默认'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLocalPicker((value) => !value)}
              disabled={localAccounts.length === 0}
              title={localAccounts.length === 0 ? '请先在下方自定义模型提供商里配置本地模型' : '选择并启动本地模型'}
            >
              {'使用本地模型'}
            </Button>
          )}
        </div>

        {/* 本地服务商选择器：让用户明确切到某一个本地模型 */}
        {showLocalPicker && !userOverrideDefaultToLocal && (
          <div className="mt-3 rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="text-xs text-muted-foreground">{'选择要启动的本地服务商：'}</p>
            {localAccounts.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {'尚未配置本地服务商，请先在下方「自定义模型提供商」里添加。'}
              </p>
            ) : (
              <div className="space-y-2">
                {localAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-2 hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{account.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[account.model, account.vendorId].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSwitchToLocal(account.id)}
                      title="立即启动这个本地模型"
                    >
                      {'启动'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Models() {
  const { t } = useTranslation(['dashboard', 'settings']);
  const gatewayStatus = useGatewayStore((state) => state.status);
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);
  const cloudModels = useCloudModelStore((state) => state.cloudModels);
  const isGatewayRunning = gatewayStatus.state === 'running';
  const usageFetchMaxAttempts = window.electron.platform === 'win32'
    ? WINDOWS_USAGE_FETCH_MAX_ATTEMPTS
    : DEFAULT_USAGE_FETCH_MAX_ATTEMPTS;

  const [usageGroupBy, setUsageGroupBy] = useState<UsageGroupBy>('model');
  const [usageWindow, setUsageWindow] = useState<UsageWindow>('7d');
  const [usagePage, setUsagePage] = useState(1);
  const [selectedUsageEntry, setSelectedUsageEntry] = useState<UsageHistoryEntry | null>(null);
  const [usageRefreshNonce, setUsageRefreshNonce] = useState(0);
  function formatUsageSource(source?: string): string | undefined {
    if (!source) return undefined;

    if (isHiddenUsageSource(source)) {
      return undefined;
    }

    return source;
  }

  function shouldHideUsageEntry(entry: UsageHistoryEntry): boolean {
    return (
      isHiddenUsageSource(entry.provider)
      || isHiddenUsageSource(entry.model)
    );
  }

  type FetchState = {
    status: 'idle' | 'loading' | 'done';
    data: UsageHistoryEntry[];
    stableData: UsageHistoryEntry[];
  };
  type FetchAction =
    | { type: 'start' }
    | { type: 'done'; data: UsageHistoryEntry[] }
    | { type: 'failed' }
    | { type: 'reset' };

  const [fetchState, dispatchFetch] = useReducer(
    (state: FetchState, action: FetchAction): FetchState => {
      switch (action.type) {
        case 'start':
          return { ...state, status: 'loading' };
        case 'done':
          return {
            status: 'done',
            data: action.data,
            stableData: resolveStableUsageHistory(state.stableData, action.data),
          };
        case 'failed':
          return { ...state, status: 'done' };
        case 'reset':
          return { status: 'idle', data: [], stableData: [] };
        default:
          return state;
      }
    },
    { status: 'idle' as const, data: [] as UsageHistoryEntry[], stableData: [] as UsageHistoryEntry[] },
  );

  const usageFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usageFetchGenerationRef = useRef(0);
  const usageFetchStatusRef = useRef<FetchState['status']>('idle');

  useEffect(() => {
    usageFetchStatusRef.current = fetchState.status;
  }, [fetchState.status]);

  useEffect(() => {
    trackUiEvent('models.page_viewed');
  }, []);

  useEffect(() => {
    if (!isGatewayRunning) {
      return;
    }

    const requestRefresh = () => {
      if (usageFetchStatusRef.current === 'loading') return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setUsageRefreshNonce((value) => value + 1);
    };

    const intervalId = window.setInterval(requestRefresh, USAGE_AUTO_REFRESH_INTERVAL_MS);
    const handleFocus = () => {
      requestRefresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isGatewayRunning]);

  useEffect(() => {
    if (usageFetchTimerRef.current) {
      clearTimeout(usageFetchTimerRef.current);
      usageFetchTimerRef.current = null;
    }

    if (!isGatewayRunning) {
      dispatchFetch({ type: 'reset' });
      return;
    }

    dispatchFetch({ type: 'start' });
    const generation = usageFetchGenerationRef.current + 1;
    usageFetchGenerationRef.current = generation;
    const restartMarker = `${gatewayStatus.pid ?? 'na'}:${gatewayStatus.connectedAt ?? 'na'}`;
    trackUiEvent('models.token_usage_fetch_started', {
      generation,
      restartMarker,
    });

    // Safety timeout: if the fetch cycle hasn't resolved after 30 s,
    // force-resolve to "done" with empty data to avoid an infinite spinner.
    const safetyTimeout = setTimeout(() => {
      if (usageFetchGenerationRef.current !== generation) return;
      trackUiEvent('models.token_usage_fetch_safety_timeout', {
        generation,
        restartMarker,
      });
      dispatchFetch({ type: 'failed' });
    }, 30_000);

    const fetchUsageHistoryWithRetry = async (attempt: number) => {
      trackUiEvent('models.token_usage_fetch_attempt', {
        generation,
        attempt,
        restartMarker,
      });
      try {
        const entries = await hostApi.usage.recentTokenHistory();
        if (usageFetchGenerationRef.current !== generation) return;

        const normalized = Array.isArray(entries) ? entries : [];
        setUsagePage(1);
        trackUiEvent('models.token_usage_fetch_succeeded', {
          generation,
          attempt,
          records: normalized.length,
          restartMarker,
        });

        if (normalized.length === 0 && attempt < usageFetchMaxAttempts) {
          trackUiEvent('models.token_usage_fetch_retry_scheduled', {
            generation,
            attempt,
            reason: 'empty',
            restartMarker,
          });
          usageFetchTimerRef.current = setTimeout(() => {
            void fetchUsageHistoryWithRetry(attempt + 1);
          }, USAGE_FETCH_RETRY_DELAY_MS);
        } else {
          if (normalized.length === 0) {
            trackUiEvent('models.token_usage_fetch_exhausted', {
              generation,
              attempt,
              reason: 'empty',
              restartMarker,
            });
          }
          dispatchFetch({ type: 'done', data: normalized });
        }
      } catch (error) {
        if (usageFetchGenerationRef.current !== generation) return;
        trackUiEvent('models.token_usage_fetch_failed_attempt', {
          generation,
          attempt,
          restartMarker,
          message: error instanceof Error ? error.message : String(error),
        });
        if (attempt < usageFetchMaxAttempts) {
          trackUiEvent('models.token_usage_fetch_retry_scheduled', {
            generation,
            attempt,
            reason: 'error',
            restartMarker,
          });
          usageFetchTimerRef.current = setTimeout(() => {
            void fetchUsageHistoryWithRetry(attempt + 1);
          }, USAGE_FETCH_RETRY_DELAY_MS);
          return;
        }
        dispatchFetch({ type: 'failed' });
        trackUiEvent('models.token_usage_fetch_exhausted', {
          generation,
          attempt,
          reason: 'error',
          restartMarker,
        });
      }
    };

    void fetchUsageHistoryWithRetry(1);

    return () => {
      clearTimeout(safetyTimeout);
      if (usageFetchTimerRef.current) {
        clearTimeout(usageFetchTimerRef.current);
        usageFetchTimerRef.current = null;
      }
    };
  }, [isGatewayRunning, gatewayStatus.connectedAt, gatewayStatus.pid, usageFetchMaxAttempts, usageRefreshNonce]);

  const usageHistory = isGatewayRunning
    ? fetchState.data.filter((entry) => !shouldHideUsageEntry(entry))
    : [];
  const stableUsageHistory = isGatewayRunning
    ? fetchState.stableData.filter((entry) => !shouldHideUsageEntry(entry))
    : [];
  const visibleUsageHistory = resolveVisibleUsageHistory(usageHistory, stableUsageHistory, {
    preferStableOnEmpty: isGatewayRunning && fetchState.status === 'loading',
  });
  const filteredUsageHistory = filterUsageHistoryByWindow(visibleUsageHistory, usageWindow);
  const usageGroups = groupUsageHistory(filteredUsageHistory, usageGroupBy);
  const usagePageSize = 5;
  const usageTotalPages = Math.max(1, Math.ceil(filteredUsageHistory.length / usagePageSize));
  const safeUsagePage = Math.min(usagePage, usageTotalPages);
  const pagedUsageHistory = filteredUsageHistory.slice((safeUsagePage - 1) * usagePageSize, safeUsagePage * usagePageSize);
  const usageLoading = isGatewayRunning && fetchState.status === 'loading' && visibleUsageHistory.length === 0;
  const usageRefreshing = isGatewayRunning && fetchState.status === 'loading' && visibleUsageHistory.length > 0;

  // 云端 provider 白名单：来自当前账号绑定的云端模型。命中即"云端"，否则视为本地
  const cloudProviderSet = useMemo(
    () => new Set(cloudModels.map((model) => model.provider?.trim().toLowerCase()).filter(Boolean) as string[]),
    [cloudModels],
  );
  const entrySourceKindBySessionTimestamp = useMemo(() => {
    const map = new Map<string, UsageSourceKind>();
    for (const entry of filteredUsageHistory) {
      map.set(`${entry.sessionId}-${entry.timestamp}`, classifyUsageEntry(entry, cloudProviderSet));
    }
    return map;
  }, [filteredUsageHistory, cloudProviderSet]);

  return (
    <div data-testid="models-page" className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-5xl mx-auto flex flex-col h-full p-10 pt-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 shrink-0 gap-4">
          <div>
            <h1 data-testid="models-page-title" className="text-5xl md:text-6xl font-serif text-foreground mb-3 font-normal tracking-tight">
              {t('dashboard:models.title')}
            </h1>
            <p className="text-subtitle text-foreground/70 font-medium">
              {t('dashboard:models.subtitle')}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 -mr-2 space-y-12">

          {/* Account-Bound Cloud Models Section */}
          <CloudModelsSection />

          {/* AI Providers Section */}
          <ProvidersSettings />

          {/* Token Usage History Section */}
          <div>
            <h2 className="text-3xl font-serif text-foreground mb-6 font-normal tracking-tight">
              {t('dashboard:recentTokenHistory.title', 'Token Usage History')}
            </h2>
            <div>
              {usageLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground bg-accent/50 rounded-3xl border border-transparent border-dashed">
                  <FeedbackState state="loading" title={t('dashboard:recentTokenHistory.loading')} />
                </div>
              ) : visibleUsageHistory.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground bg-accent/50 rounded-3xl border border-transparent border-dashed">
                  <FeedbackState state="empty" title={t('dashboard:recentTokenHistory.empty')} />
                </div>
              ) : filteredUsageHistory.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground bg-accent/50 rounded-3xl border border-transparent border-dashed">
                  <FeedbackState state="empty" title={t('dashboard:recentTokenHistory.emptyForWindow')} />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex rounded-xl bg-transparent p-1 border border-border">
                        <Button
                          variant={usageGroupBy === 'model' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            setUsageGroupBy('model');
                            setUsagePage(1);
                          }}
                          className={usageGroupBy === 'model' ? "rounded-lg bg-accent/50 text-foreground" : "rounded-lg text-muted-foreground"}
                        >
                          {t('dashboard:recentTokenHistory.groupByModel')}
                        </Button>
                        <Button
                          variant={usageGroupBy === 'day' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            setUsageGroupBy('day');
                            setUsagePage(1);
                          }}
                          className={usageGroupBy === 'day' ? "rounded-lg bg-accent/50 text-foreground" : "rounded-lg text-muted-foreground"}
                        >
                          {t('dashboard:recentTokenHistory.groupByTime')}
                        </Button>
                      </div>
                      <div className="flex rounded-xl bg-transparent p-1 border border-border">
                        <Button
                          variant={usageWindow === '7d' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            setUsageWindow('7d');
                            setUsagePage(1);
                          }}
                          className={usageWindow === '7d' ? "rounded-lg bg-accent/50 text-foreground" : "rounded-lg text-muted-foreground"}
                        >
                          {t('dashboard:recentTokenHistory.last7Days')}
                        </Button>
                        <Button
                          variant={usageWindow === '30d' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            setUsageWindow('30d');
                            setUsagePage(1);
                          }}
                          className={usageWindow === '30d' ? "rounded-lg bg-accent/50 text-foreground" : "rounded-lg text-muted-foreground"}
                        >
                          {t('dashboard:recentTokenHistory.last30Days')}
                        </Button>
                        <Button
                          variant={usageWindow === 'all' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            setUsageWindow('all');
                            setUsagePage(1);
                          }}
                          className={usageWindow === 'all' ? "rounded-lg bg-accent/50 text-foreground" : "rounded-lg text-muted-foreground"}
                        >
                          {t('dashboard:recentTokenHistory.allTime')}
                        </Button>
                      </div>
                    </div>
                    <p className="text-meta font-medium text-muted-foreground">
                      {usageRefreshing
                        ? t('dashboard:recentTokenHistory.loading')
                        : t('dashboard:recentTokenHistory.showingLast', { count: filteredUsageHistory.length })}
                    </p>
                  </div>

                  <UsageBarChart
                    groups={usageGroups}
                    emptyLabel={t('dashboard:recentTokenHistory.empty')}
                    totalLabel={t('dashboard:recentTokenHistory.totalTokens')}
                    inputLabel={t('dashboard:recentTokenHistory.inputShort')}
                    outputLabel={t('dashboard:recentTokenHistory.outputShort')}
                    cacheLabel={t('dashboard:recentTokenHistory.cacheShort')}
                  />

                  <div className="space-y-3 pt-2">
                    {pagedUsageHistory.map((entry) => {
                      const sourceKind = entrySourceKindBySessionTimestamp.get(`${entry.sessionId}-${entry.timestamp}`) ?? 'unknown';
                      return (
                      <div
                        key={`${entry.sessionId}-${entry.timestamp}`}
                        data-testid="token-usage-entry"
                        className="rounded-2xl bg-transparent border border-border p-5 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate flex items-center gap-2">
                              <span className="truncate">{entry.model || t('dashboard:recentTokenHistory.unknownModel')}</span>
                              <span
                                data-testid="token-usage-source-badge"
                                className={cn(
                                  'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium border',
                                  sourceKind === 'cloud'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                    : sourceKind === 'local'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : 'bg-muted text-muted-foreground border-border',
                                )}
                                title={sourceKind === 'cloud' ? '账号绑定的云端模型消耗' : sourceKind === 'local' ? '本地配置的 ProviderAccount 消耗' : '未识别来源'}
                              >
                                {getUsageSourceKindLabel(sourceKind)}
                              </span>
                            </p>
                            <p className="text-meta text-muted-foreground truncate mt-0.5">
                              {[formatUsageSource(entry.provider), formatUsageSource(entry.agentId), entry.sessionId].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={getUsageTotalClass(entry)}>
                              {formatUsageTotal(entry)}
                            </p>
                            {entry.usageStatus === 'missing' && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t('dashboard:recentTokenHistory.noUsage')}
                              </p>
                            )}
                            {entry.usageStatus === 'error' && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                {t('dashboard:recentTokenHistory.usageParseError')}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatUsageTimestamp(entry.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-meta font-medium text-muted-foreground">
                          {entry.usageStatus === 'available' || entry.usageStatus === undefined ? (
                            <>
                              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-usage-input"></div>{t('dashboard:recentTokenHistory.input', { value: formatTokenCount(entry.inputTokens) })}</span>
                              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-usage-output"></div>{t('dashboard:recentTokenHistory.output', { value: formatTokenCount(entry.outputTokens) })}</span>
                              {entry.cacheReadTokens > 0 && (
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-usage-cache"></div>{t('dashboard:recentTokenHistory.cacheRead', { value: formatTokenCount(entry.cacheReadTokens) })}</span>
                              )}
                              {entry.cacheWriteTokens > 0 && (
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-usage-cache"></div>{t('dashboard:recentTokenHistory.cacheWrite', { value: formatTokenCount(entry.cacheWriteTokens) })}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs">
                              {entry.usageStatus === 'missing'
                                ? t('dashboard:recentTokenHistory.noUsage')
                                : t('dashboard:recentTokenHistory.usageParseError')}
                            </span>
                          )}
                          {typeof entry.costUsd === 'number' && Number.isFinite(entry.costUsd) && (
                            <span className="flex items-center gap-1.5 ml-auto text-foreground/80 bg-accent/50 px-2 py-0.5 rounded-md">{t('dashboard:recentTokenHistory.cost', { amount: entry.costUsd.toFixed(4) })}</span>
                          )}
                          {devModeUnlocked && entry.content && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 rounded-full px-2.5 text-tiny border-border"
                              onClick={() => setSelectedUsageEntry(entry)}
                            >
                              {t('dashboard:recentTokenHistory.viewContent')}
                            </Button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <p className="text-meta font-medium text-muted-foreground">
                      {t('dashboard:recentTokenHistory.page', { current: safeUsagePage, total: usageTotalPages })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsagePage((page) => Math.max(1, page - 1))}
                        disabled={safeUsagePage <= 1}
                        className="rounded-full px-4 h-9 border-border bg-transparent hover:bg-accent/50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {t('dashboard:recentTokenHistory.prev')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsagePage((page) => Math.min(usageTotalPages, page + 1))}
                        disabled={safeUsagePage >= usageTotalPages}
                        className="rounded-full px-4 h-9 border-border bg-transparent hover:bg-accent/50"
                      >
                        {t('dashboard:recentTokenHistory.next')}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {devModeUnlocked && selectedUsageEntry && (
        <UsageContentPopup
          entry={selectedUsageEntry}
          onClose={() => setSelectedUsageEntry(null)}
          title={t('dashboard:recentTokenHistory.contentDialogTitle')}
          closeLabel={t('dashboard:recentTokenHistory.close')}
          unknownModelLabel={t('dashboard:recentTokenHistory.unknownModel')}
        />
      )}
    </div>
  );
}

function formatTokenCount(value: number): string {
  return Intl.NumberFormat().format(value);
}

function getUsageTotalClass(entry: UsageHistoryEntry): string {
  if (entry.usageStatus === 'error') return 'font-bold text-sm text-red-500 dark:text-red-400';
  if (entry.usageStatus === 'missing') return 'font-bold text-sm text-muted-foreground';
  return 'font-bold text-sm';
}

function formatUsageTotal(entry: UsageHistoryEntry): string {
  if (entry.usageStatus === 'error') return '✕';
  if (entry.usageStatus === 'missing') return '—';
  return formatTokenCount(entry.totalTokens);
}

function formatUsageTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function UsageBarChart({
  groups,
  emptyLabel,
  totalLabel,
  inputLabel,
  outputLabel,
  cacheLabel,
}: {
  groups: Array<{
    label: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }>;
  emptyLabel: string;
  totalLabel: string;
  inputLabel: string;
  outputLabel: string;
  cacheLabel: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-medium text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const maxTokens = Math.max(...groups.map((group) => group.totalTokens), 1);

  return (
    <div className="space-y-4 bg-transparent p-5 rounded-2xl border border-border">
      <div className="flex flex-wrap gap-4 text-meta font-medium text-muted-foreground mb-2">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-usage-input" />
          {inputLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-usage-output" />
          {outputLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-usage-cache" />
          {cacheLabel}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-foreground">{group.label}</span>
            <span className="text-muted-foreground font-medium">
              {totalLabel}: {formatTokenCount(group.totalTokens)}
            </span>
          </div>
          <div className="h-3.5 overflow-hidden rounded-full bg-accent/50">
            <div
              className="flex h-full overflow-hidden rounded-full"
              style={{
                width: group.totalTokens > 0
                  ? `${Math.max((group.totalTokens / maxTokens) * 100, 6)}%`
                  : '0%',
              }}
            >
              {group.inputTokens > 0 && (
                <div
                  className="h-full bg-usage-input"
                  style={{ width: `${(group.inputTokens / group.totalTokens) * 100}%` }}
                />
              )}
              {group.outputTokens > 0 && (
                <div
                  className="h-full bg-usage-output"
                  style={{ width: `${(group.outputTokens / group.totalTokens) * 100}%` }}
                />
              )}
              {group.cacheTokens > 0 && (
                <div
                  className="h-full bg-usage-cache"
                  style={{ width: `${(group.cacheTokens / group.totalTokens) * 100}%` }}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Models;

function UsageContentPopup({
  entry,
  onClose,
  title,
  closeLabel,
  unknownModelLabel,
}: {
  entry: UsageHistoryEntry;
  onClose: () => void;
  title: string;
  closeLabel: string;
  unknownModelLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {(entry.model || unknownModelLabel)} • {formatUsageTimestamp(entry.timestamp)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          <pre className="whitespace-pre-wrap break-words text-sm text-foreground font-mono">
            {entry.content}
          </pre>
        </div>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
