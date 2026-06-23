---
project_name: 'mclaw'
user_name: 'Daodao'
date: '2026-06-21'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
rule_count: 35
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| 层 | 技术 | 版本 |
|---|------|------|
| 桌面端框架 | React + Electron | React 19.2 / Electron 40.6 |
| Web 端框架 | React + Vite | React 19.2 / Vite 7.3 |
| 后端 | Go | 1.22+ |
| 语言 | TypeScript / Go | TS 5.9 (strict) |
| 样式 | Tailwind + shadcn/ui | Tailwind 3.4 |
| 状态管理 | zustand | 5.0 |
| 图标 | lucide-react | 0.563 |
| 国际化 | i18next | 25.8 |
| 包管理 | pnpm workspace | 10.33 |
| 测试 | Vitest + Playwright | Vitest 4.0 / Playwright 1.56 |

**关键依赖锁定：**
- `openclaw` 2026.5.20（上游固定版本）
- `electron-builder` 26.8
- `sharp` 0.34（需 native 编译）

**Monorepo 结构：**
```
mclaw/
├── src/              # Electron 桌面端（主进程 + 渲染进程）
├── electron/         # Electron 主进程代码
├── apps/web/         # Web 端独立应用
├── packages/shared/  # 共享组件/i18n/类型
├── packages/cli/     # CLI 工具
├── backend/          # Go 后端
└── harness/          # 测试 harness
```

## Critical Implementation Rules

### Language-Specific Rules

**TypeScript（前端两套 + Electron）：**
- `strict: true`，`noUnusedLocals`、`noUnusedParameters` 全开
- `moduleResolution: "bundler"`，`isolatedModules: true`
- 禁止 `any`，用 `unknown` + 类型守卫
- 禁止 `const enum`（isolatedModules 不兼容）
- 路径别名：`@/` → src，`@electron/` → electron，`@shared/` → shared
- import 带 `.ts`/`.tsx` 后缀允许（`allowImportingTsExtensions`）

**Go（后端）：**
- 标准库优先，减少外部依赖
- 错误必须显式处理（`if err != nil`），不能忽略
- 并发用 goroutine + channel，context 传递取消信号
- 命名：exported 首字母大写，包名短小无下划线
- `gofmt` + `go vet` 标准检查

### Framework-Specific Rules

**React：**
- shadcn/ui 基础组件在 `src/components/ui/`，禁止直接修改源码
- 页面组件在 `src/pages/<PageName>/index.tsx`
- 自定义 hooks 在 `src/hooks/`
- zustand store 在 `src/stores/`，按功能拆分
- 禁止在循环/条件里调用 hooks

**样式：**
- Tailwind class 为主，禁止内联 style
- 用 `cn()` 工具（clsx + tailwind-merge）合并 class
- shadcn 语义 token（primary/secondary/destructive）直接用
- mclaw 私有 token：`brand`、`skill`、`surface` 命名空间
- dark mode 用 `dark:` 前缀 + `class` 策略（不是 `prefers-color-scheme`）
- CSS 变量在 `globals.css` 定义，不要在组件里硬编码

**图标：**
- 统一用 lucide-react
- 禁止用 emoji 当功能图标（设计规范明确禁止）

**路由：**
- react-router-dom v7
- 条件侧栏：仅 `/` 路由显示 Chat 侧栏

### Testing Rules

- 单元测试：Vitest + @testing-library/react，文件在 `tests/unit/*.test.ts(x)`
- E2E：Playwright，`pnpm test:e2e`（先构建再跑）
- 测试环境：jsdom，setup 文件 `tests/setup.ts`
- Go 后端：`go test ./...`，表驱动测试优先

### Code Quality & Style Rules

- `pnpm lint` 自动修复，`pnpm lint:check` 仅检查
- 组件文件 PascalCase，工具/hook 文件 camelCase
- Go 文件 snake_case
- 复杂逻辑留简洁注释，不写废话

### Development Workflow Rules

- 主分支 `main`，开发分支 `dev`
- 提交信息：Conventional Commits（`feat:`、`fix:`、`refactor:`）
- `pnpm dev` 启动桌面端，`pnpm dev:web` 仅启动 Web 端
- `pnpm build` 完整构建（含 Electron 打包）
- `pnpm typecheck` 全量类型检查

### Critical Don't-Miss Rules

**❌ 禁止：**
- 用 emoji 当功能图标
- 绕开 shadcn 语义 token 自定义颜色
- TypeScript 里用 `any`
- 在循环/条件里调用 hooks
- 用 `const enum`
- 直接修改 shadcn/ui 组件源码

**⚠️ 易踩的坑：**
- Electron 和 Web 共享代码时注意 `window.electron` 是否存在
- dark mode 用 `class` 策略，不是 `prefers-color-scheme`
- shadcn 组件的 CSS 变量在 `globals.css` 定义，不要在组件里硬编码
- Go 后端错误必须显式处理，不能忽略
- brand 色 `#EE7C4B` 不随主题变化，始终是暖珊瑚橙

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-06-21
