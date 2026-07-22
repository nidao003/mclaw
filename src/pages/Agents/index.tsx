import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Bot, Check, Download, Filter, RefreshCw, Search, Settings2, Sparkles, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useProviderStore } from '@/stores/providers';
import { hostApi, type ChannelGroupItem } from '@/lib/host-api';
import { hostEvents } from '@/lib/host-events';
import { expertApi } from '@mclaw/shared/api/expert';
import type { Expert } from '@mclaw/shared/types/expert';
import { CHANNEL_ICONS, CHANNEL_NAMES, type ChannelType } from '@/types/channel';
import type { AgentSummary } from '@/types/agent';
import {
  buildRuntimeProviderOptions,
  splitModelRef,
  type RuntimeProviderOption,
} from '@/lib/model-options';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import telegramIcon from '@/assets/channels/telegram.svg';
import discordIcon from '@/assets/channels/discord.svg';
import whatsappIcon from '@/assets/channels/whatsapp.svg';
import wechatIcon from '@/assets/channels/wechat.svg';
import dingtalkIcon from '@/assets/channels/dingtalk.svg';
import feishuIcon from '@/assets/channels/feishu.svg';
import wecomIcon from '@/assets/channels/wecom.svg';
import qqIcon from '@/assets/channels/qq.svg';

type AgentsTab = 'market' | 'mine';
type ExpertWithMeta = Expert & {
  version?: string;
  category?: string;
  author?: string;
  usage_count?: number;
  updated_at?: number | string;
};

type InstalledExpertRecord = {
  slug: string;
  agentId: string;
  name: string;
  version?: string;
  updatedAt?: number | string;
};

const INSTALLED_EXPERTS_STORAGE_KEY = 'mclaw-installed-experts';

function normalizeExpertName(value: string): string {
  return value.trim().toLowerCase();
}

function getExpertVersion(expert: ExpertWithMeta): string {
  return (expert.version || (expert.updated_at ? String(expert.updated_at) : '') || 'v0.1').trim();
}

function getExpertCategory(expert: ExpertWithMeta): string {
  return (expert.category || expert.scenarios?.[0] || '专家').trim();
}

function readInstalledExperts(): Record<string, InstalledExpertRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(INSTALLED_EXPERTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, InstalledExpertRecord> : {};
  } catch {
    return {};
  }
}

function writeInstalledExperts(records: Record<string, InstalledExpertRecord>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INSTALLED_EXPERTS_STORAGE_KEY, JSON.stringify(records));
}

function resolveAgentChatKey(agent: AgentSummary): string {
  return agent.mainSessionKey || `agent:${agent.id}:main`;
}

