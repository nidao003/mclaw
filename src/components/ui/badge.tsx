/* eslint-disable react-refresh/only-export-components */
/**
 * Badge Component
 * Based on shadcn/ui badge — new-york style
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-sm',
        outline: 'text-foreground',
        success:
          'border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100',
        warning:
          'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100',
        // 品牌橙变体 — 设计图"赚积分"等小标签用
        brand:
          'border-transparent bg-brand/15 text-brand-hover dark:bg-brand/20 dark:text-brand-hover',
        // 柔和品牌色（更淡的背景）
        'brand-soft':
          'border border-brand/25 bg-brand/8 text-brand-hover dark:bg-brand/12 dark:text-brand-hover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
