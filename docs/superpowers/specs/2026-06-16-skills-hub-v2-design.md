# Skills Hub V2 — 设计文档

> 日期：2026-06-16
> 状态：已确认
> 架构方案：增量式演进（方案A）

---

## 1. 概述

升级 mclaw Skills Hub 系统，新增以下核心能力：

1. **超级管理员权限系统** — 4 角色制，权限动态菜单
2. **ZIP 上传 + MinIO 存储** — 文件上传、自动解压、对象存储
3. **npm 自动发布** — 审核通过后自动同步到 npm registry
4. **专属/第三方分类** — official vs third_party
5. **用户 Skills 管理面板** — 我的技能、启用/停用/升级
6. **多文件 Skill 兼容** — SKILL.md 入口 + 附件资源，全量下载
7. **预设多彩图标库** — 60-80 个彩色 SVG 图标供用户选择

---

## 2. 权限系统

### 2.1 角色定义

| 角色 | role 值 | 权限 |
|------|---------|------|
| 超级管理员 | `super_admin` | 分配用户角色、管理所有技能、审核、系统配置 |
| 审核员 | `reviewer` | 审核/拒绝技能发布，查看所有技能详情 |
| 技能上传者 | `publisher` | 上传/编辑/启停自己的技能，查看自己的技能统计 |
| 普通用户 | `user`（默认） | 浏览/安装/评分技能 |

### 2.2 数据库变更

**修改 `users` 表** — 新增 role 字段：

```go
// ent/schema/user.go
field.String("role").
    Default("user").
    Validate(func(s string) error {
        // 只允许 super_admin / reviewer / publisher / user
        return nil
    })
```

**新增 `user_permissions` 表**（预留未来细粒度权限）：

```go
// ent/schema/user_permission.go
field.String("user_id")     // FK -> users
field.String("permission")  // 如 "skill:upload", "skill:review", "skill:manage"
field.Bool("granted").Default(true)
```

当前用角色直接判断权限，`user_permissions` 暂不使用，预留扩展。

### 2.3 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/users` | super_admin | 用户列表（含角色） |
| PUT | `/api/v1/admin/users/:id/role` | super_admin | 分配用户角色 |
| GET | `/api/v1/admin/users/:id/permissions` | super_admin | 查看用户权限 |
| PUT | `/api/v1/admin/users/:id/permissions` | super_admin | 修改用户权限 |

### 2.4 权限中间件

新增 `middleware/permission.go`：

```go
func RequireRole(roles ...string) echo.MiddlewareFunc {
    // 从 session 获取 user role，检查是否在允许列表中
}
```

使用方式：
- 管理员操作：`RequireRole("super_admin")`
- 审核操作：`RequireRole("super_admin", "reviewer")`
- 上传操作：`RequireRole("super_admin", "reviewer", "publisher")`

---

## 3. ZIP 上传 + MinIO 存储

### 3.1 上传流程

```
用户选择 ZIP
  → 前端校验（格式/大小/含 SKILL.md）
  → 上传到后端 POST /api/v1/skills/upload
  → 后端校验（解压预览/检查 SKILL.md/检查 slug）
  → 解压存到 MinIO
  → 创建 skill 记录（status: draft）
  → 返回 skill 详情
```

### 3.2 MinIO 存储结构

```
mclaw-skills bucket/
├── <slug>/
│   ├── v1.0.0/
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   │   ├── main.py
│   │   │   └── utils.js
│   │   ├── docs/
│   │   │   └── guide.md
│   │   └── ...
│   ├── v1.1.0/
│   │   └── ...
│   └── _icons/
│       └── icon.svg
```

关键规则：
- 每个 slug 一个目录，每个版本一个子目录
- **SKILL.md 必须存在于 ZIP 根目录**
- 最多 200 个文件，总大小不超过 10MB
- slug 仅允许小写字母、数字、连字符（`^[a-z0-9][a-z0-9-]*[a-z0-9]$`）

