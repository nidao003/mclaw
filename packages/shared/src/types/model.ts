/**
 * mclaw 桌面端"账号绑定的云端模型"类型定义
 * 对接后端 Model API (backend/domain/model.go)
 */

// 接口类型
export type InterfaceType = 'openai_chat' | 'openai_responses' | 'anthropic';

// 模型拥有者
export interface ModelOwner {
  id: string;
  type: string;
  name?: string;
}

// 模型配置完整类型
export interface Model {
  id: string;
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  remark: string;
  temperature: number;
  is_default: boolean;
  created_at: number;
  updated_at: number;
  weight: number;
  owner?: ModelOwner;
  interface_type: InterfaceType;
  is_free: boolean;
  access_level: string;
  last_check_at: number;
  last_check_success: boolean;
  last_check_error: string;
  thinking_enabled: boolean;
  support_image: boolean;
  is_hidden: boolean;
  context_limit: number;
  output_limit: number;
}

// 模型配置简略类型（不含敏感字段）
export interface ModelBrief {
  id: string;
  provider: string;
  model: string;
  remark: string;
  temperature: number;
  created_at: number;
  updated_at: number;
  weight: number;
  owner?: ModelOwner;
  interface_type: InterfaceType;
  is_free: boolean;
  access_level: string;
  last_check_at: number;
  last_check_success: boolean;
  last_check_error: string;
  thinking_enabled: boolean;
  support_image: boolean;
  is_hidden: boolean;
  context_limit: number;
  output_limit: number;
}

// 获取模型列表响应
export interface ListModelResp {
  models: Model[];
  page:
    | {
        cursor?: string;
        has_more?: boolean;
      }
    | null;
}

// 创建模型配置请求
export interface CreateModelReq {
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  interface_type: InterfaceType;
  remark?: string;
  temperature?: number;
  is_default?: boolean;
  thinking_enabled?: boolean;
  support_image?: boolean;
  is_hidden?: boolean;
  context_limit?: number;
  output_limit?: number;
}

// 更新模型配置请求
export interface UpdateModelReq {
  id: string;
  provider?: string;
  api_key?: string;
  base_url?: string;
  model?: string;
  remark?: string;
  temperature?: number;
  is_default?: boolean;
  interface_type?: InterfaceType;
  thinking_enabled?: boolean;
  support_image?: boolean;
  is_hidden?: boolean;
  context_limit?: number;
  output_limit?: number;
}

// 获取供应商模型列表请求
export interface GetProviderModelListReq {
  provider: string;
  base_url: string;
  api_key: string;
  api_header?: string;
}

// 获取供应商模型列表响应
export interface GetProviderModelListResp {
  models: Array<{ model: string }>;
  error?: {
    message: string;
    type: string;
  };
}