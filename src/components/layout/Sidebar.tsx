/**
 * Sidebar Component
 * 三栏布局：图标列(60px) + 内容列(240px)
 * 参考设计图 docs/projects/assets/image_20260609123715926.png
 * - 图标列：固定宽度，只显示图标 + tooltip
 * - 内容列：固定宽度，含搜索 + 主功能列表 + Agent/历史会话
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Puzzle,
  Clock,
  Trash2,
  Pencil,
  Check,
  X,
  Cpu,
  ImagePlus,
  ChevronRight,
  Loader2,
  FlaskConical,
  MessageSquare,
  Plug,
  Plus,
  Brain,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  Pin,
  FolderOpen,
  UserRound,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isGatewayRestarting } from '@/lib/gateway-status';
import { useSettingsStore } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentsStore } from '@/stores/agents';
import { getSessionActivityMs, getSessionBucket, type SessionBucketKey } from './session-buckets';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MAC_SIDEBAR_CHROME_HEIGHT } from '@shared/sidebar-layout';
import { useTranslation } from 'react-i18next';
import logoSvg from '@/assets/logo.svg';
import { useNewChatAction } from './use-new-chat-action';
import { UserMenu } from './UserMenu';
import type { AgentSummary } from '@/types/agent';

// 三栏布局宽度（参考设计图）
const ICON_RAIL_WIDTH = 140;    // 菜单列：固定 140px（图标+文字）
const ICON_RAIL_COLLAPSED_WIDTH = 60; // 折叠后仅显示图标（60px）
// 对话列表列的拖动范围
const HISTORY_PANE_MIN = 220;
const HISTORY_PANE_MAX = 360;
const HISTORY_PANE_DEFAULT = 260;

// ── 菜单列项（横排：图标 + 文字） ─────────────────────────────
interface IconRailItemProps {
  to?: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
}

function IconRailItem({ to, icon: Icon, label, active, onClick, testId }: IconRailItemProps) {
  const content = (
    <div
      className={cn(
        'group/icon relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 transition-all duration-200',
        active
          ? 'bg-brand text-white shadow-sm'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground',
      )}
      data-testid={testId}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
      <span className="text-meta font-medium truncate">{label}</span>
    </div>
  );

  if (to) {
    return (
      <NavLink to={to} onClick={onClick} className="block no-drag w-full">
        {content}
      </NavLink>
    );
  }
  return (
    <button type="button" onClick={onClick} className="block no-drag w-full text-left">
      {content}
    </button>
  );
}

const INITIAL_NOW_MS = Date.now();
const DEFAULT_EXPANDED_SESSION_BUCKETS: Record<SessionBucketKey, boolean> = {
  today: true,
  withinWeek: true,
  withinMonth: false,
  older: false,
};

function getAgentIdFromSessionKey(sessionKey: string): string {
  if (!sessionKey.startsWith('agent:')) return 'main';
  const [, agentId] = sessionKey.split(':');
  return agentId || 'main';
}

export function Sidebar() {
  const isMac = window.electron?.platform === 'darwin';
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);
  const { t } = useTranslation(['common', 'chat']);
  const handleNewChat = useNewChatAction();

  // 对话历史列宽度（仅 / 路由使用）
  const [historyPaneWidth, setHistoryPaneWidth] = useState(HISTORY_PANE_DEFAULT);
  const [historyPaneCollapsed, setHistoryPaneCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const historyResizeStopRef = useRef<(() => void) | null>(null);
  const handleHistoryResizePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 忽略
    }
    const onMove = (e: PointerEvent) => {
      const currentIconRailWidth = sidebarCollapsed ? ICON_RAIL_COLLAPSED_WIDTH : ICON_RAIL_WIDTH;
      const next = Math.max(HISTORY_PANE_MIN, Math.min(HISTORY_PANE_MAX, e.clientX - currentIconRailWidth));
      setHistoryPaneWidth(next);
    };
    const onUp = () => {
      historyResizeStopRef.current?.();
      historyResizeStopRef.current = null;
    };
    historyResizeStopRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [sidebarCollapsed]);

  useEffect(() => () => historyResizeStopRef.current?.(), []);

  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionLabels = useChatStore((s) => s.sessionLabels);
  const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);
  const switchSession = useChatStore((s) => s.switchSession);
  const renameSession = useChatStore((s) => s.renameSession);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const loadHistory = useChatStore((s) => s.loadHistory);

  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';
  const isGatewayReady = isGatewayRunning && gatewayStatus.gatewayReady !== false;
  const gatewayRestarting = isGatewayRestarting(gatewayStatus);
  const gatewayRuntimeKey = `${gatewayStatus.pid ?? 'none'}:${gatewayStatus.connectedAt ?? 'none'}:${gatewayStatus.port}`;

  const hasLoadedCurrentRuntimeRef = useRef(false);

  useEffect(() => {
    hasLoadedCurrentRuntimeRef.current = false;
  }, [gatewayRuntimeKey]);

  useEffect(() => {
    if (!isGatewayReady) return;
    let cancelled = false;
    (async () => {
      await loadSessions();
      if (cancelled) return;
      if (hasLoadedCurrentRuntimeRef.current) return;
      hasLoadedCurrentRuntimeRef.current = true;
      await loadHistory(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [gatewayRuntimeKey, isGatewayReady, loadHistory, loadSessions]);
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);



  const navigate = useNavigate();
  const location = useLocation();
  const isOnChat = location.pathname === '/';

  const getSessionLabel = (key: string, displayName?: string, label?: string) =>
    sessionLabels[key] ?? label ?? displayName ?? key;

  const [sessionToDelete, setSessionToDelete] = useState<{ key: string; label: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSessionKey, setEditingSessionKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [nowMs, setNowMs] = useState(INITIAL_NOW_MS);
  const [expandedSessionBuckets, setExpandedSessionBuckets] = useState<Record<SessionBucketKey, boolean>>(
    () => ({ ...DEFAULT_EXPANDED_SESSION_BUCKETS }),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    if (deleteDialogOpen || !sessionToDelete) return;
    const timer = window.setTimeout(() => setSessionToDelete(null), 160);
    return () => window.clearTimeout(timer);
  }, [deleteDialogOpen, sessionToDelete]);

  const handleStartRename = (key: string, currentLabel: string) => {
    setEditingSessionKey(key);
    setEditingLabel(currentLabel);
  };

  const handleRenameSubmit = async () => {
    if (!editingSessionKey || !editingLabel.trim()) {
      setEditingSessionKey(null);
      return;
    }
    try {
      await renameSession(editingSessionKey, editingLabel.trim());
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
    setEditingSessionKey(null);
  };

  const handleRenameCancel = () => {
    setEditingSessionKey(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const toggleSessionBucket = (bucketKey: SessionBucketKey) => {
    setExpandedSessionBuckets((current) => ({
      ...current,
      [bucketKey]: !current[bucketKey],
    }));
  };

  const agentNameById = useMemo(
    () => Object.fromEntries((agents ?? []).map((agent) => [agent.id, agent.name])),
    [agents],
  );
  const sessionBuckets: Array<{ key: SessionBucketKey; label: string; sessions: typeof sessions }> = [
    { key: 'today', label: t('chat:historyBuckets.today'), sessions: [] },
    { key: 'withinWeek', label: t('chat:historyBuckets.withinWeek'), sessions: [] },
    { key: 'withinMonth', label: t('chat:historyBuckets.withinMonth'), sessions: [] },
    { key: 'older', label: t('chat:historyBuckets.older'), sessions: [] },
  ];
  const sessionBucketMap = Object.fromEntries(sessionBuckets.map((bucket) => [bucket.key, bucket])) as Record<
    SessionBucketKey,
    (typeof sessionBuckets)[number]
  >;

  for (const { session, activityMs } of sessions
    .map((session) => ({
      session,
      activityMs: getSessionActivityMs(session, sessionLastActivity),
    }))
    .sort((a, b) => b.activityMs - a.activityMs)) {
    const bucketKey = getSessionBucket(activityMs, nowMs);
    sessionBucketMap[bucketKey].sessions.push(session);
  }

  // Sidebar 总宽：菜单列(140) + 对话路由额外历史列
  const currentIconRailWidth = sidebarCollapsed ? ICON_RAIL_COLLAPSED_WIDTH : ICON_RAIL_WIDTH;
  const currentHistoryPaneWidth = historyPaneCollapsed ? 40 : historyPaneWidth;
  const sidebarTotalWidth = currentIconRailWidth + (isOnChat ? currentHistoryPaneWidth : 0);

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'relative flex min-h-0 shrink-0 overflow-hidden bg-surface-sidebar transition-[width] duration-200 ease-out',
      )}
      style={{ width: sidebarTotalWidth }}
    >
      {isMac && (
        <div
          aria-hidden="true"
          data-testid="mac-sidebar-chrome"
          className="drag-region shrink-0 absolute inset-x-0 top-0"
          style={{ height: MAC_SIDEBAR_CHROME_HEIGHT }}
        />
      )}

      {/* ── 左列：菜单导航（固定 140px，显示图标+文字） ──────── */}
      <div
        data-testid="sidebar-icon-rail"
        className="flex shrink-0 flex-col gap-1 border-r border-border/40 bg-surface-sidebar py-2 px-2"
        style={{ width: currentIconRailWidth }}
      >
        {/* macOS 顶部留白：避免 Logo 与 traffic lights 按钮重叠 */}
        {isMac && <div aria-hidden className="shrink-0" style={{ height: MAC_SIDEBAR_CHROME_HEIGHT }} />}

        {/* Logo 区 */}
        <div className="flex items-center gap-2 h-9 mb-1 px-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-hover shadow-sm">
            <img src={logoSvg} alt="mclaw" className="h-4 w-4 brightness-0 invert" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground truncate">mclaw</span>
        </div>

        {/* 折叠/展开按钮（Logo 正下方，永远可见） */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              data-testid="sidebar-collapse-toggle"
              aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
              className={cn(
                'no-drag flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 transition-all duration-200',
                'text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground',
              )}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              )}
              {!sidebarCollapsed && (
                <span className="text-meta font-medium truncate">折叠侧边栏</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={6}>
            <p>{sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}</p>
          </TooltipContent>
        </Tooltip>

        {/* 主导航（无分组标题） */}
        <IconRailItem to="/" icon={MessageSquare} label={t('sidebar.chat')} active={isOnChat} testId="sidebar-nav-chat" />
        <IconRailItem to="/models" icon={Cpu} label={t('sidebar.models')} active={location.pathname.startsWith('/models')} testId="sidebar-nav-models" />
        <IconRailItem to="/agents" icon={Bot} label={t('sidebar.agents')} active={location.pathname.startsWith('/agents')} testId="sidebar-nav-agents" />
        <IconRailItem to="/cron" icon={Clock} label={t('sidebar.cronTasks')} active={location.pathname.startsWith('/cron')} testId="sidebar-nav-cron" />
        <IconRailItem to="/skills" icon={Puzzle} label={t('sidebar.skills')} active={location.pathname.startsWith('/skills')} testId="sidebar-nav-skills" />
        <IconRailItem to="/channels" icon={Plug} label={t('sidebar.channels')} active={location.pathname.startsWith('/channels')} testId="sidebar-nav-channels" />
        <IconRailItem to="/dreams" icon={Brain} label={t('sidebar.openClawDreams')} active={location.pathname.startsWith('/dreams')} testId="sidebar-nav-dreams" />

        {devModeUnlocked && (
          <IconRailItem
            to="/image-generation"
            icon={ImagePlus}
            label={t('common:sidebar.imageGeneration')}
            active={location.pathname.startsWith('/image-generation')}
            testId="sidebar-nav-image-generation"
          />
        )}

        {/* Lab 占位（暂未在路由中实现） */}
        <IconRailItem icon={FlaskConical} label="Lab" />

        {/* 中部留白推到底部 */}
        <div className="flex-1" />

        {/* 底部：用户菜单（头像 + 套餐 + 余额） */}
        <div className="px-1 pb-1">
          <UserMenu collapsed={sidebarCollapsed} />
        </div>
      </div>

      {/* ── 中间列：仅 / 路由显示，含搜索+新对话+历史列表（可拖宽） ── */}
      {isOnChat && (
        <ChatSidebarPane
          width={historyPaneWidth}
          collapsed={historyPaneCollapsed}
          onToggleCollapse={() => setHistoryPaneCollapsed(!historyPaneCollapsed)}
          sessions={sessions}
          currentSessionKey={currentSessionKey}
          isOnChat={isOnChat}
          navigate={navigate}
          loadHistory={loadHistory}
          switchSession={switchSession}
          bucketLabel={t('chat:historyBuckets', { returnObjects: true }) as Record<string, string>}
          sessionBucketMap={sessionBucketMap}
          expandedBuckets={expandedSessionBuckets}
          toggleBucket={toggleSessionBucket}
          agents={agents}
          agentNameById={agentNameById}
          getSessionLabel={getSessionLabel}
          editingSessionKey={editingSessionKey}
          editingLabel={editingLabel}
          setEditingLabel={setEditingLabel}
          handleRenameKeyDown={handleRenameKeyDown}
          handleRenameSubmit={handleRenameSubmit}
          handleStartRename={handleStartRename}
          handleRenameCancel={handleRenameCancel}
          setSessionToDelete={setSessionToDelete}
          setDeleteDialogOpen={setDeleteDialogOpen}
          onNewChat={handleNewChat}
          newChatLabel={t('sidebar.newChat')}
          onResizeStart={handleHistoryResizePointerDown}
          gatewayRestarting={gatewayRestarting}
          gatewayLabel={t('common:gateway.restarting')}
        />
      )}
    </aside>
  );
}

