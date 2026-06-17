# Skills Hub 开放分发设计

> 日期：2026-06-12
> 状态：已实现

---

## 1. 目标

让 Skills Hub 市场的技能可以被任何 AI 工具（Claude Code、Codex、OpenClaw、Gemini CLI 等）的用户通过 CLI 安装使用。

## 2. 架构总览

```
┌──────────────────────────────────────────┐
│  Skills Hub Web 市场（已有）              │
│  ┌────────┐ ┌────────┐ ┌──────────────┐ │
│  │ 浏览搜索 │ │ 发布审核 │ │ Registry API │ │
│  │ (已有)  │ │ (已有)  │ │ ← 新增       │ │
│  └────────┘ └────────┘ └──────────────┘ │
└──────────────────────────────────────────┘
         │                │
         │ Web 浏览        │ CLI 查询/下载
         ▼                ▼
┌──────────────────────────────────────────┐
│  npx skills（CLI — 新增 npm 包）          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐  │
│  │ init │ │ add  │ │ list │ │ remove │  │
│  └──────┘ └──────┘ └──────┘ └────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ 三源适配层                          │  │
│  │ Registry ← Git ← npm              │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
         │
         │ 写入 ~/.skills/skills/<slug>/
         ▼
┌──────────────────────────────────────────┐
│  社区分发层（不重复造轮子）                │
│  skillshare / skillsmgr / agent-skill-mgr │
│  → symlink 到 Claude Code / Codex / ...  │
└──────────────────────────────────────────┘
```

## 3. 技能包格式 —— SKILL.md 规范

### 3.1 目录结构

```
my-skill/
├── SKILL.md              # 必需：YAML frontmatter + Markdown body
├── scripts/              # 可选：辅助脚本
├── assets/               # 可选：静态资源
├── README.md             # 可选
└── .skillrc.json         # 可选：CLI 元数据覆盖
```

### 3.2 SKILL.md Frontmatter 字段

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `name` | ✅ | string | 技能显示名 |
| `slug` | ✅ | string | 唯一标识符，kebab-case |
| `version` | ✅ | semver 字符串 | 语义化版本 |
| `description` | ✅ | string | 一句话描述 |
| `author` | - | string | 作者/组织名 |
| `icon` | - | string | emoji 图标 |
| `tags` | - | string[] | 分类标签 |
| `license` | - | string | SPDX 标识 |
| `homepage` | - | URL | 项目主页 |
| `args` | - | object | JSON Schema 风格参数定义 |

### 3.3 设计原则

- **SKILL.md 即技能本身**：一个文件包含全部元数据 + 提示词
- **跟 AgentSkills.io 标准对齐**：被 26+ 平台原生支持
- **YAML frontmatter = 机器读**，**Markdown body = AI 读**
- **三阶渐进加载**：metadata（启动时）→ body（调用时）→ scripts/assets（按需）

## 4. CLI 命令设计

### 4.1 命令总览

| 命令 | 说明 | MVP |
|------|------|-----|
| `init` | 初始化 ~/.skills/ 环境 | ✅ |
| `add <source>` | 三源安装 | ✅ |
| `list` | 列出已安装 | ✅ |
| `remove <slug>` | 卸载 | ✅ |
| `search <query>` | 搜索市场 | P1 |
| `update [slug]` | 更新 | P1 |
| `info <slug>` | 详情 | P2 |

### 4.2 三源判断逻辑

```
输入 → 匹配 "user/repo" 或 github.com?  → Git 源 (git clone)
     → 匹配 @scope/pkg 或 pkg@version?  → npm 源 (npm install)
     → 其他                             → Registry 源 (Skills Hub API)
```

### 4.3 安装目标

统一安装到 `~/.skills/skills/<slug>/`，以后项目级配置支持 `.skills/` 目录。

## 5. Registry API 设计

### 5.1 新增端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/skills/:skill_id` | 技能详情（已有，需增强） |
| GET | `/api/v1/skills/:skill_id/versions/:version/download` | 下载指定版本 tarball |
| GET | `/api/v1/skills/:skill_id/versions/latest/download` | 下载最新版本 tarball |
| GET | `/api/v1/skills/search?q=&category=&sort=` | 搜索（已有或增强） |
| GET | `/api/v1/skills/manifest` | 所有已发布技能的 slug+版本清单 |

### 5.2 Download 响应

```
GET /api/v1/skills/web-search/versions/1.0.0/download

Content-Type: application/gzip
Content-Disposition: attachment; filename="web-search-1.0.0.tar.gz"

[tarball bytes containing SKILL.md + scripts/ + assets/]
```

## 6. 与社区工具的关系

Skills Hub CLI **只负责下载管理**，不重新发明 symlink 分发：

- `~/.skills/skills/` 是统一存储位置
- 用户用 skillshare / skillsmgr / agent-skill-manager 做 symlink 分发
- CLI 安装完成后提示：「已安装到 ~/.skills/skills/web-search/，使用 skillshare 或 skillsmgr 同步到你的 AI 工具」

## 7. 改动范围

| 模块 | 改动 |
|------|------|
| `packages/cli/` | **新建** — Skills Hub CLI npm 包 |
| `backend/biz/skill/` | **新增** — download handler + 搜索增强 |
| `apps/web/` | **更新** — 技能详情页增加安装命令 |
| `docs/examples/` | **已有** — 麦肯锡 PPT 技能示例 |