### 3.3 后端新增模块

**MinIO 客户端** — `backend/infrastructure/minio.go`：

```go
type MinIOClient struct {
    client *minio.Client
    bucket string
}
func (m *MinIOClient) UploadZip(ctx context.Context, slug, version string, zipFile io.Reader) error
func (m *MinIOClient) DownloadFile(ctx context.Context, slug, version, filePath string) (io.ReadCloser, error)
func (m *MinIOClient) ListFiles(ctx context.Context, slug, version string) ([]string, error)
func (m *MinIOClient) DeleteVersion(ctx context.Context, slug, version string) error
```

**ZIP 解压服务** — `backend/biz/skill/service/unzip.go`：

```go
func ProcessSkillZip(ctx context.Context, zipData []byte, slug, version string, minio *MinIOClient) (*SkillZipResult, error)

type SkillZipResult struct {
    Files     []string
    SkillMd   string
    TotalSize int64
    FileCount int
}
```

**skill schema 变更**：

```go
// 新增字段
field.String("source_type").Default("official")   // "official" | "third_party"
field.String("icon_name").Optional()              // 预设图标名称
field.String("summary").Optional()                // 技能简介说明
field.String("minio_path").Optional()             // MinIO 存储路径前缀
```

### 3.4 上传 API

| 方法 | 路径 | 权限 | Content-Type |
|------|------|------|-------------|
| POST | `/api/v1/skills/upload` | publisher+ | multipart/form-data |

请求参数：

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `file` | File | ✅ | ZIP 压缩包 |
| `slug` | string | ✅ | 技能唯一标识 |
| `name` | string | ✅ | 显示名称 |
| `summary` | string | ✅ | 简介说明 |
| `version` | string | ✅ | 版本号（默认 1.0.0） |
| `changelog` | string | 新版本时必须 | 变更说明 |
| `source_type` | string | ✅ | "official" / "third_party" |
| `icon_name` | string | ✅ | 预设图标名称 |
| `categories` | string | JSON 数组 | 分类标签 |
| `tags` | string | JSON 数组 | 搜索标签 |

后端处理逻辑：
1. 接收 multipart 请求
2. 校验 slug 格式
3. 解压 ZIP 到临时目录
4. 检查必须的 SKILL.md
5. 检查文件数 ≤ 200，总大小 ≤ 10MB
6. 解析 SKILL.md 的 YAML frontmatter 提取元数据
7. 上传文件到 MinIO `<slug>/v<version>/`
8. 创建/更新 skill 记录 + skill_version 记录
9. 状态设为 `draft`

### 3.5 Docker Compose

```yaml
minio:
  image: minio/minio:latest
  ports:
    - "9000:9000"
    - "9001:9001"
  environment:
    MINIO_ROOT_USER: mclaw
    MINIO_ROOT_PASSWORD: mclaw123456
  volumes:
    - minio_data:/data
  command: server /data --console-address ":9001"
```

---

## 4. npm 自动发布

### 4.1 发布流程

```
技能审核通过
  → 触发 npm publish worker
  → 从 MinIO 下载文件
  → 生成 npm 包结构
  → npm publish @mclaw-skill/<slug>@<version>
  → 更新 skill 记录的 npm_publish_status
```

### 4.2 npm 包结构（自动生成）

```
@mclaw-skill/<slug>/
├── package.json     # name, version, description, main: "SKILL.md"
├── SKILL.md
├── files/
│   ├── main.py
│   └── utils.js
└── README.md        # 自动生成
```

package.json 模板：

```json
{
  "name": "@mclaw-skill/<slug>",
  "version": "<version>",
  "description": "<summary>",
  "main": "SKILL.md",
  "files": ["SKILL.md", "files/**"],
  "keywords": ["mclaw-skill", ...tags],
  "license": "MIT",
  "mclaw": {
    "slug": "<slug>",
    "sourceType": "<official|third_party>",
    "iconName": "<icon>"
  }
}
```

