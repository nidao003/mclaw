# Skills Hub 开放分发系统

> 开发日期：2026-06-12
> 版本：v1.0（CLI v1.0.4, Backend v1.0, Web v1.0）

## 一、系统架构

```
用户浏览器 (Skills Hub Web)
  │ 浏览技能 → 看到安装命令 → 复制到终端/AI对话
  ▼
npx mclaw-skills (npm 包, packages/cli/)
  │ Registry / npm 双源安装
  │ 下载 SKILL.md → ~/.skills/skills/<slug>/
  ▼
Skills Hub Registry API (Go 后端)
  │ GET /api/v1/skills/by-slug/:slug
  │ GET /api/v1/skills/by-slug/:slug/download
  │ GET /api/v1/skills/manifest
  ▼
PostgreSQL (mclaw-db)
  │ skills / skill_versions 表
  │ buildSkillMd() → 动态生成 SKILL.md (YAML frontmatter + Markdown)
```

## 二、核心组件

### 2.1 CLI (`packages/cli/` → npm: `mclaw-skills@1.0.4`)

| 命令 | 功能 |
|------|------|
| `npx mclaw-skills add <source>` | **一句话安装**（首次自动 init + 安装） |
| `npx mclaw-skills init` | 手动初始化 ~/.skills/ + 自动检测 AI 工具 |
| `npx mclaw-skills list` | 列出已安装 |
| `npx mclaw-skills remove <slug>` | 卸载 |

**安装源判断**：
- `mclaw/xxx` → Registry（Skills Hub API）
- `xxx`（纯 slug）→ Registry（默认）
- `@scope/pkg` → npm install

### 2.2 Registry API（Go Backend）

| 端点 | 用途 |
|------|------|
| `GET /api/v1/skills/by-slug/:slug` | 按 slug 查技能（公开） |
| `GET /api/v1/skills/by-slug/:slug/download` | 下载最新版 SKILL.md |
| `GET /api/v1/skills/by-slug/:slug/versions/:v/download` | 下载指定版本 |
| `GET /api/v1/skills/manifest` | 所有已发布技能清单 |

**关键实现**：
- `buildSkillMd()` 把 DB 数据转成标准 SKILL.md（YAML + Markdown）
- `normalizeSlug()` 自动剥离 `mclaw/` 前缀
- slug 端点独立于 UUID 端点，因为外部 CLI 只有 slug

### 2.3 Web UI

| 页面 | 功能 |
|------|------|
| 技能详情页 `/skills/:slug` | 技能展示 + 安装弹窗 + 评价列表 |
| 技能列表页 `/skills` | 浏览搜索 + CLI 横幅 |

**安装弹窗**：三种方式
1. 对话安装（推荐）— 复制给 Claude Code/Codex/OpenCode 等
2. 终端 CLI — `npx mclaw-skills add mclaw/<slug>`（首次自动初始化）
3. 全局安装 — `npm install -g mclaw-skills`

### 2.4 技能包格式（AgentSkills.io 标准对齐）

```markdown
---
name: 技能显示名
slug: kebab-case-id
version: 1.0.0
description: 一句话描述
author: 作者名
icon: 📊
tags:
  - 分类1
  - 分类2
license: MIT
homepage: https://...
args:
  param_name:
    type: string
    description: 参数说明
    required: false
---

# Markdown Body（AI 提示词正文）
```

## 三、部署架构

| 组件 | 位置 | 部署方式 |
|------|------|---------|
| Go 后端 | 133 Docker (mclaw-backend) | `docker compose up -d --build` |
| Web 前端 | 133 Docker (mclaw-nginx) | 构建 + 打包 + 重建 nginx |
| CLI | npm registry | `npm publish --access public` |
| 数据库 | 133 Docker (mclaw-db) | PostgreSQL 17 |

**部署命令**：
```bash
# 全量部署
tar czf mclaw-deploy.tar.gz docker-compose.yml Dockerfile.nginx nginx.conf apps/web/dist/ backend/
scp mclaw-deploy.tar.gz [REDACTED]@[REDACTED]:/home/[REDACTED]/
ssh [REDACTED]@[REDACTED] "
  cd ~/mclaw-deploy && tar xzf ~/mclaw-deploy.tar.gz
  echo '[REDACTED]' | sudo -S docker compose up -d --build
"

# 仅前端
pnpm --filter @mclaw/web build
tar czf web.tar.gz apps/web/dist/
# ... 上传 + 重建 nginx

# CLI 发布
cd packages/cli && npm version patch && npm publish --access public
```

## 四、踩坑记录

### 4.1 Go web 框架 BindHandler 不认 JSON
- **现象**：POST JSON body，`BindHandler` 返回 `(nil **domain.XXXReq)`
- **原因**：`github.com/GoYoko/web` 框架的 `BindHandler` 不支持 JSON body 绑定
- **解决**：改用 `BaseHandler` + `json.NewDecoder(r.Body).Decode(&req)` 手动解析

### 4.2 Ent Schema ID 缺默认值
- **现象**：`skill_ratings.id` 插入时报 `null value violates not-null constraint`
- **原因**：Ent schema 定义 `field.UUID("id")` 但没有 `Default(uuid.New)`
- **解决**：`ALTER TABLE skill_ratings ALTER COLUMN id SET DEFAULT gen_random_uuid();`

