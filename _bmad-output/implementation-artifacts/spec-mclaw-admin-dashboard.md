---
title: 'mclaw 管理后台对齐 + 客户端模型配置'
type: 'feature'
created: '2026-06-21'
status: 'done'
baseline_commit: '12078b71b7d2a4173ce2f7882d39d483f470b8a1'
context:
  - '/Volumes/nidao003/Mactext/ooh/ooh-stationmatch/MonkeyCode/frontend/src/pages/console/manager/overview.tsx'
  - '/Volumes/nidao003/Mactext/ooh/ooh-stationmatch/MonkeyCode/frontend/src/pages/console/manager/models.tsx'
  - '/Volumes/nidao003/Mactext/ooh/ooh-stationmatch/MonkeyCode/frontend/src/pages/console/manager/members.tsx'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** mclaw Web 前端管理后台只有技能审核和基础用户管理，缺少概览仪表盘、模型管理、用户增强（会员等级/token用量/接口调用量）。mclaw 客户端登录后无法显示云端模型配置。

**Approach:** 参考 MonkeyCode 管理端页面，将概览仪表盘、模型管理、用户增强功能复制到 mclaw Web 前端。利用已有 Go 后端 API（/api/v1/teams/dashboard, /api/v1/teams/models, /api/v1/teams/users），在前端新增对应页面和组件。

## Boundaries & Constraints

**Always:**
- 遵循 mclaw 设计规范（docs/design-spec.md）：暖奶油画布 + 地铁橙 #EE7C4B
- 使用 @shared 包的 API 客户端、hooks、stores
- 使用 lucide-react 图标，禁止 emoji
- Tailwind class 为主，禁止内联 style
- shadcn/ui 组件在 src/components/ui/，不修改源码

**Ask First:**
- 如果 Go 后端 API 返回格式与 MonkeyCode 前端期望不一致，暂停确认
- 如果需要新增 Go 后端 API（如管理员专用的用户统计接口），暂停确认

