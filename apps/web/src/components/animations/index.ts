// 动效组件层 —— 借鉴 react-bits，按 mclaw 设计规范改造（配色 token 化 + reduced-motion 降级 + Tailwind v3 兼容）
// 桌面端暂不复用；如需复用再迁移到 packages/shared（需给 shared 加 framer-motion peerDep）
export { default as CountUp } from './CountUp';
export { default as BlurText } from './BlurText';
export { default as GradientText } from './GradientText';
export { default as SpotlightCard } from './SpotlightCard';
export { default as StarBorder } from './StarBorder';
export { default as AnimatedContent, FadeContent } from './AnimatedContent';
