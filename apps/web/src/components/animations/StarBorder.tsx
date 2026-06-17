import React from 'react';

// 边框星轨流光 —— 借鉴 react-bits StarBorder
// 改造：原版硬编码黑底渐变按钮内容，这里只输出「流光边框层」，children 由调用方自定义（套到 skillhub 黑胶囊 CTA 上）
// keyframes 见 globals.css (.animate-star-movement-top/bottom)
type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T;
  className?: string;
  children?: React.ReactNode;
  color?: string;
  speed?: React.CSSProperties['animationDuration'];
  thickness?: number;
  /** 内层填充类名，默认透明（让流光边框透出来） */
  innerClassName?: string;
};

const StarBorder = <T extends React.ElementType = 'div'>({
  as,
  className = '',
  color = '#3957FF',
  speed = '6s',
  thickness = 1,
  innerClassName = 'bg-skillhub-black',
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = (as || 'div') as React.ElementType;

  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-full ${className}`}
      {...(rest as any)}
      style={{
        padding: `${thickness}px`,
        ...(rest as any).style,
      }}
    >
      <div
        className="animate-star-movement-bottom absolute bottom-[-11px] right-[-250%] z-0 h-[50%] w-[300%] rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="animate-star-movement-top absolute left-[-250%] top-[-10px] z-0 h-[50%] w-[300%] rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div className={`relative z-[1] rounded-full ${innerClassName}`}>{children}</div>
    </Component>
  );
};

export default StarBorder;
