/**
 * 数据 API 文档接口客户端
 * 对接 Go 后端 /api/v1/data/docs（公开免鉴权）
 * 给 Web 端 API 文档页渲染用，别tm乱改字段名
 */

import { apiRequest } from './client';

// 请求参数/响应字段表项
export interface ApiField {
  name?: string;
  field?: string;
  type: string;
  required?: string | boolean;
  desc: string;
  example?: string;
}

// 单个接口文档项
export interface ApiDocItem {
  apiCode: string;
  name: string;
  group: string; // 一级分组，如「车站画像」
  category: string; // 二级分类，如「画像/城市/线路/业态/查询」
  method: string;
  path: string;
  summary: string;
  description: string;
  creditsPerCall: number;
  needApiKey: boolean;
  params: ApiField[];
  responseFields: ApiField[];
  exampleRequest: string;
  exampleResponse: string;
  sortOrder: number;
}

// 二级分类分组
export interface ApiDocSubGroup {
  category: string;
  apis: ApiDocItem[];
}

// 一级分组（含若干二级分类）
export interface ApiDocGroup {
  group: string;
  subGroups: ApiDocSubGroup[];
}

// 文档接口返回
export interface ApiDocsResp {
  baseUrl: string;
  authHeader: string;
  groups: ApiDocGroup[];
}

export const dataDocApi = {
  /** 获取所有数据 API 文档元数据（公开） */
  getDocs() {
    return apiRequest<ApiDocsResp>('/api/v1/data/docs');
  },
};
