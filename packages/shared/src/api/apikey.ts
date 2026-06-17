/**
 * API Key 管理 API 客户端
 * 对接 Go 后端 /api/v1/user/api-keys
 */

import { apiRequest } from './client';
import type { CreateApiKeyReq, CreateApiKeyResp, ListApiKeyResp } from '../types/apikey';

export const apiKeyApi = {
  /** 列出当前用户的所有 API keys */
  list() {
    return apiRequest<ListApiKeyResp>('/api/v1/user/api-keys');
  },

  /** 创建新的 API key（返回完整明文，仅此一次） */
  create(req: CreateApiKeyReq) {
    return apiRequest<CreateApiKeyResp>('/api/v1/user/api-keys', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** 吊销一个 API key */
  revoke(id: string) {
    return apiRequest<null>(`/api/v1/user/api-keys/${id}`, {
      method: 'DELETE',
    });
  },
};