### 4.3 UUID vs Slug 路由混用
- **现象**：前端用 slug `mckinsey-visual` 调 `/skills/:id`（UUID 路由）
- **解决**：新增 `/by-slug/:slug` 路由族，与 UUID 路由分离

### 4.4 npm 包名 `skills` 已被占用
- **解决**：改用 `mclaw-skills`，避免 npm org 付费
- bin 名同时注册 `skills` 和 `mclaw-skills`，兼容 `npx` 和全局安装

### 4.5 ESM 导入需要 `.js` 扩展名
- CLI 用 `"type": "module"`，所有相对导入必须带 `.js` 后缀
- 批量修复：`sed -E "s/from '(\.\.?\/[^']+)'/from '\1.js'/g"`

### 4.6 同一个账号不能重复评分
- DB 约束：`UNIQUE(user_id, skill_id)`，前端已处理——评过即隐藏评分入口

### 4.7 BindHandler 不认 JSON + Ent UUID ID 全链路修复（2026-06-12）

**BindHandler 问题**：
- `CreateSkill` / `UpdateSkill` / `PublishVersion` / `ReviewSkill` 四个 handler 使用 `BindHandler`，框架不支持 JSON body 绑定
- 全部改为 `BaseHandler` + `decodeJSONBody()` 手动解析 JSON

**UUID ID 缺失问题**（Ent schema `field.UUID("id")` 无 `Default(uuid.New)`）：
| 实体 | 表 | 修复位置 |
|------|-----|---------|
| Skill | `skills` | `usecase/skill.go` 传 `ID: uuid.New()` + `repo/skill.go` 调 `SetID()` |
| SkillReview | `skill_reviews` | `handler/skill.go` 传 `ID: uuid.New()` + `repo/skill_review.go` 调 `SetID()` |
| SkillVersion | `skill_versions` | `usecase/skill.go` PublishVersion 传 `ID: uuid.New()` + `repo/skill_version.go` 调 `SetID()` |

**已发布技能**：`chinese-official-word-style`（中文公文 Word 版式）v1.0.0

## 五、改动文件清单

| 模块 | 文件 | 改动 |
|------|------|------|
| **CLI** | `packages/cli/` (新建) | 完整 CLI 工具 |
| **Backend** | `backend/biz/skill/handler/v1/skill.go` | +4 端点 + download/manifest |
| **Backend** | `backend/biz/skill/usecase/skill.go` | Rate 加 ID 生成 |
| **Backend** | `backend/errcode/errcode.go` | +ErrSkillVersionNotFound |
| **Frontend** | `apps/web/src/pages/SkillDetail/index.tsx` | 安装弹窗 + 评价控制 |
| **Frontend** | `apps/web/src/pages/Skills/index.tsx` | CLI 横幅 |
| **Shared** | `packages/shared/src/api/skill.ts` | +getBySlug |
| **Shared** | `packages/shared/src/hooks/useSkill.ts` | ratings + UUID 修复 |
| **Shared** | `packages/shared/src/components/skill/SkillDetail.tsx` | ratings 展示 |
| **DB** | skill_ratings.id | ALTER TABLE SET DEFAULT |
| **Config** | `pnpm-workspace.yaml` | +packages/cli |
| **Docs** | `docs/examples/mckinsey-ppt/SKILL.md` | 示例技能 |
| **Docs** | `docs/superpowers/specs/2026-06-12-skills-hub-distribution-design.md` | 设计文档 |
| **Docs** | `docs/skills-hub-DESIGN.md` | Web 专门视觉规范（skillhub.cn 风格） |

### 5.1 2026-06-12 下午优化

| 模块 | 文件 | 改动 |
|------|------|------|
| **CLI** | `packages/cli/src/commands/add.ts` | **自动初始化**：首次 add 时自动 detectTools + saveConfig；**去 Git 源**：移除 isGitSource/installFromGit/extractGitSlug，双源安装 |
| **CLI** | `packages/cli/src/commands/init.ts` | 精简快速上手提示，去 Git 安装引导 |
| **CLI** | `packages/cli/src/index.ts` | help 文本去 Git，add 标注「首次自动初始化」 |
| **Web** | `apps/web/src/pages/SkillDetail/index.tsx` | chatPrompt 一句话化：`帮我用 SkillHub 安装 xxx 技能…`；底部提示口语化 |
| **Docs** | `docs/skills-hub-DESIGN.md` | 新增 §2.1 品牌橙色落地清单（必现/建议/禁止三层 + 蓝橙协作规则） |
| **Docs** | `docs/knowledge/skills-hub-distribution.md` | 同步更新：架构图双源、CLI 命令表、安装流程 |

## 六、发布流程

1. **后端部署**：Go 编译 → 打包 → 上传 133 → docker compose rebuild
2. **前端部署**：`pnpm build` → 打包 dist → 上传 → nginx rebuild
3. **CLI 发布**：`typescript compile` → `npm version patch` → `npm publish`
4. **技能发布**：API 直接 POST（2026-06-12 修复：BindHandler→BaseHandler + 全链路 UUID 补全）
