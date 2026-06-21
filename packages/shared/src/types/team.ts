/** Team 管理相关类型 —— 跟 Go 后端 domain/team*.go 对齐 */

// ── 接口类型 ─────────────────────────────────────────
export type InterfaceType = 'openai_chat' | 'openai_responses' | 'anthropic';

// ── 成员角色 ─────────────────────────────────────────
export type TeamMemberRole = 'admin' | 'user';

// ── Dashboard ────────────────────────────────────────

export interface TeamDashboardReq {
  range?: string; // 'today' | '7d' | '30d'
}

export interface TeamDashboardResp {
  range: string;
  start_at: number;
  end_at: number;
  metrics: TeamDashboardMetrics;
  trends: TeamDashboardTrends;
  insights: TeamDashboardInsights;
  project_stats: TeamProjectStats;
  task_stats: TeamTaskStats;
  conversation_stats: TeamConversationStats;
}

export interface TeamDashboardMetrics {
  active_members: number;
  total_members: number;
  active_rate: number;
  task_count: number;
  running_task_count: number;
  finished_task_count: number;
  average_duration: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  total_tokens: number;
  llm_requests: number;
  cache_hit_rate: number;
}

export interface TeamDashboardTrends {
  task_counts: TeamDashboardTrendPoint[];
  active_members: TeamDashboardTrendPoint[];
  token_usage: TeamDashboardTrendPoint[];
}

export interface TeamDashboardTrendPoint {
  date: string;
  value: number;
}

export interface TeamDashboardInsights {
  active_members: TeamDashboardMemberInsight[];
  high_consumption: TeamDashboardConsumptionInsight[];
  long_running_tasks: TeamDashboardTaskInsight[];
}

export interface TeamDashboardMemberInsight {
  user_id: string;
  name: string;
  email: string;
  group_name: string;
  task_count: number;
  last_active_at: number;
}

export interface TeamDashboardConsumptionInsight {
  id: string;
  name: string;
  type: string;
  total_tokens: number;
  llm_requests: number;
  percent: number;
}

export interface TeamDashboardTaskInsight {
  task_id: string;
  title: string;
  creator: string;
  status: string;
  duration: number;
  host_name: string;
  created_at: number;
}

export interface TeamProjectStats {
  total: number;
  active_7d: number;
  active_today: number;
  daily_created: TeamDashboardTrendPoint[];
}

export interface TeamTaskStats {
  total: number;
  active_7d: number;
  active_today: number;
  daily_created: TeamDashboardTrendPoint[];
}

export interface TeamConversationStats {
  total: number;
  count_7d: number;
  count_today: number;
  daily_created: TeamDashboardTrendPoint[];
}

// ── 模型管理 ─────────────────────────────────────────

export interface TeamModel {
  id: string;
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  remark?: string;
  temperature: number;
  interface_type: InterfaceType;
  created_at: number;
  updated_at: number;
  groups: TeamGroup[];
  last_check_at: number;
  last_check_success: boolean;
  last_check_error: string;
  support_image: boolean;
  is_hidden: boolean;
}

export interface AddTeamModelReq {
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  remark?: string;
  temperature?: number;
  group_ids?: string[];
  interface_type: InterfaceType;
  support_image?: boolean;
}

export interface UpdateTeamModelReq {
  provider?: string;
  api_key?: string;
  base_url?: string;
  model?: string;
  remark?: string | null;
  temperature?: number;
  group_ids?: string[];
  interface_type?: InterfaceType;
  support_image?: boolean | null;
}

export interface DeleteTeamModelReq {
  model_id: string;
}

export interface CheckModelResp {
  success: boolean;
  error?: string;
}

export interface CheckByConfigReq {
  api_key: string;
  base_url: string;
  model: string;
  interface_type: InterfaceType;
}

export interface ListTeamModelsResp {
  models: TeamModel[];
}

// ── 分组 ─────────────────────────────────────────────

export interface TeamGroup {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  users?: TeamUserInfo[];
}

// ── 成员 ─────────────────────────────────────────────

export interface TeamUserInfo {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
  created_at: string;
}

export interface TeamMemberInfo {
  user: TeamUserInfo;
  role: TeamMemberRole;
  created_at: number;
  last_active_at: number;
}

export interface MemberListResp {
  members: TeamMemberInfo[];
  member_limit: number;
}

export interface MemberListReq {
  role?: TeamMemberRole;
}
