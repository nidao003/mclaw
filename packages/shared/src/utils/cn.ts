import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// SB 工具 —— 合并 Tailwind 类名
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
