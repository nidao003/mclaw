/** 技能相关类型定义 —— 跟 Go 后端 domain/skill.go 对齐，别tm乱改 */

// 技能状态 (V2 expanded)
export type SkillStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'archived'
  | 'disabled'
  | 'rejected';

// 来源类型 (V2)
export type SourceType = 'official' | 'third_party';

// 审核状态
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// 排序方式
export type SortBy = 'rating' | 'installs' | 'newest';

// 技能详情
export interface SkillDetail {
  id: string;
  author_id: string;
  name: string;
  skill_id: string;
  description: string;
  categories: string[];
  tags: string[];
  icon: string;
  content?: string;
  args_schema?: Record<string, unknown>;
  status: SkillStatus;
  install_count: number;
  rating_avg: number;
  rating_count: number;
  versions?: SkillVersionDetail[];
  created_at: string;
  updated_at: string;
  // V2 new fields
  source_type: SourceType;
  icon_name?: string;
  summary?: string;
  minio_path?: string;
  npm_publish_status?: string;
  file_count?: number;
  total_size?: number;
}

// 技能版本
export interface SkillVersionDetail {
  id: string;
  version: string;
  content?: string;
  changelog: string;
  created_at: string;
}

// 技能评分
export interface SkillRating {
  id: string;
  skill_id: string;
  user_id: string;
  score: number; // 1-5
  comment: string;
  created_at: string;
}

// 分页游标
export interface CursorPage {
  next_cursor: string;
  has_more: boolean;
  total: number;
}

// 列表请求
export interface ListSkillReq {
  cursor?: string;
  limit?: number;
  search?: string;
  category?: string;
  sort_by?: SortBy;
  author_id?: string;
  source_type?: SourceType;
}

// 列表响应
export interface ListSkillResp {
  skills: SkillDetail[];
  page?: CursorPage;
}

// 创建技能请求
export interface CreateSkillReq {
  name: string;
  skill_id: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  icon?: string;
  content?: string;
  args_schema?: Record<string, unknown>;
}

// 更新技能请求
export interface UpdateSkillReq {
  name?: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  icon?: string;
  content?: string;
  args_schema?: Record<string, unknown>;
}

// 发布版本请求
export interface PublishVersionReq {
  version: string;
  content?: string;
  changelog?: string;
}

// 评分请求
export interface RateSkillReq {
  score: number; // 1-5
  comment?: string;
}

// 管理员审核请求
export interface AdminReviewSkillReq {
  status: 'approved' | 'rejected';
  comment?: string;
}
