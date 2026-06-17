/** 工具函数 —— 格式化、转换等杂活 */

// 金额：分 → 元，保留两位小数
export function formatPrice(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

// 数字缩写: 1234 → "1.2k"
export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// 星级评分: 4.5 → "★★★★☆"
export function formatStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
}

// 时间格式化: ISO → "2024-01-15"
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Token 数量缩写
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