### 4.3 后端实现

`backend/biz/skill/service/npm_publisher.go`：

```go
type NpmPublisher struct {
    npmToken string
    minio    *MinIOClient
    tempDir  string
}
func (p *NpmPublisher) Publish(ctx context.Context, skill *SkillDetail, version string) error
```

### 4.4 触发机制

修改 `ReviewSkill` handler：

```go
if req.Status == "approved" {
    go p.npmPublisher.Publish(ctx, skill, latestVersion)
}
```

npm publish 是异步的，失败不影响审核通过。新增 `npm_publish_status` 字段追踪：`pending / publishing / published / failed`。

### 4.5 npm scope 区分

- 官方：`@mclaw-skill/<slug>`
- 第三方：`@mclaw-community/<slug>`

---

## 5. 专属 vs 第三方分类

### 5.1 Schema 字段

`source_type` 字段（已在 3.3 中定义）：

| source_type 值 | 含义 | 前端标识 |
|----------------|------|---------|
| `official` | mclaw 官方专属技能 | 橙色 "官方" 徽章 |
| `third_party` | 第三方开发者上传 | 灰色 "社区" 徽章 |

### 5.2 API 变更

- `ListSkills` 新增 `source_type` 过滤参数
- 前端列表页增加"官方/社区" Tab 切换

---

## 6. 图标系统

### 6.1 方案

内置一套多彩 Flat Icon SVG 预设图标库，约 60-80 个图标。

| 分类 | 图标示例 | 数量 |
|------|---------|------|
| 通用 | rocket, zap, target, star, flame | ~20 |
| 编程 | code, bug, wrench, package, database | ~15 |
| AI/ML | brain, bot, chart, microscope, dna | ~15 |
| 文档 | pencil, file-text, clipboard, book-open | ~10 |
| 商务 | wallet, trending-up, building, ticket | ~10 |

### 6.2 前端实现

- 图标选择器组件 `IconPicker` — 网格展示所有预设图标
- 存储在 `packages/shared/src/components/skill/icons/`
- 使用 lucide 图标名 + 自定义彩色 SVG 渲染
- 选择后存储 `icon_name` 字段

---

## 7. Web 左侧菜单栏 + 权限动态菜单

### 7.1 布局

```
┌──────────────────────────────────────────────────────┐
│  顶部导航栏 (68px) - Logo + 搜索 + 用户头像/登录    │
├──────────┬───────────────────────────────────────────┤
│ 左侧菜单 │                                           │
│ (220px)  │           主内容区                         │
│          │          (flex)                            │
│ 权限动态 │                                           │
│ 显示     │                                           │
└──────────┴───────────────────────────────────────────┘
```

### 7.2 菜单项

| 菜单项 | 图标 | 最低权限 | 路由 |
|--------|------|---------|------|
| 技能市场 | Grid | 游客 | `/skills` |
| 趋势 | TrendingUp | 游客 | `/skills/trending` |
| ─── | ─── | ─── | ─── |
| 我的技能 | Package | publisher | `/my-skills` |
| 上传技能 | Upload | publisher | `/skills/upload` |
| ─── | ─── | ─── | ─── |
| 技能审核 | CheckCircle | reviewer | `/admin/skills` |
| 用户管理 | Users | super_admin | `/admin/users` |
| ─── | ─── | ─── | ─── |
| 设置 | Settings | 登录用户 | `/settings` |

### 7.3 菜单显示逻辑

- 游客：技能市场、趋势
- 普通用户：+ 设置
- publisher：+ 我的技能、上传技能
- reviewer：+ 技能审核
- super_admin：+ 用户管理

---

## 8. 用户 Skills 管理面板

### 8.1 技能状态流转

```
draft → (提交审核) → pending_review → (通过) → published → npm publish
                                      ↓ (拒绝)
                                    rejected → (修改) → draft
published → (停用) → disabled → (启用) → published
published → (升级) → draft (新版本) → pending_review → published
```

