import { useState, useCallback } from 'react';

// 鼠标聚光灯 hook —— 纯 React 零依赖，任何元素（含 Link）都能用
// SpotlightCard 组件和 SkillCard 共用此逻辑，避免重复（DRY）
interface Position {
  x: number;
  y: number;
}

export interface SpotlightResult {
  position: Position;
  opacity: number;
  /** 贴到聚光层 div 的 style */
  layerStyle: React.CSSProperties;
  /** 展开到宿主元素的鼠标事件 */
  bind: {
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

export function useSpotlight(spotlightColor = 'rgba(57, 87, 255, 0.12)'): SpotlightResult {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const onMouseEnter = useCallback(() => setOpacity(0.6), []);
  const onMouseLeave = useCallback(() => setOpacity(0), []);

  const layerStyle: React.CSSProperties = {
    opacity,
    background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
  };

  return { position, opacity, layerStyle, bind: { onMouseMove, onMouseEnter, onMouseLeave } };
}
