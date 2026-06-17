# mclaw 修改记录

> 项目演进时间线。按日期倒序整理关键改动及涉及文件。
> CLAUDE.md 第 8 节仅保留对本文件的索引，详情全部在此。

---

## 2026-06

| 日期 | 改动 | 涉及 |
|------|------|------|
| 2026-06-17 | 数据 API 迁移开发计划：明确本次迁移 Java 11 个数据查询接口（车站5/线路2/业态2/查询2）到 Go 后端 `/api/v1/data/*`，按次计费+ApiKeyAuth鉴权。照搬 Java ooh_data 数据源（mysql 192.168.3.115:3309 yaoyaobot 只读），Go 加 go-sql-driver/mysql+sqlx，新增 biz/data 模块（仿 biz/skill 脚手架）+ data_api_pricing ent表 + ClickHouse data_api_usage_events。labels 接口 DSL 改固定SQL（不迁DSL引擎）。web 在「定价」前加「API 文档」页（仿 RedFox redfox.hk/apis 三栏+标价+Key+状态码），导航 Layout.tsx + 路由 App.tsx。分4阶段：基建→车站画像P0→其余9接口→web页。7项待确认 | 新增 `docs/knowledge/data-api-migration-dev-plan.md` |
| 2026-06-17 | 数据 API 迁移调研：调研 Java 后端（station-match-backend，若依单体 6039）Query Service 数据接口与 mclaw Go 后端能力，拍板方案 B——数据接口全迁 Go 后端、按调用次数计费（credit）。报告含现状对比、B 方案设计（ooh_data MySQL 接入/接口迁移清单/DSL 引擎策略/ApiKeyAuth 鉴权/按次计费扩展/ClickHouse 用量统计）、分 5 阶段迁移路径、6 项待确认。Go 后端已有 wallet/billing/subscription/用量统计/API Key/技能市场基础设施，Java 几乎无计费能力，统一到 Go 一套栈 | 新增 `docs/knowledge/data-api-migration-to-go.md` |
| 2026-06-17 | 管理后台精简 + 上传统一：① 删「概览」菜单项及概览卡片渲染，/admin 重定向到 /admin/skills；② /admin/create 路由组件从 CreateSkill（纯文本手填 Markdown）换成 SkillUpload（ZIP 拖拽上传），管理后台与个人中心「上传技能」复用同一组件、同一 /upload 接口、统一走待审流程；③ 删 CreateSkill.tsx 死代码 | `apps/web/src/pages/Admin/index.tsx`, `apps/web/src/App.tsx`, 删 `Admin/CreateSkill.tsx` |
| 2026-06-17 | 个人中心内容区加统一页面标题（按路由映射个人资料/API密钥/我的技能/上传技能），解决切换左侧菜单时内容区无标题着落感问题；移除 ApiKeys/SkillUpload 重复标题，MySkills 去双重 padding | `apps/web/src/pages/Settings/index.tsx`, `ApiKeys.tsx`, `SkillUpload.tsx`, `MySkills.tsx` |
| 2026-06-17 | 路由归属调整：/my-skills、/skills/upload 从顶层挪进 /settings 子路由（/settings/my-skills、/settings/upload），点击个人中心左侧菜单不再脱离布局导致侧栏消失；同步 MySkills/SkillUpload 内部跳转链接 | `apps/web/src/App.tsx`, `Settings/index.tsx`, `MySkills.tsx`, `SkillUpload.tsx` |
| 2026-06-17 | 管理后台导航从顶部 tab 改为左侧侧边栏（w-44 垂直 nav + 右侧内容区），布局与个人中心对齐 | `apps/web/src/pages/Admin/index.tsx` |
| 2026-06-17 | 侧边栏归位：移除 Layout 全局 WebSidebar，首页/专家/技能热榜/全部技能/定价回归纯落地页（仅顶部导航）；个人中心（/settings）侧栏扩展发布者入口「我的技能」「上传技能」（canPublish 可见），基础「个人资料」「API密钥」不变；删除死代码 WebSidebar.tsx | `apps/web/src/components/layout/Layout.tsx`, `apps/web/src/pages/Settings/index.tsx`, 删 `WebSidebar.tsx` |
| 2026-06-17 | 部署到 133 测试服务器（走公网 [REDACTED]，局域网 [REDACTED] 不通）；仅更新前端方式：本地 `pnpm --filter @mclaw/web build` → tar 打包 dist → scp 上传 → 服务器 `docker compose up -d --build nginx`。注意 compose 会连带重建 backend（依赖配置），无状态重建不影响数据 | `docs/changelog.md` 记录 |
| 2026-06-17 | 部署踩坑：服务器无 alpine/golang 基础镜像缓存，docker hub 国内拉不下来导致 rebuild 失败。绕过方案：`docker cp` 新 dist 进运行中 nginx 容器 + `nginx -s reload` 更新前端。隐患：改 nginx.conf/后端代码时此招不够，需配国内镜像加速器或预拉基础镜像 | `docs/changelog.md` 记录 |
| 2026-06-17 | 全站系统命名统一为「Union 数字化经营系统」：首页 8 处笼统"系统"+ Union3.0 统一改名；并清理 Pricing/SkillsTrending 两处 Union3.0 残留。线上 JS 验证 Union3.0 清零 | `apps/web/src/pages/Home/index.tsx`, `Pricing/index.tsx`, `SkillsTrending/index.tsx` |
| 2026-06-17 | 动效边界确立：BlurText 逐字模糊入场仅保留在 Home 价值主张金句标题（首页门面），Experts/Skills/SkillsTrending/Pricing 等功能页主标题回归纯静态——功能页标题是导语需一眼可读，逐字入场反成干扰 | `apps/web/src/pages/Home/index.tsx` |
| 2026-06-17 | Home 价值主张标题 BlurText 调速：默认 delay 200ms 在 17 字中文长句下末字要等 3.2s，压到 60ms + stepDuration 0.3s，整句落定 3.9s→1.56s | `apps/web/src/pages/Home/index.tsx` |
| 2026-06-17 | 修改记录从 CLAUDE.md 第 8 节拆出独立知识库文档；CLAUDE.md 改为索引 | `docs/changelog.md`, `CLAUDE.md` |
| 2026-06-12 | BindHandler→BaseHandler 修复 + Ent UUID 全链路补齐（skill/review/version）；发布「中文公文 Word 版式」技能 v1.0.0 | `backend/biz/skill/handler/v1/skill.go`, `usecase/skill.go`, `repo/skill.go`, `repo/skill_review.go`, `repo/skill_version.go`, `.claude/skills/chinese-official-word-style/` |
| 2026-06-12 | Skills Hub Web 更新为 skillhub.cn 风格：白色画布、Plus Jakarta Sans + Outfit、蓝色强调、黑色胶囊 CTA、圆形搜索条、纵向技能流；新增 Web 专门规范 | `docs/skills-hub-DESIGN.md`, `docs/design-spec.md`, `apps/web/`, `packages/shared/src/components/` |
| 2026-06-12 | **Skills Hub 开放分发系统**：CLI (`mclaw-skills`)、Registry API (download/manifest)、Web 安装弹窗、SKILL.md 包格式规范 → [知识库](knowledge/skills-hub-distribution.md) | `packages/cli/`, `backend/biz/skill/handler/v1/skill.go`, `apps/web/src/pages/SkillDetail/`, `packages/shared/src/` |
| 2026-06-12 | Skills Hub Web 设计规范全面应用：暖奶油画布 #f7f7f4、Inter + JetBrains Mono、hairline 替代投影、8px CTA 圆角、80px 区块间距 | `apps/web/src/styles/globals.css`, `tailwind.config.js`, `apps/web/index.html`, `packages/shared/src/components/`, `apps/web/src/pages/`, `apps/web/src/components/layout/` |
| 2026-06-11 | API Key 全链路（Ent schema + domain + middleware + handler + Web 管理页） | `backend/ent/schema/user_apikey.go`, `backend/middleware/auth.go`, `apps/web/src/pages/Settings/ApiKeys.tsx` |
| 2026-06-11 | CORS 中间件 + subscriptionStore + 管理后台（Admin/Skills 审核页） | `backend/middleware/cors.go`, `packages/shared/src/stores/`, `apps/web/src/pages/Admin/` |
| 2026-06-11 | Web 页面全量升级（Skills/Detail/Pricing/Login 对接共享组件 + API） | `apps/web/src/pages/` |
| 2026-06-11 | 共享 Hooks + Stores（useSkillList/Detail + useSubscription + useAuth + authStore） | `packages/shared/src/hooks/`, `packages/shared/src/stores/` |
| 2026-06-11 | 共享 UI 组件库（SkillCard/List/Detail/SearchBar + PricingTable + LoginForm/OAuthButtons） | `packages/shared/src/components/` |
| 2026-06-11 | pnpm install 修复（删除 6 个私有频道包） | `package.json` |
| 2026-06-11 | 阶段 2-3：SkillHub Web SPA 骨架 + packages/shared 共享层扩展 | `apps/web/`, `packages/shared/src/` |
| 2026-06-10 | Go 后端迁入（20 个 biz 模块 + 52 个 Ent schema 编译通过） | `backend/` |
| 2026-06-09 | 侧边栏改为三栏固定宽度布局 + 菜单两字命名 | `Sidebar.tsx`, `common.json` |
| 2026-06-09 | 建立设计规范文档 + 项目级 CLAUDE.md | `docs/design-spec.md`, `CLAUDE.md` |
| 2026-06-09 | Chat 欢迎屏加 4 张能力卡片 | `Chat/index.tsx` |
| 2026-06-09 | Windows 标题栏按钮加圆角分组 | `TitleBar.tsx` |
| 2026-06-09 | Card 圆角升级到 16px，Button 升级 + 新增 soft/brand 变体 | `card.tsx`, `button.tsx`, `badge.tsx` |
| 2026-06-09 | 侧边栏从冷蓝灰深色改为温暖奶油浅色 | `tailwind.config.js`, `globals.css`, `Sidebar.tsx`, `MainLayout.tsx` |