// ── 对话侧栏面板（仅 / 路由显示，从上到下：搜索 → 新对话 → 历史列表） ──
//   可拖动调整宽度（220-360px，默认 260px）
interface ChatSidebarPaneProps {
  width: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  sessions: Array<{ key: string; displayName?: string; label?: string }>;
  currentSessionKey: string | null;
  isOnChat: boolean;
  navigate: (to: string) => void;
  loadHistory: (preserveInput: boolean) => Promise<void>;
  switchSession: (key: string) => void;
  bucketLabel: Record<string, string>;
  sessionBucketMap: Record<SessionBucketKey, { key: SessionBucketKey; label: string; sessions: Array<{ key: string; displayName?: string; label?: string }> }>;
  expandedBuckets: Record<SessionBucketKey, boolean>;
  toggleBucket: (key: SessionBucketKey) => void;
  agents: AgentSummary[];
  agentNameById: Record<string, string>;
  getSessionLabel: (key: string, displayName?: string, label?: string) => string;
  editingSessionKey: string | null;
  editingLabel: string;
  setEditingLabel: (v: string) => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
  handleRenameSubmit: () => Promise<void>;
  handleStartRename: (key: string, label: string) => void;
  handleRenameCancel: () => void;
  setSessionToDelete: (s: { key: string; label: string } | null) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  onNewChat: () => void;
  newChatLabel: string;
  onResizeStart: (e: React.PointerEvent<HTMLDivElement>) => void;
  gatewayRestarting: boolean;
  gatewayLabel: string;
}

