import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// SB 工具函数 —— cn 合并 Tailwind 类名，别tm手写 clsx + twMerge 了
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
