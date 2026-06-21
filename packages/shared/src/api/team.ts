/**
 * Team 管理 API 客户端
 * 对接 Go 后端 /api/v1/teams/* 系列接口
 * 需要 Team Admin 权限（session cookie）
 */

import { apiRequest } from './client';
import type {
  TeamDashboardReq,
  TeamDashboardResp,
  TeamModel,
  AddTeamModelReq,
  UpdateTeamModelReq,
  CheckModelResp,
  CheckByConfigReq,
  ListTeamModelsResp,
  MemberListResp,
  MemberListReq,
  TeamGroup,
} from '../types/team';

export const teamApi = {
  // ── Dashboard ──────────────────────────────────────

  /** 团队管理概览 */
  dashboard(req?: TeamDashboardReq) {
    return apiRequest<TeamDashboardResp>('/api/v1/teams/dashboard', {
      params: req as Record<string, string>,
    });
  },

  // ── 模型管理 ───────────────────────────────────────

  /** 团队模型列表 */
  listModels() {
    return apiRequest<ListTeamModelsResp>('/api/v1/teams/models');
  },

  /** 添加团队模型 */
  addModel(req: AddTeamModelReq) {
    return apiRequest<TeamModel>('/api/v1/teams/models', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** 更新团队模型 */
  updateModel(modelId: string, req: UpdateTeamModelReq) {
    return apiRequest<TeamModel>(`/api/v1/teams/models/${modelId}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  },

  /** 删除团队模型 */
  deleteModel(modelId: string) {
    return apiRequest<null>(`/api/v1/teams/models/${modelId}`, {
      method: 'DELETE',
    });
  },

  /** 健康检查（通过 ID） */
  checkModel(modelId: string) {
    return apiRequest<CheckModelResp>(`/api/v1/teams/models/${modelId}/health-check`);
  },

  /** 健康检查（通过配置） */
  checkModelByConfig(req: CheckByConfigReq) {
    return apiRequest<CheckModelResp>('/api/v1/teams/models/health-check', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // ── 成员管理 ───────────────────────────────────────

  /** 团队成员列表 */
  listMembers(req?: MemberListReq) {
    return apiRequest<MemberListResp>('/api/v1/teams/users', {
      params: req as Record<string, string>,
    });
  },

  // ── 分组管理 ───────────────────────────────────────

  /** 团队分组列表 */
  listGroups() {
    return apiRequest<{ groups: TeamGroup[] }>('/api/v1/teams/groups');
  },
};
