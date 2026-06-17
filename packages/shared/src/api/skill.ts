/**
 * 技能市场 API 客户端
 * 对接 Go 后端 /api/v1/skills 系列接口
 * 别tm乱改，字段名跟 domain/skill.go 的 json tag 对齐
 */

import { apiRequest } from './client';
import type {
  ListSkillReq,
  ListSkillResp,
  SkillDetail,
  CreateSkillReq,
  UpdateSkillReq,
  PublishVersionReq,
  RateSkillReq,
  SkillRating,
  AdminReviewSkillReq,
} from '../types/skill';

// 公共接口（无需登录）
export const skillApi = {
  /** 技能列表（分页 + 搜索 + 排序） */
  list(req?: ListSkillReq) {
    return apiRequest<ListSkillResp>('/api/v1/skills', {
      params: req as Record<string, string>,
    });
  },

  /** 技能详情（按 UUID） */
  get(id: string) {
    return apiRequest<SkillDetail>(`/api/v1/skills/${id}`);
  },

  /** 技能详情（按 slug，用于 Web 前端路由 /skills/:slug） */
  getBySlug(slug: string) {
    return apiRequest<SkillDetail>(`/api/v1/skills/by-slug/${slug}`);
  },

  /** 技能评分列表 */
  listRatings(id: string, limit = 20) {
    return apiRequest<SkillRating[]>(`/api/v1/skills/${id}/ratings`, {
      params: { limit: String(limit) },
    });
  },

  // 认证接口（需要登录 session）
  /** 创建技能 */
  create(req: CreateSkillReq) {
    return apiRequest<SkillDetail>('/api/v1/skills', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** 更新技能 */
  update(id: string, req: UpdateSkillReq) {
    return apiRequest<SkillDetail>(`/api/v1/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  },

  /** 删除技能 */
  delete(id: string) {
    return apiRequest<null>(`/api/v1/skills/${id}`, {
      method: 'DELETE',
    });
  },

  /** 发布新版本 */
  publishVersion(id: string, req: PublishVersionReq) {
    return apiRequest<null>(`/api/v1/skills/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** 安装（计数器 +1） */
  install(id: string) {
    return apiRequest<null>(`/api/v1/skills/${id}/install`, {
      method: 'POST',
    });
  },

  /** 评分 */
  rate(id: string, req: RateSkillReq) {
    return apiRequest<null>(`/api/v1/skills/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // 管理员接口
  /** 待审核列表 */
  listPending(limit = 20) {
    return apiRequest<SkillDetail[]>('/api/v1/admin/skills/pending', {
      params: { limit: String(limit) },
    });
  },

  /** 审核技能 */
  review(id: string, req: AdminReviewSkillReq) {
    return apiRequest<null>(`/api/v1/admin/skills/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  },
};