export function Agents() {
  const { t } = useTranslation('agents');
  const navigate = useNavigate();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const refreshProviderSnapshot = useProviderStore((state) => state.refreshProviderSnapshot);
  const lastGatewayStateRef = useRef(gatewayStatus.state);
  const switchSession = useChatStore((state) => state.switchSession);
  const {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    deleteAgent,
  } = useAgentsStore();
  const [channelGroups, setChannelGroups] = useState<ChannelGroupItem[]>([]);
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(() => agents.length > 0);

  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [settingsModalAgent, setSettingsModalAgent] = useState<AgentSummary | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);
  const [activeTab, setActiveTab] = useState<AgentsTab>('market');
  const [marketQuery, setMarketQuery] = useState('');
  const [cloudExperts, setCloudExperts] = useState<ExpertWithMeta[]>([]);
  const [expertsLoading, setExpertsLoading] = useState(false);
  const [expertsError, setExpertsError] = useState<string | null>(null);
  const [addingExpertSlug, setAddingExpertSlug] = useState<string | null>(null);
  const [installedExperts, setInstalledExperts] = useState<Record<string, InstalledExpertRecord>>(() => readInstalledExperts());
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  const fetchChannelAccounts = useCallback(async () => {
    try {
      const response = await hostApi.channels.accounts();
      setChannelGroups(response.channels || []);
    } catch {
      // Keep the last rendered snapshot when channel account refresh fails.
    }
  }, []);

  const fetchCloudExperts = useCallback(async () => {
    setExpertsLoading(true);
    setExpertsError(null);
    try {
      const list = await expertApi.list();
      setCloudExperts((list as ExpertWithMeta[]).filter((expert) => expert.status !== 'archived'));
    } catch (error) {
      setExpertsError(String(error));
    } finally {
      setExpertsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.all([fetchAgents(), fetchChannelAccounts(), refreshProviderSnapshot(), fetchCloudExperts()]).finally(() => {
      if (mounted) {
        setHasCompletedInitialLoad(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [fetchAgents, fetchChannelAccounts, refreshProviderSnapshot, fetchCloudExperts]);

  useEffect(() => {
    const unsubscribe = hostEvents.onGatewayChannelStatus(() => {
      void fetchChannelAccounts();
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchChannelAccounts]);

  useEffect(() => {
    const previousGatewayState = lastGatewayStateRef.current;
    lastGatewayStateRef.current = gatewayStatus.state;

    if (previousGatewayState !== 'running' && gatewayStatus.state === 'running') {
      void fetchChannelAccounts();
    }
  }, [fetchChannelAccounts, gatewayStatus.state]);

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? null,
    [activeAgentId, agents],
  );

  const visibleAgents = agents.filter((agent) => !agent.isDefault);
  const visibleChannelGroups = channelGroups;

  const agentByName = useMemo(() => {
    const map = new Map<string, AgentSummary>();
    for (const agent of agents) {
      map.set(normalizeExpertName(agent.name), agent);
    }
    return map;
  }, [agents]);

  const filteredCloudExperts = useMemo(() => {
    const query = marketQuery.trim().toLowerCase();
    if (!query) return cloudExperts;
    return cloudExperts.filter((expert) => [
      expert.name,
      expert.subtitle,
      expert.description,
      expert.author,
      getExpertCategory(expert),
      ...(expert.related_skills || []),
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [cloudExperts, marketQuery]);

  const updateCandidates = useMemo(() => cloudExperts.filter((expert) => {
    const record = installedExperts[expert.slug];
    if (!record) return false;
    const localAgent = agents.find((agent) => agent.id === record.agentId)
      ?? agentByName.get(normalizeExpertName(record.name));
    if (!localAgent) return false;
    return getExpertVersion(expert) !== (record.version || '');
  }), [agentByName, agents, cloudExperts, installedExperts]);

  useEffect(() => {
    if (updateCandidates.length > 0) {
      setShowUpdatePrompt(true);
    }
  }, [updateCandidates.length]);

  const rememberInstalledExpert = useCallback((expert: ExpertWithMeta, agent: AgentSummary) => {
    const next = {
      ...readInstalledExperts(),
      [expert.slug]: {
        slug: expert.slug,
        agentId: agent.id,
        name: agent.name,
        version: getExpertVersion(expert),
        updatedAt: expert.updated_at,
      },
    };
    writeInstalledExperts(next);
    setInstalledExperts(next);
  }, []);

  const goToAgentChat = useCallback((agent: AgentSummary) => {
    switchSession(resolveAgentChatKey(agent));
    navigate('/');
  }, [navigate, switchSession]);

  const handleUseExpert = useCallback(async (expert: ExpertWithMeta) => {
    const existingAgent = agentByName.get(normalizeExpertName(expert.name));
    if (existingAgent) {
      rememberInstalledExpert(expert, existingAgent);
      goToAgentChat(existingAgent);
      return;
    }

    setAddingExpertSlug(expert.slug);
    try {
      await createAgent(expert.name, { inheritWorkspace: false });
      const createdAgent = useAgentsStore.getState().agents.find((agent) => normalizeExpertName(agent.name) === normalizeExpertName(expert.name));
      if (createdAgent) {
        rememberInstalledExpert(expert, createdAgent);
        goToAgentChat(createdAgent);
      }
      toast.success(`已添加 ${expert.name}`);
    } catch (error) {
      toast.error(t('toast.agentCreateFailed', { error: String(error) }));
    } finally {
      setAddingExpertSlug(null);
    }
  }, [agentByName, createAgent, goToAgentChat, rememberInstalledExpert, t]);

  const handleMarkExpertsUpdated = useCallback((experts: ExpertWithMeta[]) => {
    const current = readInstalledExperts();
    for (const expert of experts) {
      const localAgent = agents.find((agent) => agent.id === current[expert.slug]?.agentId)
        ?? agentByName.get(normalizeExpertName(expert.name));
      if (!localAgent) continue;
      current[expert.slug] = {
        slug: expert.slug,
        agentId: localAgent.id,
        name: localAgent.name,
        version: getExpertVersion(expert),
        updatedAt: expert.updated_at,
      };
    }
    writeInstalledExperts(current);
    setInstalledExperts(current);
    setShowUpdatePrompt(false);
    toast.success('专家已更新');
  }, [agentByName, agents]);

  if (loading && !hasCompletedInitialLoad) {
    return (
      <div className="flex flex-col -m-6 dark:bg-background min-h-[calc(100vh-2.5rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div data-testid="agents-page" className="flex flex-col -m-6 h-[calc(100vh-2.5rem)] overflow-hidden bg-background">
      <div className="flex h-full flex-col px-8 py-5">
        <div className="mb-5 flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('market')}
              className={cn(
                'text-base font-semibold tracking-tight transition-colors',
                activeTab === 'market' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              专家市场
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mine')}
              className={cn(
                'text-base font-semibold tracking-tight transition-colors',
                activeTab === 'mine' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              我的专家
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-[230px] items-center gap-2 rounded-full border border-border/70 bg-background px-3 text-muted-foreground shadow-sm">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={marketQuery}
                onChange={(event) => setMarketQuery(event.target.value)}
                placeholder="搜索专家"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-10">
          {error && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive text-sm font-medium">
                {error}
              </span>
            </div>
          )}

          {activeTab === 'market' ? (
            <div className="space-y-6">
              {updateCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowUpdatePrompt(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-brand/25 bg-brand/8 px-5 py-3 text-left text-sm text-brand hover:bg-brand/12"
                >
                  <span className="font-medium">发现 {updateCandidates.length} 个已添加专家可更新</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              <div className="grid gap-4 xl:grid-cols-3">
                <RankCard title="推荐榜" tone="amber" experts={filteredCloudExperts.slice(0, 3)} />
                <RankCard title="热门榜" tone="rose" experts={filteredCloudExperts.slice(3, 6)} />
                <RankCard title="新品榜" tone="sky" experts={filteredCloudExperts.slice(6, 9)} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {['全部', '一人公司', '金融投资', '内容创作', '办公协同', '营销增长', '技术工程', '视觉创意', '学习教育', '生活娱乐'].map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={cn(
                        'h-9 rounded-full px-4 text-sm transition-colors',
                        category === '全部'
                          ? 'bg-foreground/8 font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="h-9 rounded-full border-border bg-transparent px-4 text-sm shadow-none">
                  <Filter className="mr-2 h-4 w-4" />
                  综合排序
                </Button>
              </div>

              {expertsError && (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  {expertsError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {expertsLoading && filteredCloudExperts.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
                    正在加载专家市场...
                  </div>
                ) : filteredCloudExperts.map((expert) => {
                  const installedAgent = agentByName.get(normalizeExpertName(expert.name));
                  const hasUpdate = updateCandidates.some((candidate) => candidate.slug === expert.slug);
                  return (
                    <CloudExpertCard
                      key={expert.slug}
                      expert={expert}
                      installed={!!installedAgent}
                      hasUpdate={hasUpdate}
                      busy={addingExpertSlug === expert.slug}
                      onUse={() => void handleUseExpert(expert)}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="rounded-full bg-foreground/6 px-4 py-2 text-sm font-medium text-foreground">
                  专家
                </div>
                <Button variant="outline" className="h-9 rounded-full border-border bg-transparent px-4 text-sm shadow-none">
                  <Filter className="mr-2 h-4 w-4" />
                  全部
                </Button>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                {visibleAgents.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
                    还没有添加专家。可在专家市场添加后使用。
                  </div>
                ) : (
                  visibleAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      channelGroups={visibleChannelGroups}
                      onChat={() => goToAgentChat(agent)}
                      onOpenSettings={() => {
                        setSettingsModalAgent(agent);
                        setActiveAgentId(agent.id);
                      }}
                      onDelete={() => setAgentToDelete(agent)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {(activeAgent || settingsModalAgent) && (
        <AgentSettingsModal
          open={!!activeAgent}
          agent={(activeAgent || settingsModalAgent)!}
          channelGroups={visibleChannelGroups}
          onClose={() => setActiveAgentId(null)}
        />
      )}

      <ConfirmDialog
        open={!!agentToDelete}
        title={t('deleteDialog.title')}
        message={agentToDelete ? t('deleteDialog.message', { name: agentToDelete.name }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (!agentToDelete) return;
          try {
            await deleteAgent(agentToDelete.id);
            const deletedId = agentToDelete.id;
            setAgentToDelete(null);
            if (activeAgentId === deletedId) {
              setActiveAgentId(null);
            }
            toast.success(t('toast.agentDeleted'));
          } catch (error) {
            toast.error(t('toast.agentDeleteFailed', { error: String(error) }));
          }
        }}
        onCancel={() => setAgentToDelete(null)}
      />

      <ExpertUpdateDialog
        open={showUpdatePrompt && updateCandidates.length > 0}
        experts={updateCandidates}
        onClose={() => setShowUpdatePrompt(false)}
        onUpdate={(experts) => handleMarkExpertsUpdated(experts)}
      />
    </div>
  );
}

function AgentCard({
  agent,
  channelGroups,
  onChat,
  onOpenSettings,
  onDelete,
}: {
  agent: AgentSummary;
  channelGroups: ChannelGroupItem[];
  onChat: () => void;
  onOpenSettings: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('agents');
  const boundChannelAccounts = channelGroups.flatMap((group) =>
    group.accounts
      .filter((account) => account.agentId === agent.id)
      .map((account) => {
        const channelName = CHANNEL_NAMES[group.channelType as ChannelType] || group.channelType;
        const accountLabel =
          account.accountId === 'default'
            ? t('settingsDialog.mainAccount')
            : account.name || account.accountId;
        return `${channelName} · ${accountLabel}`;
      }),
  );
  const channelsText = boundChannelAccounts.length > 0
    ? boundChannelAccounts.join(', ')
    : t('none');

  return (
    <div
      className={cn(
        'group rounded-2xl border border-border/70 bg-background p-6 transition-colors hover:bg-accent/30',
        agent.isDefault && 'bg-brand/5 border-brand/20'
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Bot className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">{agent.isDefault ? 'mclaw' : agent.name}</h2>
              {agent.isDefault && (
                <Badge
                  variant="secondary"
                  className="rounded-full border-0 bg-brand/10 px-2 py-0.5 text-2xs font-medium text-brand shadow-none"
                >
                  {t('defaultBadge')}
                </Badge>
              )}
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
              {t('modelLine', {
                model: agent.modelDisplay,
                suffix: agent.inheritedModel ? ` (${t('inherited')})` : '',
              })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!agent.isDefault && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              title={t('deleteAgent')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onOpenSettings}
            title={t('settings')}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="mb-5 line-clamp-2 min-h-[42px] text-sm leading-relaxed text-muted-foreground">
        {channelsText === t('none')
          ? '本地专家，可直接进入对应专家对话。'
          : t('channelsLine', { channels: channelsText })}
      </p>
      <Button
        variant="outline"
        onClick={onChat}
        className="h-10 w-full rounded-full border-border bg-transparent text-sm font-medium shadow-none"
      >
        去对话
      </Button>
    </div>
  );
}

function RankCard({
  title,
  tone,
  experts,
}: {
  title: string;
  tone: 'amber' | 'rose' | 'sky';
  experts: ExpertWithMeta[];
}) {
  const toneClass = {
    amber: 'bg-amber-50/70 border-amber-200/70 dark:bg-amber-500/10 dark:border-amber-500/20',
    rose: 'bg-rose-50/60 border-rose-200/70 dark:bg-rose-500/10 dark:border-rose-500/20',
    sky: 'bg-sky-50/70 border-sky-200/70 dark:bg-sky-500/10 dark:border-sky-500/20',
  }[tone];

  return (
    <div className={cn('min-h-[150px] rounded-2xl border p-5', toneClass)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Sparkles className="h-5 w-5 text-brand" />
      </div>
      <div className="space-y-3">
        {experts.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无专家</p>
        ) : experts.map((expert, index) => (
          <div key={expert.slug} className="flex min-w-0 items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/12 text-2xs font-semibold text-brand">
              {index + 1}
            </span>
            <ExpertAvatar expert={expert} size="sm" />
            <span className="truncate text-sm text-foreground">{expert.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpertAvatar({ expert, size = 'md' }: { expert: ExpertWithMeta; size?: 'sm' | 'md' }) {
  const dimension = size === 'sm' ? 'h-8 w-8 rounded-full text-base' : 'h-12 w-12 rounded-2xl text-xl';
  if (expert.icon && /^https?:\/\//.test(expert.icon)) {
    return <img src={expert.icon} alt="" className={cn('shrink-0 object-cover', dimension)} />;
  }
  const initials = expert.name.slice(0, 1).toUpperCase();
  return (
    <div className={cn('flex shrink-0 items-center justify-center bg-brand/10 font-semibold text-brand', dimension)}>
      {initials}
    </div>
  );
}

function CloudExpertCard({
  expert,
  installed,
  hasUpdate,
  busy,
  onUse,
}: {
  expert: ExpertWithMeta;
  installed: boolean;
  hasUpdate: boolean;
  busy: boolean;
  onUse: () => void;
}) {
  const skills = expert.related_skills?.slice(0, 2) ?? [];
  return (
    <div className="group flex min-h-[190px] flex-col rounded-2xl border border-border/70 bg-background p-5 transition-colors hover:bg-accent/30">
      <div className="mb-4 flex items-start gap-3">
        <ExpertAvatar expert={expert} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{expert.name}</h3>
            {installed && (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-medium text-emerald-600">
                已添加
              </span>
            )}
            {hasUpdate && (
              <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-2xs font-medium text-brand">
                可更新
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{expert.author || 'mclaw'}</p>
        </div>
      </div>
      <p className="line-clamp-2 min-h-[42px] text-sm leading-relaxed text-muted-foreground">
        {expert.subtitle || expert.description || '云端专家，可添加到我的专家后直接对话。'}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-foreground/6 px-2 py-1 text-2xs text-muted-foreground">
          {getExpertCategory(expert)}
        </span>
        {skills.map((skill) => (
          <span key={skill} className="rounded-full bg-foreground/6 px-2 py-1 text-2xs text-muted-foreground">
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <span className="text-sm font-medium text-foreground">免费</span>
        <Button
          onClick={onUse}
          disabled={busy}
          className="h-9 rounded-full px-4 text-sm font-medium shadow-none"
          variant={installed ? 'outline' : 'default'}
        >
          {busy ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : installed ? (
            <ArrowRight className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {installed ? '去对话' : '添加'}
        </Button>
      </div>
    </div>
  );
}

function ExpertUpdateDialog({
  open,
  experts,
  onClose,
  onUpdate,
}: {
  open: boolean;
  experts: ExpertWithMeta[];
  onClose: () => void;
  onUpdate: (experts: ExpertWithMeta[]) => void;
}) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setSelectedSlugs(experts.map((expert) => expert.slug));
    }
  }

  const selectedExperts = experts.filter((expert) => selectedSlugs.includes(expert.slug));

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent asChild className="w-[calc(100%-2rem)] max-w-xl rounded-3xl border-0 bg-surface-modal shadow-2xl">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <div>
              <DialogTitle asChild>
                <CardTitle className="text-xl font-semibold tracking-tight">专家更新</CardTitle>
              </DialogTitle>
              <DialogDescription asChild>
                <CardDescription className="mt-1 text-sm text-muted-foreground">
                  发现 {experts.length} 个专家可更新，可在版本记录中查看变化。
                </CardDescription>
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-4">
            <div className="space-y-2">
              {experts.map((expert) => {
                const checked = selectedSlugs.includes(expert.slug);
                return (
                  <button
                    key={expert.slug}
                    type="button"
                    onClick={() => {
                      setSelectedSlugs((current) => checked
                        ? current.filter((slug) => slug !== expert.slug)
                        : [...current, expert.slug]);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-foreground/5 px-4 py-3 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        checked ? 'border-foreground bg-foreground text-background' : 'border-border bg-background',
                      )}>
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <ExpertAvatar expert={expert} size="sm" />
                      <span className="truncate font-medium text-foreground">{expert.name}</span>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      → {getExpertVersion(expert)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setSelectedSlugs(selectedSlugs.length === experts.length ? [] : experts.map((expert) => expert.slug))}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {selectedSlugs.length === experts.length ? '取消全选' : '全选'}
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="h-10 rounded-full px-5 shadow-none">
                  暂不更新
                </Button>
                <Button
                  onClick={() => onUpdate(selectedExperts)}
                  disabled={selectedExperts.length === 0}
                  className="h-10 rounded-full px-5 shadow-none"
                >
                  更新 ({selectedExperts.length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

const inputClasses = 'h-[44px] rounded-xl font-mono text-meta bg-transparent border-border focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 shadow-sm transition-all text-foreground placeholder:text-foreground/40';
const selectClasses = 'h-[44px] w-full rounded-xl font-mono text-meta bg-transparent border border-border focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 shadow-sm transition-all text-foreground px-3';
const labelClasses = 'text-sm text-foreground/80 font-bold';

function ChannelLogo({ type }: { type: ChannelType }) {
  switch (type) {
    case 'telegram':
      return <img src={telegramIcon} alt="Telegram" className="w-[20px] h-[20px] dark:invert" />;
    case 'discord':
      return <img src={discordIcon} alt="Discord" className="w-[20px] h-[20px] dark:invert" />;
    case 'whatsapp':
      return <img src={whatsappIcon} alt="WhatsApp" className="w-[20px] h-[20px] dark:invert" />;
    case 'wechat':
      return <img src={wechatIcon} alt="WeChat" className="w-[20px] h-[20px] dark:invert" />;
    case 'dingtalk':
      return <img src={dingtalkIcon} alt="DingTalk" className="w-[20px] h-[20px] dark:invert" />;
    case 'feishu':
      return <img src={feishuIcon} alt="Feishu" className="w-[20px] h-[20px] dark:invert" />;
    case 'wecom':
      return <img src={wecomIcon} alt="WeCom" className="w-[20px] h-[20px] dark:invert" />;
    case 'qqbot':
      return <img src={qqIcon} alt="QQ" className="w-[20px] h-[20px] dark:invert" />;
    default:
      return <span className="text-xl leading-none">{CHANNEL_ICONS[type] || '💬'}</span>;
  }
}

function AgentSettingsModal({
  open,
  agent,
  channelGroups,
  onClose,
}: {
  open: boolean;
  agent: AgentSummary;
  channelGroups: ChannelGroupItem[];
  onClose: () => void;
}) {
  const { t } = useTranslation('agents');
  const { updateAgent, defaultModelRef } = useAgentsStore();
  const [name, setName] = useState(agent.name);
  const [savingName, setSavingName] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  useEffect(() => {
    setName(agent.name);
  }, [agent.name]);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setShowModelModal(false);
      setShowCloseConfirm(false);
      setName(agent.name);
    }
  }

  const hasNameChanges = name.trim() !== agent.name;

  const handleRequestClose = () => {
    if (savingName || hasNameChanges) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === agent.name) return;
    setSavingName(true);
    try {
      await updateAgent(agent.id, name.trim());
      toast.success(t('toast.agentUpdated'));
    } catch (error) {
      toast.error(t('toast.agentUpdateFailed', { error: String(error) }));
    } finally {
      setSavingName(false);
    }
  };

  const assignedChannels = channelGroups.flatMap((group) =>
    group.accounts
      .filter((account) => account.agentId === agent.id)
      .map((account) => ({
        channelType: group.channelType as ChannelType,
        accountId: account.accountId,
        name:
          account.accountId === 'default'
            ? t('settingsDialog.mainAccount')
            : account.name || account.accountId,
        error: account.lastError,
      })),
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleRequestClose()}>
      <DialogContent asChild className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border-0 shadow-2xl bg-surface-modal overflow-hidden">
        <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2 shrink-0">
          <div>
            <DialogTitle asChild>
              <CardTitle className="text-2xl font-serif font-normal tracking-tight">
                {t('settingsDialog.title', { name: agent.name })}
              </CardTitle>
            </DialogTitle>
            <DialogDescription asChild>
              <CardDescription className="text-sm mt-1 text-foreground/70">
                {t('settingsDialog.description')}
              </CardDescription>
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRequestClose}
            className="rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 overflow-y-auto flex-1 p-6">
          <div className="space-y-4">
            <div className="space-y-2.5">
              <Label htmlFor="agent-settings-name" className={labelClasses}>{t('settingsDialog.nameLabel')}</Label>
              <div className="flex gap-2">
                <Input
                  id="agent-settings-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  readOnly={agent.isDefault}
                  className={inputClasses}
                />
                {!agent.isDefault && (
                  <Button
                    variant="outline"
                    onClick={() => void handleSaveName()}
                    disabled={savingName || !name.trim() || name.trim() === agent.name}
                    className="h-[44px] text-meta font-medium rounded-xl px-4 border-border bg-transparent hover:bg-accent/50 shadow-none text-foreground/80 hover:text-foreground"
                  >
                    {savingName ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      t('common:actions.save')
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 rounded-2xl bg-accent/50 border border-transparent p-4">
                <p className="text-tiny uppercase tracking-[0.08em] text-muted-foreground/80 font-medium">
                  {t('settingsDialog.agentIdLabel')}
                </p>
                <p className="font-mono text-meta text-foreground">{agent.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModelModal(true)}
                className="space-y-1 rounded-2xl bg-accent/50 border border-transparent p-4 text-left hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <p className="text-tiny uppercase tracking-[0.08em] text-muted-foreground/80 font-medium">
                  {t('settingsDialog.modelLabel')}
                </p>
                <p className="text-sm text-foreground">
                  {agent.modelDisplay}
                  {agent.inheritedModel ? ` (${t('inherited')})` : ''}
                </p>
                <p className="font-mono text-xs text-foreground/70 break-all">
                  {agent.modelRef || defaultModelRef || '-'}
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif text-foreground font-normal tracking-tight">
                  {t('settingsDialog.channelsTitle')}
                </h3>
                <p className="text-sm text-foreground/70 mt-1">{t('settingsDialog.channelsDescription')}</p>
              </div>
            </div>

            {assignedChannels.length === 0 && agent.channelTypes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-accent/50 p-4 text-sm text-muted-foreground">
                {t('settingsDialog.noChannels')}
              </div>
            ) : (
              <div className="space-y-3">
                {assignedChannels.map((channel) => (
                  <div key={`${channel.channelType}-${channel.accountId}`} className="flex items-center justify-between rounded-2xl bg-accent/50 border border-transparent p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-[40px] w-[40px] shrink-0 flex items-center justify-center text-foreground bg-accent/50 border border-border/50 rounded-full shadow-sm">
                        <ChannelLogo type={channel.channelType} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{channel.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {CHANNEL_NAMES[channel.channelType]} · {channel.accountId === 'default' ? t('settingsDialog.mainAccount') : channel.accountId}
                        </p>
                        {channel.error && (
                          <p className="text-xs text-destructive mt-1">{channel.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0" />
                  </div>
                ))}
                {assignedChannels.length === 0 && agent.channelTypes.length > 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-accent/50 p-4 text-sm text-muted-foreground">
                    {t('settingsDialog.channelsManagedInChannels')}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </DialogContent>
      <AgentModelModal
        open={showModelModal}
        agent={agent}
        onClose={() => setShowModelModal(false)}
      />
      <ConfirmDialog
        open={showCloseConfirm}
        title={t('settingsDialog.unsavedChangesTitle')}
        message={t('settingsDialog.unsavedChangesMessage')}
        confirmLabel={t('settingsDialog.closeWithoutSaving')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={() => {
          setShowCloseConfirm(false);
          setName(agent.name);
          onClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </Dialog>
  );
}

function AgentModelModal({
  open,
  agent,
  onClose,
}: {
  open: boolean;
  agent: AgentSummary;
  onClose: () => void;
}) {
  const { t } = useTranslation('agents');
  const providerAccounts = useProviderStore((state) => state.accounts);
  const providerStatuses = useProviderStore((state) => state.statuses);
  const providerVendors = useProviderStore((state) => state.vendors);
  const providerDefaultAccountId = useProviderStore((state) => state.defaultAccountId);
  const { updateAgentModel, defaultModelRef } = useAgentsStore();
  const [selectedRuntimeProviderKey, setSelectedRuntimeProviderKey] = useState('');
  const [modelIdInput, setModelIdInput] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  const runtimeProviderOptions = useMemo<RuntimeProviderOption[]>(
    () => buildRuntimeProviderOptions(
      providerAccounts,
      providerStatuses,
      providerVendors,
      providerDefaultAccountId,
    ),
    [providerAccounts, providerDefaultAccountId, providerStatuses, providerVendors],
  );

  useEffect(() => {
    const override = splitModelRef(agent.overrideModelRef);
    if (override) {
      setSelectedRuntimeProviderKey(override.providerKey);
      setModelIdInput(override.modelId);
      return;
    }

    const effective = splitModelRef(agent.modelRef || defaultModelRef);
    if (effective) {
      setSelectedRuntimeProviderKey(effective.providerKey);
      setModelIdInput(effective.modelId);
      return;
    }

    setSelectedRuntimeProviderKey(runtimeProviderOptions[0]?.runtimeProviderKey || '');
    setModelIdInput('');
  }, [agent.modelRef, agent.overrideModelRef, defaultModelRef, runtimeProviderOptions]);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setSavingModel(false);
      setShowCloseConfirm(false);
    }
  }

  const selectedProvider = runtimeProviderOptions.find((option) => option.runtimeProviderKey === selectedRuntimeProviderKey) || null;
  const trimmedModelId = modelIdInput.trim();
  const nextModelRef = selectedRuntimeProviderKey && trimmedModelId
    ? `${selectedRuntimeProviderKey}/${trimmedModelId}`
    : '';
  const normalizedDefaultModelRef = (defaultModelRef || '').trim();
  const isUsingDefaultModelInForm = Boolean(normalizedDefaultModelRef) && nextModelRef === normalizedDefaultModelRef;
  const currentOverrideModelRef = (agent.overrideModelRef || '').trim();
  const desiredOverrideModelRef = nextModelRef && nextModelRef !== normalizedDefaultModelRef
    ? nextModelRef
    : null;
  const modelChanged = (desiredOverrideModelRef || '') !== currentOverrideModelRef;

  const handleRequestClose = () => {
    if (savingModel || modelChanged) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleSaveModel = async () => {
    if (!selectedRuntimeProviderKey) {
      toast.error(t('toast.agentModelProviderRequired'));
      return;
    }
    if (!trimmedModelId) {
      toast.error(t('toast.agentModelIdRequired'));
      return;
    }
    if (!modelChanged) return;
    if (!nextModelRef.includes('/')) {
      toast.error(t('toast.agentModelInvalid'));
      return;
    }

    setSavingModel(true);
    try {
      await updateAgentModel(agent.id, desiredOverrideModelRef);
      toast.success(desiredOverrideModelRef ? t('toast.agentModelUpdated') : t('toast.agentModelReset'));
      onClose();
    } catch (error) {
      toast.error(t('toast.agentModelUpdateFailed', { error: String(error) }));
    } finally {
      setSavingModel(false);
    }
  };

  const handleUseDefaultModel = () => {
    const parsedDefault = splitModelRef(normalizedDefaultModelRef);
    if (!parsedDefault) {
      setSelectedRuntimeProviderKey('');
      setModelIdInput('');
      return;
    }
    setSelectedRuntimeProviderKey(parsedDefault.providerKey);
    setModelIdInput(parsedDefault.modelId);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleRequestClose()}>
      <DialogContent asChild className="z-[60] w-[calc(100%-2rem)] max-w-xl rounded-3xl border-0 shadow-2xl bg-surface-modal overflow-hidden">
        <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <DialogTitle asChild>
              <CardTitle className="text-2xl font-serif font-normal tracking-tight">
                {t('settingsDialog.modelLabel')}
              </CardTitle>
            </DialogTitle>
            <DialogDescription asChild>
              <CardDescription className="text-sm mt-1 text-foreground/70">
                {t('settingsDialog.modelOverrideDescription', { defaultModel: defaultModelRef || '-' })}
              </CardDescription>
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRequestClose}
            className="rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="agent-model-provider" className="text-xs text-foreground/70">{t('settingsDialog.modelProviderLabel')}</Label>
            <select
              id="agent-model-provider"
              value={selectedRuntimeProviderKey}
              onChange={(event) => {
                const nextProvider = event.target.value;
                setSelectedRuntimeProviderKey(nextProvider);
                if (!modelIdInput.trim()) {
                  const option = runtimeProviderOptions.find((candidate) => candidate.runtimeProviderKey === nextProvider);
                  setModelIdInput(option?.configuredModelId || '');
                }
              }}
              className={selectClasses}
            >
              <option value="">{t('settingsDialog.modelProviderPlaceholder')}</option>
              {runtimeProviderOptions.map((option) => (
                <option key={option.runtimeProviderKey} value={option.runtimeProviderKey}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-model-id" className="text-xs text-foreground/70">{t('settingsDialog.modelIdLabel')}</Label>
            <Input
              id="agent-model-id"
              value={modelIdInput}
              onChange={(event) => setModelIdInput(event.target.value)}
              placeholder={selectedProvider?.modelIdPlaceholder || selectedProvider?.configuredModelId || t('settingsDialog.modelIdPlaceholder')}
              className={inputClasses}
            />
          </div>
          {!!nextModelRef && (
            <p className="text-xs font-mono text-foreground/70 break-all">
              {t('settingsDialog.modelPreview')}: {nextModelRef}
            </p>
          )}
          {runtimeProviderOptions.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t('settingsDialog.modelProviderEmpty')}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleUseDefaultModel}
              disabled={savingModel || !normalizedDefaultModelRef || isUsingDefaultModelInForm}
              className="h-9 text-meta font-medium rounded-full px-4 border-border bg-transparent hover:bg-accent/50 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('settingsDialog.useDefaultModel')}
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestClose}
              className="h-9 text-meta font-medium rounded-full px-4 border-border bg-transparent hover:bg-accent/50 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSaveModel()}
              disabled={savingModel || !selectedRuntimeProviderKey || !trimmedModelId || !modelChanged}
              className="h-9 text-meta font-medium rounded-full px-4 shadow-none"
            >
              {savingModel ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                t('common:actions.save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      </DialogContent>
      <ConfirmDialog
        open={showCloseConfirm}
        title={t('settingsDialog.unsavedChangesTitle')}
        message={t('settingsDialog.unsavedChangesMessage')}
        confirmLabel={t('settingsDialog.closeWithoutSaving')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={() => {
          setShowCloseConfirm(false);
          onClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </Dialog>
  );
}

export default Agents;
