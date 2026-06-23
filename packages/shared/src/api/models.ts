/**
 * mclaw 后端"账号绑定的云端模型"API 客户端
 * 对接 Go 后端 user 模块的 Model API (backend/biz/setting/handler/v1/model.go)
 */

import { apiRequest } from './client';
import type {
  Model,
  ListModelResp,
  CreateModelReq,
  UpdateModelReq,
  GetProviderModelListReq,
  GetProviderModelListResp,
} from '../types/model';

export const modelsApi = {
  /**
   * 获取模型列表 (GET /api/v1/users/models)
   */
  list(params?: { cursor?: string; limit?: number }): Promise<ListModelResp> {
    return apiRequest<ListModelResp>('/api/v1/users/models', {
      params: params?.cursor ? { cursor: params.cursor, limit: String(params.limit ?? 20) } : undefined,
    });
  },

  /**
   * 获取单个模型配置 (GET /api/v1/users/models/:id)
   * 后端 handler 暂未实现此端点，但前端封装先写好以备未来
   */
  get(id: string): Promise<Model> {
    return apiRequest<Model>(`/api/v1/users/models/${encodeURIComponent(id)}`);
  },

  /**
   * 创建模型配置 (POST /api/v1/users/models)
   */
  create(req: CreateModelReq): Promise<Model> {
    return apiRequest<Model>('/api/v1/users/models', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /**
   * 更新模型配置 (PUT /api/v1/users/models/:id)
   * 注意：UpdateModelReq 已经有 id 字段，body 内显式省略 id 字段以避免重复
   */
  update(id: string, req: UpdateModelReq): Promise<void> {
    // 显式排除 id 字段，避免 body 内重复
    const { id: _reqId, ...bodyWithoutId } = req as { id?: string };
    return apiRequest<void>(`/api/v1/users/models/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(bodyWithoutId),
    });
  },

  /**
   * 删除模型配置 (DELETE /api/v1/users/models/:id)
   */
  remove(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/users/models/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /**
   * 设置默认模型 (PUT /api/v1/users/models/:id，body 内设置 is_default: true)
   * 复用 update 方法
   */
  setDefault(id: string): Promise<void> {
    return modelsApi.update(id, { id, is_default: true } as UpdateModelReq);
  },

  /**
   * 获取供应商模型列表 (GET /api/v1/users/models/providers)
   */
  listProviderModels(req: GetProviderModelListReq): Promise<GetProviderModelListResp> {
    return apiRequest<GetProviderModelListResp>('/api/v1/users/models/providers', {
      params: {
        provider: req.provider,
        base_url: req.base_url,
        api_key: req.api_key,
        ...(req.api_header ? { api_header: req.api_header } : {}),
      },
    });
  },

  /**
   * 通过模型 ID 检查健康状态 (GET /api/v1/users/models/:id/health-check)
   */
  checkById(id: string): Promise<{ success: boolean; error?: string }> {
    return apiRequest<{ success: boolean; error?: string }>(
      `/api/v1/users/models/${encodeURIComponent(id)}/health-check`,
    );
  },

  /**
   * 通过配置检查健康状态 (POST /api/v1/users/models/health-check)
   */
  checkByConfig(req: {
    provider: string;
    base_url: string;
    api_key: string;
    interface_type?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return apiRequest<{ success: boolean; error?: string }>('/api/v1/users/models/health-check', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};

// 导出类型以便调用方使用
export type { Model, ListModelResp, CreateModelReq, UpdateModelReq, GetProviderModelListReq, GetProviderModelListResp };