### 8.2 状态定义

| 状态 | 说明 |
|------|------|
| draft | 草稿，可编辑 |
| pending_review | 已提交审核 |
| published | 已发布 |
| archived | 归档（管理员操作） |
| disabled | 已停用（用户操作） |
| rejected | 审核拒绝 |

### 8.3 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/skills/mine` | publisher+ | 我的技能列表 |
| PUT | `/api/v1/skills/:id/submit` | publisher+ | 提交审核 |
| PUT | `/api/v1/skills/:id/enable` | publisher+ | 启用 |
| PUT | `/api/v1/skills/:id/disable` | publisher+ | 停用 |
| POST | `/api/v1/skills/:id/upgrade` | publisher+ | 升级（重新上传 ZIP） |

### 8.4 页面结构

**我的技能（/my-skills）**：
- 统计卡片：总数 / 已发布 / 草稿 / 已停用
- 技能列表表格：图标 | 名称 | slug | 状态 Badge | 版本 | 安装数 | 评分 | 上传时间
- 操作：启用/停用 | 升级 | 删除
- 空状态引导

**用户管理（/admin/users，super_admin）**：
- 用户列表表格：头像 | 用户名 | 邮箱 | 当前角色 | 注册时间
- 操作：修改角色

**技能审核（/admin/skills，reviewer+）**：
- Tab：待审核 | 已通过 | 已拒绝
- 技能列表：图标 | 名称 | 上传者 | 类型 | 版本 | 评分 | 安装数 | 提交时间
- 操作：通过 | 拒绝
- 审核弹窗（备注）

---

## 9. 多文件 Skill 兼容性

### 9.1 支持的文件类型（白名单）

| 类型 | 扩展名 |
|------|--------|
| 文档 | `.md`, `.txt`, `.rst` |
| Python | `.py`, `.pyw`, `.toml`, `.cfg`, `.ini` |
| JavaScript | `.js`, `.ts`, `.mjs`, `.cjs` |
| 数据 | `.json`, `.yaml`, `.yml`, `.csv` |
| Shell | `.sh`, `.bash`, `.zsh` |
| Web | `.html`, `.css` |
| 图片 | `.png`, `.jpg`, `.svg`, `.gif` |
| 压缩包 | `.tar`, `.gz` |

### 9.2 禁止的文件

- 可执行文件：`.exe`, `.dll`, `.so`, `.dylib`
- 隐藏文件：`.` 开头（`.git`, `.env` 等）
- 符号链接
- 超过 100MB 的单个文件

### 9.3 ZIP 校验规则

1. 文件数 ≤ 200
2. 总大小 ≤ 10MB
3. 根目录必须包含 SKILL.md
4. 所有文件扩展名在白名单内
5. 无隐藏文件/符号链接
6. 无嵌套 ZIP
7. 路径深度 ≤ 5 层
8. 单文件 ≤ 100MB

### 9.4 下载 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/skills/by-slug/:slug/download` | 下载完整 ZIP（全量） |
| GET | `/api/v1/skills/by-slug/:slug/download/SKILL.md` | 只下载 SKILL.md（向后兼容） |
| GET | `/api/v1/skills/by-slug/:slug/download/:filepath` | 下载指定文件 |
| GET | `/api/v1/skills/by-slug/:slug/file-list` | 列出所有文件 |

### 9.5 CLI 适配

```bash
# 全量安装（新默认）
npx mclaw-skills add mclaw/my-skill

# 只安装 SKILL.md（轻量模式）
npx mclaw-skills add mclaw/my-skill --lite

# 安装特定版本
npx mclaw-skills add mclaw/my-skill@1.2.0
```

安装后的目录结构：

```
~/.skills/skills/my-skill/
├── SKILL.md
├── scripts/
│   ├── main.py
│   └── utils.js
├── docs/
│   └── guide.md
└── .installed.json   # 安装元数据
```

