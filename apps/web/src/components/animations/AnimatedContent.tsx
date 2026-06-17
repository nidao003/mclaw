import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

// 滚动/入视入场包装 —— 借鉴 react-bits AnimatedContent，但原版用 gsap+ScrollTrigger（重依赖）
// 这里用 framer-motion whileInView 重写，零重依赖；统一全站入场动效语言
interface AnimatedContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  duration?: number;
  delay?: number;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  /** 是否只播一次，默认 true */
  once?: boolean;
  ease?: number[] | string;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  distance = 24,
  direction = 'vertical',
  reverse = false,
  duration = 0.6,
  delay = 0,
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.15,
  once = true,
  ease = [0.22, 1, 0.36, 1],
  className = '',
  ...props
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  const axis = direction === 'horizontal' ? 'x' : 'y';
  const offset = reverse ? -distance : distance;

  const variants: Variants = {
    hidden: {
      [axis]: offset,
      scale,
      opacity: animateOpacity ? initialOpacity : 1,
    },
    visible: {
      [axis]: 0,
      scale: 1,
      opacity: 1,
      transition: { duration, delay, ease },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: `0px 0px -${threshold * 100}% 0px` }}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedContent;

// FadeContent：纯淡入变体（无位移），复用同一文件
export const FadeContent: React.FC<Omit<AnimatedContentProps, 'distance' | 'direction' | 'reverse' | 'scale'>> = ({
  distance: _d,
  direction: _dir,
  reverse: _r,
  scale: _s,
  ...rest
}) => <AnimatedContent distance={0} {...rest} />;
