/* eslint-disable react-refresh/only-export-components */
/**
 * Button Component
 * Based on shadcn/ui button — new-york style
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // 圆角从 md(6px) 提到 lg(12px)，更柔和；过渡加入 transform/translate
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        // 主CTA: 橙色渐变（保持主题色不变），hover时更亮
        default: 'bg-gradient-to-r from-[#EE7C4B] to-[#D95A2B] text-primary-foreground hover:from-[#F08B5A] hover:to-[#E36434] shadow-sm hover:shadow-md',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        outline:
          'border border-input bg-background hover:bg-accent/50 hover:text-accent-foreground shadow-sm',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
        ghost: 'hover:bg-accent/50 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // 柔和品牌色变体：橙色浅背景 + 橙色文字，hover 加深
        soft: 'bg-brand/12 text-brand hover:bg-brand/18 dark:bg-brand/15 dark:text-brand-hover dark:hover:bg-brand/22',
        // 描边品牌色
        brand: 'border border-brand/40 text-brand bg-background hover:bg-brand/8 hover:border-brand/60',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        sm: 'h-8 rounded-md px-2.5 text-xs',
        lg: 'h-10 rounded-lg px-5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