.installed.json：

```json
{
  "slug": "my-skill",
  "version": "1.0.0",
  "source": "registry",
  "installed_at": "2026-06-16T10:00:00Z",
  "file_count": 5,
  "total_size": 15360
}
```

---

## 10. 数据库变更汇总

### 修改现有表

**skills 表** — 新增字段：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| source_type | string | "official" | official / third_party |
| icon_name | string | null | 预设图标名称 |
| summary | string | null | 技能简介 |
| minio_path | string | null | MinIO 路径前缀 |
| npm_publish_status | string | "pending" | pending/publishing/published/failed |

**skills 表** — status 枚举扩展：

原：`draft / published / archived`
新：`draft / pending_review / published / archived / disabled / rejected`

**users 表** — 新增字段：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| role | string | "user" | super_admin/reviewer/publisher/user |

### 新增表

**user_permissions 表**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | PK |
| user_id | UUID | FK -> users |
| permission | string | 权限标识 |
| granted | bool | 是否授权 |
| created_at | time | 创建时间 |

---

## 11. API 变更汇总

### 新增 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/v1/skills/upload` | publisher+ | ZIP 上传创建/更新技能 |
| GET | `/api/v1/skills/mine` | publisher+ | 我的技能列表 |
| PUT | `/api/v1/skills/:id/submit` | publisher+ | 提交审核 |
| PUT | `/api/v1/skills/:id/enable` | publisher+ | 启用 |
| PUT | `/api/v1/skills/:id/disable` | publisher+ | 停用 |
| POST | `/api/v1/skills/:id/upgrade` | publisher+ | 升级 |
| GET | `/api/v1/skills/by-slug/:slug/download` | public | 全量 ZIP 下载 |
| GET | `/api/v1/skills/by-slug/:slug/download/:filepath` | public | 单文件下载 |
| GET | `/api/v1/skills/by-slug/:slug/file-list` | public | 文件列表 |
| GET | `/api/v1/admin/users` | super_admin | 用户列表 |
| PUT | `/api/v1/admin/users/:id/role` | super_admin | 分配角色 |
| GET | `/api/v1/admin/users/:id/permissions` | super_admin | 用户权限 |
| PUT | `/api/v1/admin/users/:id/permissions` | super_admin | 修改权限 |

### 修改 API

| API | 变更 |
|-----|------|
| `ListSkills` | 新增 `source_type` 过滤参数 |
| `DownloadSkill` | 无文件路径时返回完整 ZIP；带路径时返回指定文件 |
| `ReviewSkill` | 审核通过后异步触发 npm publish |

---

## 12. 前端变更汇总

### 新增页面

| 路由 | 页面 | 权限 |
|------|------|------|
| `/my-skills` | 我的技能 | publisher+ |
| `/skills/upload` | 上传技能 | publisher+ |
| `/admin/users` | 用户管理 | super_admin |

### 修改页面

| 路由 | 变更 |
|------|------|
| Web 整体布局 | 新增左侧菜单栏（220px），权限动态显示 |
| `/skills` | 增加 official/third_party Tab 过滤 |
| `/skills/:slug` | 增加来源标识、全量安装提示 |
| `/admin/skills` | 增强审核信息（上传者、类型、评分、安装数） |
| `/admin/create` | 改造为 ZIP 上传表单 |

### 新增组件

| 组件 | 说明 |
|------|------|
| `WebSidebar` | 左侧权限动态菜单 |
| `IconPicker` | 图标选择器（网格展示预设图标） |
| `ZipUploader` | ZIP 文件上传组件（拖拽 + 校验） |
| `SkillStatusBadge` | 技能状态徽章（6种状态） |
| `MySkillTable` | 我的技能表格 |
| `UserManageTable` | 用户管理表格 |
| `ReviewDialog` | 审核弹窗（通过/拒绝 + 备注） |
