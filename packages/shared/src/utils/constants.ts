/** 常量定义 —— 别tm到处硬编码 */

// 技能状态文案
export const SKILL_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

// 审核状态文案
export const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
};

// 排序选项
export const SORT_OPTIONS = [
  { value: 'newest', label: '最新发布' },
  { value: 'rating', label: '评分最高' },
  { value: 'installs', label: '安装最多' },
] as const;

// 套餐等级顺序 (用于比较权限)
export const PLAN_LEVEL_ORDER: Record<string, number> = {
  basic: 0,
  pro: 1,
  enterprise: 2,
};

// 套餐名称 —— 地铁资源经营行业化
export const PLAN_NAMES: Record<string, string> = {
  basic: '基础版',
  pro: '专业版',
  enterprise: '企业版',
};
