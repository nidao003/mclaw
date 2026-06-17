/** 专家相关类型 —— 地铁资源经营行业专家 */

// 专家信息
export interface Expert {
  id: string;               // UUID
  slug: string;
  name: string;
  subtitle: string;         // 一句话定位
  description: string;      // 详细介绍
  icon: string;             // lucide-react icon name
  scenarios: string[];      // 适用场景
  related_skills: string[]; // 相关技能 slug（对齐后端 JSON tag）
  status?: string;          // 状态（draft/published/archived）
  sort_order?: number;      // 显示排序
}