function ChatSidebarPane(props: ChatSidebarPaneProps) {
  const {
    width,
    collapsed,
    onToggleCollapse,
    sessions,
    currentSessionKey,
    isOnChat,
    navigate,
    loadHistory,
    switchSession,
    bucketLabel,
    sessionBucketMap,
    expandedBuckets,
    toggleBucket,
    agents,
    agentNameById,
    getSessionLabel,
    editingSessionKey,
    setEditingLabel,
    handleRenameKeyDown,
    handleRenameSubmit,
    handleStartRename,
    handleRenameCancel,
    setSessionToDelete,
    setDeleteDialogOpen,
    onNewChat,
    newChatLabel,
    onResizeStart,
    gatewayRestarting,
    gatewayLabel,
  } = props;
  const [agentMenuId, setAgentMenuId] = useState<string | null>(null);
  const selectedAgentId = getAgentIdFromSessionKey(currentSessionKey || 'agent:main:main');
  const visibleAgents = agents.length > 0
    ? [...agents].sort((a, b) => Number(a.isDefault) - Number(b.isDefault))
    : [];

  const handleSelectAgent = (agent: AgentSummary) => {
    const nextKey = agent.mainSessionKey || `agent:${agent.id}:main`;
    setAgentMenuId(null);
    if (currentSessionKey === nextKey) {
      void loadHistory(false);
    } else {
      switchSession(nextKey);
    }
    navigate('/');
  };

  return (
    <div
      data-testid="chat-sidebar-pane"
      className="relative flex min-w-0 shrink-0 flex-col overflow-hidden border-l border-border/40 transition-[width] duration-200 ease-out"
      style={{ width: collapsed ? 40 : width }}
    >
      {/* 折叠按钮（折叠态：顶部居中把手；展开态：标题栏操作） */}
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapse}
              data-testid="chat-history-toggle"
              aria-label="展开历史"
              className="no-drag mt-1 mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/80 hover:bg-brand/10 hover:text-brand transition-all duration-200"
            >
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={6}>
            <p>展开历史</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <>
          {/* 折叠按钮：右对齐文本+图标，hover 高亮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                data-testid="chat-history-toggle"
                aria-label="收起历史"
                className="no-drag flex h-9 w-full items-center justify-end gap-1.5 px-2.5 text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground transition-all duration-200"
              >
                <span className="text-tiny text-sidebar-muted">收起历史</span>
                <PanelLeftClose className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={6}>
              <p>收起历史</p>
            </TooltipContent>
          </Tooltip>

          {/* 顶部：搜索框 + 新对话按钮（按设计图从上到下） */}
          <div className="flex flex-col gap-3 p-2 border-b border-border/40 shrink-0">
            <input
              type="text"
              placeholder="搜索"
              className="w-full h-12 px-4 rounded-2xl bg-sidebar-hover/70 border border-transparent text-base font-medium text-sidebar-foreground placeholder:text-sidebar-muted focus:outline-none focus:bg-background focus:border-brand/40 focus:ring-2 focus:ring-brand/15 transition-all"
            />
            <button
              type="button"
              onClick={onNewChat}
              className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-brand to-brand-hover text-white text-lg font-semibold shadow-sm hover:shadow-md hover:brightness-105 active:translate-y-px transition-all duration-200"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              <span>{newChatLabel}</span>
            </button>
          </div>
        </>
      )}

      {!collapsed && (
        <div className="border-b border-border/40 px-2 py-3">
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {visibleAgents.map((agent) => {
              const selected = selectedAgentId === agent.id;
              return (
                <div key={agent.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handleSelectAgent(agent)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                      selected ? 'bg-sidebar-hover text-sidebar-foreground' : 'text-sidebar-foreground/85 hover:bg-sidebar-hover/70',
                    )}
                  >
                    <span className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      selected ? 'bg-brand/14 text-brand' : 'bg-sidebar-foreground/8 text-sidebar-muted',
                    )}>
                      {agent.isDefault ? 'M' : agent.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {agent.isDefault ? 'mclaw' : agent.name}
                        </span>
                        {agent.isDefault && (
                          <span className="shrink-0 text-2xs font-semibold text-sidebar-muted">Main Agent</span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-sidebar-muted">
                        {agent.modelDisplay || '默认专家'}
                      </span>
                    </span>
                  </button>
                  {selected && !agent.isDefault && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAgentMenuId(agentMenuId === agent.id ? null : agent.id);
                      }}
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sidebar-foreground hover:bg-background/70"
                      aria-label="专家菜单"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                  {agentMenuId === agent.id && (
                    <div className="absolute right-2 top-10 z-30 w-44 rounded-2xl border border-black/10 bg-surface-modal p-2 shadow-xl dark:border-white/10">
                      {[
                        { icon: Pin, label: '置顶' },
                        { icon: UserRound, label: 'Agent详情' },
                        { icon: FolderOpen, label: '打开工作间' },
                        { icon: ListChecks, label: '批量删除' },
                      ].map(({ icon: Icon, label }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setAgentMenuId(null)}
                          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-foreground hover:bg-accent"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sessions.length > 0 ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1">
          {(['today', 'withinWeek', 'withinMonth', 'older'] as SessionBucketKey[]).map((bk) => {
            const bucket = sessionBucketMap[bk];
            const isExpanded = expandedBuckets[bk] ?? false;
            const visibleBucketSessions = bucket.sessions.filter((session) => getAgentIdFromSessionKey(session.key) === selectedAgentId);
            return (
              <div key={bk} data-testid={`session-bucket-${bk}`}>
                <button
                  type="button"
                  data-testid={`session-bucket-toggle-${bk}`}
                  aria-expanded={isExpanded}
                  onClick={() => toggleBucket(bk)}
                  className="flex w-full items-center gap-1 rounded-md px-2.5 py-1 text-left text-tiny font-medium text-sidebar-muted tracking-tight transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
                >
                  <ChevronRight className={cn('h-3 w-3 shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                  <span>{bucketLabel[bk] ?? bucket.label}</span>
                </button>
                {isExpanded && visibleBucketSessions.map((s) => {
                  const agentId = getAgentIdFromSessionKey(s.key);
                  const agentName = agentNameById[agentId] || agentId;
                  const isEditing = editingSessionKey === s.key;
                  const sessionLabel = getSessionLabel(s.key, s.displayName, s.label);
                  return (
                    <div key={s.key} className="group relative flex items-center">
                      {isEditing ? (
                        <div className="flex w-full items-center gap-1 px-1.5 py-1">
                          <Input
                            autoFocus
                            value={props.editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={() => void handleRenameSubmit()}
                            className="h-7 min-w-0 flex-1 text-meta"
                          />
                          <button
                            onMouseDown={(e) => { e.preventDefault(); void handleRenameSubmit(); }}
                            className="flex shrink-0 items-center justify-center rounded p-0.5 text-sidebar-muted hover:text-brand"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleRenameCancel(); }}
                            className="flex shrink-0 items-center justify-center rounded p-0.5 text-sidebar-muted hover:text-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              if (currentSessionKey === s.key) {
                                void loadHistory(false);
                              } else {
                                switchSession(s.key);
                              }
                              navigate('/');
                            }}
                            onDoubleClick={() => handleStartRename(s.key, sessionLabel)}
                            className={cn(
                              'w-full text-left rounded-2xl px-4 py-2 text-sm transition-colors pr-14',
                              'hover:bg-sidebar-hover text-sidebar-foreground/85',
                              isOnChat && currentSessionKey === s.key
                                ? 'bg-brand/10 text-brand font-semibold'
                                : '',
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {agentId !== selectedAgentId && (
                                <span className="shrink-0 rounded-full bg-sidebar-foreground/8 px-2 py-0.5 text-2xs font-medium text-sidebar-muted">
                                  {agentName}
                                </span>
                              )}
                              <span className="truncate">{sessionLabel}</span>
                            </div>
                          </button>
                          <div className="absolute right-1 flex items-center gap-0.5 transition-opacity opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStartRename(s.key, sessionLabel); }}
                              className="flex items-center justify-center rounded p-0.5 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              data-testid={`sidebar-session-delete-${s.key}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete({ key: s.key, label: sessionLabel });
                                setDeleteDialogOpen(true);
                              }}
                              className="flex items-center justify-center rounded p-0.5 text-sidebar-muted hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-meta text-sidebar-muted">暂无历史对话</p>
          <p className="text-2xs text-sidebar-muted/70 mt-1">开启一段新对话试试</p>
        </div>
      )}

      {/* Gateway 重启提示（底部） */}
      {!collapsed && (
        <div
          data-testid="chat-pane-gateway-restarting"
          data-state={gatewayRestarting ? 'visible' : 'hidden'}
          aria-hidden={!gatewayRestarting}
          className={cn(
            'overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out border-t border-border/40',
            gatewayRestarting ? 'max-h-12 translate-y-0 opacity-100' : 'max-h-0 translate-y-1 opacity-0',
          )}
        >
          <div
            aria-live="polite"
            aria-label={gatewayLabel}
            title={gatewayLabel}
            className="flex items-center gap-2 px-2.5 py-1.5 m-2 rounded-lg border border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:border-yellow-500/30 dark:text-yellow-400"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-meta">{gatewayLabel}</span>
          </div>
        </div>
      )}

      {/* 拖动条 */}
      {!collapsed && (
        <div
          data-testid="chat-pane-resize"
          role="separator"
          aria-orientation="vertical"
          title="拖动调整宽度"
          onPointerDown={onResizeStart}
          className="no-drag absolute inset-y-0 right-0 z-20 w-1.5 translate-x-1/2 cursor-col-resize select-none group"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-brand/50"
          />
        </div>
      )}
    </div>
  );
}
