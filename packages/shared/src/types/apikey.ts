/** API Key 相关类型 —— 跟 Go 后端 domain/apikey.go 对齐 */

// API Key 详情（不含明文 key）
export interface ApiKeyDetail {
  id: string;
  user_id: string;
  key_prefix: string; // "mclaw_a1b2..." 前 16 位
  name: string;
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

// 创建 API Key 请求
export interface CreateApiKeyReq {
  name: string;
  expires_at?: string;
}

// 创建 API Key 响应（含明文 key，仅此一次）
export interface CreateApiKeyResp {
  key: string; // plaintext
  detail: ApiKeyDetail;
}

// API Key 列表响应
export interface ListApiKeyResp {
  keys: ApiKeyDetail[];
}
