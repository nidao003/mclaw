import React, { PropsWithChildren } from 'react';
import { useSpotlight } from './useSpotlight';

// 鼠标聚光灯卡片 —— 借鉴 react-bits SpotlightCard，纯 React 零依赖
// 改造：暗底 → 白底 + 细线（skillhub 白画布）；聚光色默认蓝；放 shared 供桌面端 + web 复用
interface SpotlightCardProps extends PropsWithChildren {
  className?: string;
  spotlightColor?: `rgba(${number}, ${number}, ${number}, ${number})`;
  surfaceClassName?: string;
}

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(57, 87, 255, 0.12)',
  surfaceClassName = 'bg-white border border-black/[0.06]',
}: SpotlightCardProps) {
  const { layerStyle, bind } = useSpotlight(spotlightColor);

  return (
    <div
      {...bind}
      className={`relative overflow-hidden ${surfaceClassName} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-in-out"
        style={layerStyle}
      />
      {children}
    </div>
  );
}

export default SpotlightCard;