**Never:**
- 不修改 Go 后端代码（本次只做前端）
- 不修改 @shared 包的已有 API/hooks/stores（只新增）
- 不硬编码颜色值，使用 CSS 变量和 Tailwind token

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 管理员登录后访问 /admin | 已登录 + admin/super_admin 角色 | 显示管理后台，包含概览/技能审核/用户管理/模型管理导航 | 非管理员显示无权限提示 |
| 概览页加载 | 管理员访问 /admin/overview | 显示任务统计卡片、趋势图表、洞察表格 | 加载中显示 Spinner，错误显示 toast |
| 模型列表加载 | 管理员访问 /admin/models | 显示已配置的 AI 模型列表，支持添加/编辑/删除/健康检查 | 空列表显示引导文案 |
| 用户列表加载 | 管理员访问 /admin/users | 显示用户列表，含会员等级、token用量、接口调用量 | 分页加载，空列表显示提示 |
| 非管理员访问管理页 | 普通用户访问 /admin/* | 显示"无权限访问"页面，引导返回 | 不泄露任何管理数据 |

</frozen-after-approval>

## Code Map

- `apps/web/src/pages/Admin/index.tsx` -- 管理后台布局，需要新增导航项（概览、模型管理）
- `apps/web/src/pages/Admin/Users.tsx` -- 用户管理页，需要增强列（会员等级、token用量、调用量）
- `apps/web/src/App.tsx` -- 路由配置，需要新增 /admin/overview 和 /admin/models 路由
- `packages/shared/src/api/` -- 需要新增 teamApi（对接 /api/v1/teams/* 系列接口）
- `packages/shared/src/types/` -- 需要新增 team 相关类型定义
- `packages/shared/src/hooks/` -- 需要新增 useTeamDashboard、useTeamModels hooks
- `packages/shared/src/stores/` -- 可能需要新增 team store

## Tasks & Acceptance

**Execution:**
- [x] `packages/shared/src/types/team.ts` -- 新增 team 相关类型（TeamDashboardResp、TeamModel、TeamMember 等）
- [x] `packages/shared/src/api/team.ts` -- 新增 teamApi（dashboard、models、users 系列接口）
- [x] `packages/shared/src/hooks/useTeamDashboard.ts` -- 新增概览数据 hook
- [x] `packages/shared/src/hooks/useTeamModels.ts` -- 新增模型管理 hook
- [x] `packages/shared/src/api/index.ts` -- 导出 teamApi
- [x] `packages/shared/src/types/index.ts` -- 导出 team 类型
- [x] `packages/shared/src/hooks/index.ts` -- 导出新 hooks
- [x] `apps/web/src/pages/Admin/Overview.tsx` -- 新增概览仪表盘页面（参考 MonkeyCode overview.tsx）
- [x] `apps/web/src/pages/Admin/Models.tsx` -- 新增模型管理页面（参考 MonkeyCode models.tsx）
- [x] `apps/web/src/pages/Admin/index.tsx` -- 更新管理后台布局，新增导航项
- [x] `apps/web/src/pages/Admin/Users.tsx` -- 增强用户管理，新增会员等级/token用量/调用量列
- [x] `apps/web/src/App.tsx` -- 新增 /admin/overview 和 /admin/models 路由
- [x] `apps/web/src/pages/Settings/index.tsx` -- 在设置页新增"云端模型"导航项
- [x] `apps/web/src/pages/Settings/Models.tsx` -- 新增云端模型配置页面（只读，显示团队已配置的模型）

**Acceptance Criteria:**
- Given 管理员已登录, when 访问 /admin/overview, then 显示任务统计卡片和趋势图表
- Given 管理员已登录, when 访问 /admin/models, then 显示模型列表，支持添加/编辑/删除/健康检查
- Given 管理员已登录, when 访问 /admin/users, then 显示用户列表含会员等级、token用量、接口调用量
- Given 普通用户已登录, when 访问 /admin/*, then 显示无权限提示
- Given 用户已登录, when 访问 /settings 并点击"云端模型", then 显示团队已配置的模型列表

## Verification

**Commands:**
- `pnpm typecheck:web` -- expected: 无类型错误
- `pnpm lint` -- expected: 无 lint 错误

**Manual checks:**
- 以管理员账号登录，访问 /admin/overview，确认显示概览数据
- 以管理员账号登录，访问 /admin/models，确认模型 CRUD 和健康检查正常
- 以管理员账号登录，访问 /admin/users，确认用户列表包含新列
- 以普通用户账号登录，访问 /admin/*，确认显示无权限提示
- 以任意用户登录，访问设置页，确认"云端模型"导航项可见且页面正常

## Suggested Review Order

**类型定义 + API 客户端**

- Team 类型定义，对齐 Go 后端 domain 结构
  [`team.ts`](../../packages/shared/src/types/team.ts)

- Team API 客户端，对接 /api/v1/teams/* 系列接口
  [`team.ts`](../../packages/shared/src/api/team.ts)

- 导出新增的 teamApi 和 team 类型
  [`api/index.ts`](../../packages/shared/src/api/index.ts)
  [`types/index.ts`](../../packages/shared/src/types/index.ts)
  [`hooks/index.ts`](../../packages/shared/src/hooks/index.ts)

**Hooks**

- 概览数据 hook，封装 dashboard API 调用和时间范围状态
  [`useTeamDashboard.ts`](../../packages/shared/src/hooks/useTeamDashboard.ts)

- 模型管理 hook，封装 CRUD + 健康检查，API 先 state 后更新模式
  [`useTeamModels.ts`](../../packages/shared/src/hooks/useTeamModels.ts)

**管理后台页面**

- 概览仪表盘，recharts 趋势图 + 指标卡片 + 洞察表格
  [`Overview.tsx`](../../apps/web/src/pages/Admin/Overview.tsx)

- 模型管理页，内联表单添加/编辑，菜单操作删除/检查
  [`Models.tsx`](../../apps/web/src/pages/Admin/Models.tsx)

- 用户管理增强，新增会员等级/token 用量/接口调用列
  [`Users.tsx`](../../apps/web/src/pages/Admin/Users.tsx)

- 管理后台布局，新增概览和模型管理导航项
  [`index.tsx`](../../apps/web/src/pages/Admin/index.tsx)

**路由 + 设置页**

- 路由配置，新增 /admin/overview、/admin/models、/settings/models
  [`App.tsx`](../../apps/web/src/App.tsx)

- 设置页导航，新增"云端模型"菜单项
  [`Settings/index.tsx`](../../apps/web/src/pages/Settings/index.tsx)

- 云端模型只读页，显示团队已配置的模型列表
  [`Settings/Models.tsx`](../../apps/web/src/pages/Settings/Models.tsx)
