/**
 * vite 构建期通过 `define` 注入主进程的全局常量（见 vite.config.ts 主进程 entry）。
 * 主进程为 CJS 输出、import.meta.env 不可用，故用 define 全局常量替代；
 * 值与渲染进程的 `import.meta.env.VITE_LLMPROXY_BASE_URL` 同源（都从 .env 读取）。
 */
declare const __MCLAW_LLMPROXY_BASE_URL__: string;
