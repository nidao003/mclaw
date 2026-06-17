/** 专家 API —— 从后端 API 读取专家数据 */

import { apiRequest } from './client';
import type { Expert } from '../types/expert';

// 专家列表响应格式（对齐后端 domain.ListExpertResp）
interface ExpertListResponse {
  experts: Expert[];
}

export const expertApi = {
  /** 获取全部专家列表 */
  async list(): Promise<Expert[]> {
    const resp = await apiRequest<ExpertListResponse>('/api/v1/experts');
    return resp.experts ?? [];
  },

  /** 根据 slug 获取专家详情 */
  async getBySlug(slug: string): Promise<Expert | null> {
    try {
      return await apiRequest<Expert>(`/api/v1/experts/${slug}`);
    } catch {
      return null;
    }
  },
};
