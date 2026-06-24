# mclaw 文档索引

> 按场景/症状/目录组织的完整文档索引

---

## 设计规范（UI 开发必读）

| 文档 | 用途 |
|------|------|
| docs/DESIGN.md | 设计源头（QClaw 反向工程） |
| docs/design-spec.md | mclaw 实际落地规范 |
| docs/skills-hub-DESIGN.md | Skills Hub Web 专门规范 |

### 快速定位

- 品牌色/token/圆角/阴影 → docs/design-spec.md
- 布局/侧栏/响应式 → docs/DESIGN.md
- Web 技能市场 UI → docs/skills-hub-DESIGN.md

---

## 项目结构

| 目录 | 说明 |
|------|------|
| src/components/ui/ | 基础组件 |
| src/components/layout/ | MainLayout / Sidebar |
| src/pages/ | 路由页面 |
| src/stores/ | zustand 状态 |
| src/hooks/ | 自定义 hooks |
| src/lib/ | 工具函数 |
| src/i18n/ | 国际化配置 |
| shared/i18n/locales/ | 翻译文件 |

---

## 知识库

| 文档 | 内容 |
|------|------|
| docs/changelog.md | 修改记录（按日期倒序） |
| docs/knowledge/skills-hub-distribution.md | Skills Hub 分发系统 |
| docs/knowledge/cloud-model-llmproxy-forwarding-2026-06-24.md | 云端模型走后端 llmproxy 转发+计费排查经验（5 个坑 + 教训汇总） |
| docs/deploy.md | 部署文档 |
| docs/dev-workflow.md | 开发工作流 |
| docs/project-restructure-plan.md | 项目重构计划 |

---

## 按场景查找

### 新增/修改 UI 组件
1. docs/design-spec.md（品牌色/圆角/阴影）
2. docs/DESIGN.md（布局/响应式）

### 新增路由/菜单
- 路由定义：src/App.tsx
- 菜单文案：shared/i18n/locales/zh/common.json → sidebar.*

### 国际化
- 配置：src/i18n/
- 翻译：shared/i18n/locales/{zh,en}/

### 状态管理
- zustand stores：src/stores/

### 部署相关
- docs/deploy.md
- 测试服务器：[REDACTED] (root/[REDACTED])

---

## 按症状查找

### 样式不生效
- 检查 Tailwind 配置：tailwind.config.js
- 检查 CSS 变量：src/styles/globals.css

### 类型报错
- 运行 pnpm typecheck
- 检查 tsconfig.web.json

### 路由 404
- 检查 src/App.tsx 路由定义

### 国际化缺失
- 检查 shared/i18n/locales/ 下对应 JSON

---

## 技术决策记录

| 决策 | 文件 |
|------|------|
| React 19 + Vite 7 | package.json |
| Tailwind 3 + shadcn | tailwind.config.js |
| TypeScript strict | tsconfig.web.json |
| zustand 状态管理 | src/stores/ |
| i18next 国际化 | src/i18n/ |

---

## 参考设计图

- 对话页：docs/projects/assets/image_20260609123715926.png
- 专家页：docs/projects/assets/image_20260609123721006.png

---

## Memory 文件

项目记忆存储在 ~/.claude/projects/.../memory/ 下，包含：

- mclaw-config-paths：配置路径
- mclaw-rebranding：改名策略
- mclaw-minimax-provider：MiniMax 配置
- mclaw-restructure-progress：重构进度
- skills-hub-design：Skills Hub 设计
- openclaw-desktop-design：桌面设计规范
- test-server：测试服务器信息

---

*最后更新：2026-06-21*
