# Skills Hub V2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 升级 mclaw Skills Hub 系统，新增权限系统、ZIP上传+对象存储、npm自动发布、多文件Skill支持、用户管理面板、预设图标库。

**架构:** 8个阶段，顺序执行。基于现有 Go + Ent + RustFS + React + Zustand 栈增量演进，不推倒重来。

**技术栈:** Go 1.23 + Ent ORM + Echo/GoYoko + RustFS(S3) + React 19 + Vite 7 + Zustand 5 + Tailwind 3 + TypeScript

**设计文档:** `docs/superpowers/specs/2026-06-16-skills-hub-v2-design.md`

---

## 关键上下文（开发前必读）

### 已有基础设施
- **对象存储**: RustFS (S3兼容)，非 MinIO。客户端在 `backend/pkg/oss/oss.go`，已支持 PutFile/HeadFile/Presign/GetURL
- **用户角色当前值**: `individual`, `enterprise`, `subaccount`, `admin`, `gittask` — 需扩展，保留向后兼容
- **Skill 状态当前值**: `draft`, `published`, `archived` — 需扩展
- **DI 容器**: samber/do，两阶段注册模式（Provide → Invoke）
- **Web 框架**: GoYoko/web (Echo wrapper)，路由在 handler 构造函数注册
- **CLI**: 当前只下载单个 SKILL.md 文件，需改造为全量 ZIP 下载
- **Web 前端**: 无 i18n（中文硬编码），继续此模式

### 用户角色保留策略
- `individual` → 映射为新 `user`（普通用户），DB 不变
- `enterprise` → 保留，等价于发布者权限
- `admin` → 保留，等价于超级管理员
- 新增：`super_admin`, `reviewer`, `publisher`

---

## 阶段一：权限系统（基础层）

> ⚠️ 这是后续所有阶段的基础，必须最先完成。

### Task 1.1: 扩展用户角色常量

**文件:**
- 修改: `backend/consts/user.go`
- 修改: `backend/ent/schema/user.go`

- [ ] **Step 1: 新增角色常量**

在 `backend/consts/user.go` 的 `UserRole` 定义中追加：

```go
const (
    UserRoleIndividual UserRole = "individual" // 个人用户（向后兼容 → 普通用户）
    UserRoleEnterprise UserRole = "enterprise" // 企业用户（向后兼容 → 等价发布者）
    UserRoleSubAccount UserRole = "subaccount" // 企业子账户
    UserRoleAdmin      UserRole = "admin"      // 超级管理员（向后兼容）

    // V2 新增角色
    UserRoleSuperAdmin UserRole = "super_admin" // 超级管理员（可分配角色）
    UserRoleReviewer   UserRole = "reviewer"    // 审核员
    UserRolePublisher  UserRole = "publisher"   // 技能上传者
    UserRoleUser       UserRole = "user"        // 普通注册用户（默认）
)
```

在 `backend/consts/user.go` 末尾新增角色权限判断函数：

```go
// RolePriority 返回角色优先级数值，方便做权限比较。
// 数值越大权限越高。
func (r UserRole) RolePriority() int {
    switch r {
    case UserRoleSuperAdmin, UserRoleAdmin:
        return 100
    case UserRoleReviewer:
        return 70
    case UserRolePublisher, UserRoleEnterprise:
        return 50
    case UserRoleUser, UserRoleIndividual, UserRoleSubAccount:
        return 10
    default:
        return 0
    }
}

// CanReview 判断角色是否有审核权限。
func (r UserRole) CanReview() bool {
    return r.RolePriority() >= 70
}

// CanPublish 判断角色是否有发布/上传技能权限。
func (r UserRole) CanPublish() bool {
    return r.RolePriority() >= 50
}

// CanManageUsers 判断角色是否能管理用户权限。
func (r UserRole) CanManageUsers() bool {
    return r.RolePriority() >= 100
}
```

- [ ] **Step 2: 更新 User Ent Schema 默认值**

修改 `backend/ent/schema/user.go`，把 `role` 字段的默认值从隐含改为显式 `"user"`：

```go
// 找到 role field 定义行，确保 Default 为 "user"
field.String("role").
    GoType(consts.UserRole("")).
    Default("user"),  // V2: 新注册用户默认 role=user
```

- [ ] **Step 3: 重新生成 Ent 代码**

```bash
cd /Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw/backend
go generate ./ent
```

验证：`go build ./...` 无报错。

---

### Task 1.2: 权限中间件

**文件:**
- 创建: `backend/middleware/permission.go`

- [ ] **Step 1: 创建权限中间件**

```go
package middleware

import (
    "log/slog"
    "net/http"

    "github.com/labstack/echo/v4"

    "github.com/nidao003/mclaw/backend/consts"
    "github.com/nidao003/mclaw/backend/domain"
)

// RequireRole 返回一个 Echo 中间件，要求当前用户持有 roles 中至少一个角色。
// 必须放在 Auth() 之后（依赖 GetUser）。
// 用法: w.GET("/path", handler, auth.Auth(), RequireRole("super_admin", "reviewer"))
func RequireRole(roles ...string) echo.MiddlewareFunc {
    allowed := make(map[string]bool, len(roles))
    for _, r := range roles {
        allowed[r] = true
    }
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            user := GetUser(c)
            if user == nil {
                return c.String(http.StatusForbidden, "Forbidden: authentication required")
            }
            if !allowed[string(user.Role)] {
                slog.Warn("permission denied",
                    "user_id", user.ID.String(),
                    "role", string(user.Role),
                    "required", roles,
                )
                return c.String(http.StatusForbidden, "Forbidden: insufficient permissions")
            }
            return next(c)
        }
    }
}

// RequireReview 要求审核权限 (super_admin / admin / reviewer)
func RequireReview() echo.MiddlewareFunc {
    return RequireRole("super_admin", "admin", "reviewer")
}

// RequirePublish 要求发布权限 (super_admin / admin / reviewer / publisher / enterprise)
func RequirePublish() echo.MiddlewareFunc {
    return RequireRole("super_admin", "admin", "reviewer", "publisher", "enterprise")
}

// RequireSuperAdmin 要求超级管理员权限
func RequireSuperAdmin() echo.MiddlewareFunc {
    return RequireRole("super_admin", "admin")
}
```

- [ ] **Step 2: 验证编译**

```bash
cd /Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw/backend
go build ./middleware/
# 预期：编译成功
```

---

### Task 1.3: 管理员用户管理 API

**文件:**
- 创建: `backend/biz/skill/handler/v1/admin.go`
- 修改: `backend/domain/skill.go` (新增请求/响应类型)
- 修改: `backend/biz/skill/handler/v1/skill.go` (注册新路由)

- [ ] **Step 1: 在 domain/skill.go 新增 Admin DTO 类型**

在 `backend/domain/skill.go` 末尾添加：

```go
// --- V2 Admin Types ---

// AdminUserListItem 管理后台用户列表项。
type AdminUserListItem struct {
    ID        uuid.UUID `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    AvatarURL string    `json:"avatar_url,omitempty"`
    Role      string    `json:"role"`
    Status    string    `json:"status"`
    CreatedAt time.Time `json:"created_at"`
}

// AdminUpdateUserRoleReq 修改用户角色请求。
type AdminUpdateUserRoleReq struct {
    Role string `json:"role" validate:"required"`
}

// AdminUserListReq 用户列表查询。
type AdminUserListReq struct {
    Cursor string `query:"cursor"`
    Limit  int    `query:"limit"`
    Search string `query:"search,omitempty"`
    Role   string `query:"role,omitempty"`
}
```

- [ ] **Step 2: 创建 admin handler**

创建 `backend/biz/skill/handler/v1/admin.go`：

```go
package v1

import (
    "github.com/GoYoko/web"
    "github.com/google/uuid"
    "github.com/samber/do"
    "log/slog"

    "github.com/nidao003/mclaw/backend/domain"
    "github.com/nidao003/mclaw/backend/errcode"
    "github.com/nidao003/mclaw/backend/middleware"
)

// AdminHandler 管理后台 API handler（V2 权限系统）。
type AdminHandler struct {
    userRepo domain.UserRepo
    logger   *slog.Logger
}

func NewAdminHandler(i *do.Injector) (*AdminHandler, error) {
    w := do.MustInvoke[*web.Web](i)
    logger := do.MustInvoke[*slog.Logger](i)
    auth := do.MustInvoke[*middleware.AuthMiddleware](i)
    userRepo := do.MustInvoke[domain.UserRepo](i)

    h := &AdminHandler{userRepo: userRepo, logger: logger.With("module", "admin.handler")}

    // 管理员路由组 —— 需要认证 + 超级管理员权限
    adminGroup := w.Group("/api/v1/admin", auth.Auth(), middleware.RequireSuperAdmin())
    adminGroup.GET("/users", web.BaseHandler(h.ListUsers))
    adminGroup.PUT("/users/:id/role", web.BaseHandler(h.UpdateUserRole))

    return h, nil
}

// ListUsers 返回用户列表（超级管理员专用）。
func (h *AdminHandler) ListUsers(c *web.Context) error {
    req := &domain.AdminUserListReq{Limit: 20}
    req.Cursor = c.QueryParam("cursor")
    req.Search = c.QueryParam("search")
    req.Role = c.QueryParam("role")
    if l := c.QueryParam("limit"); l != "" {
        if n, err := parseInt(l); err == nil && n > 0 && n <= 100 {
            req.Limit = n
        }
    }
    // 暂时复用现有 UserRepo 方法；如不存在需要 userRepo 自己实现
    // 这里先占位，具体实现见 Task 1.3 Step 3
    return c.Success(map[string]any{"users": []any{}, "total": 0})
}

// UpdateUserRole 修改用户角色（超级管理员专用）。
func (h *AdminHandler) UpdateUserRole(c *web.Context) error {
    userID, err := uuid.Parse(c.Param("id"))
    if err != nil {
        return errcode.ErrInvalidParameter
    }
    var req domain.AdminUpdateUserRoleReq
    if err := decodeJSONBody(c, &req); err != nil {
        return errcode.ErrInvalidParameter
    }
    // 校验角色合法性
    validRoles := map[string]bool{
        "super_admin": true, "reviewer": true, "publisher": true, "user": true,
    }
    if !validRoles[req.Role] {
        return errcode.ErrInvalidParameter
    }
    // 具体更新实现见 UserRepo 扩展
    return c.Success(nil)
}
```

- [ ] **Step 3: 扩展 UserRepo 支持管理员查询**

修改 `backend/domain/user.go`，在 `UserRepo` 接口中新增方法（如不存在则添加）：

```go
// UserRepo 用户数据访问接口（V2 扩展）
type UserRepo interface {
    // ... 已有方法 ...
    // V2 新增
    ListUsers(ctx context.Context, req *AdminUserListReq) ([]*AdminUserListItem, int, error)
    UpdateRole(ctx context.Context, userID uuid.UUID, role string) error
}
```

> 注：如果当前 `UserRepo` 接口不存在或结构不同，以 `backend/domain/` 下的实际定义为准，
> 确保接口与实现一致。已有 `user` biz 模块的 repo 作为参考。

- [ ] **Step 4: 在 register.go 注册 AdminHandler**

修改 `backend/biz/skill/register.go`，添加：

```go
func ProvideSkill(i *do.Injector) {
    // ... 已有 Provide 调用 ...
    do.Provide(i, v1.NewAdminHandler)  // V2 新增
}
```

- [ ] **Step 5: 验证编译**

```bash
cd /Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw/backend
go build ./...
# 预期：编译成功
```

---

### Task 1.4: 替换现有 Admin 路由权限控制

**文件:**
- 修改: `backend/biz/skill/handler/v1/skill.go` (替换 admin 路由中间件)

- [ ] **Step 1: 替换技能审核路由的权限控制**

修改 `NewSkillHandler` 中的 admin 路由注册（约第 71-73 行）：

```go
// 现代码：
admin := w.Group("/api/v1/admin/skills", auth.Auth())
admin.GET("/pending", web.BaseHandler(h.ListPendingSkills))
admin.PUT("/:id/review", web.BaseHandler(h.ReviewSkill))

// 替换为：
admin := w.Group("/api/v1/admin/skills", auth.Auth(), middleware.RequireReview())
admin.GET("/pending", web.BaseHandler(h.ListPendingSkills))
admin.PUT("/:id/review", web.BaseHandler(h.ReviewSkill))
```

- [ ] **Step 2: 添加 import**

在 `skill.go` 顶部 import 中加入：
```go
"github.com/nidao003/mclaw/backend/middleware"
```
（如果还没有的话——检查现有 import）

- [ ] **Step 3: 验证**

```bash
go build ./biz/skill/...
# 预期：编译成功
```

---

## 阶段二：Skill Schema 升级（数据模型层）

### Task 2.1: 扩展 Skill Ent Schema

**文件:**
- 修改: `backend/ent/schema/skill.go`

- [ ] **Step 1: 新增字段**

在 `Skill` schema 的 `Fields()` 方法中，`status` 字段之后、时间字段之前添加：

```go
// V2 新增字段
field.String("source_type").Default("official"),          // official | third_party
field.String("icon_name").Optional(),                      // 预设图标名称
field.String("summary").Optional(),                        // 技能简介
field.String("minio_path").Optional(),                     // RustFS/S3 存储路径前缀
field.String("npm_publish_status").Default("pending"),     // pending|publishing|published|failed
```

同时修改 status 字段的注释，表明支持更多状态：

```go
field.String("status").Default("draft"),  // draft|pending_review|published|archived|disabled|rejected
```

- [ ] **Step 2: 添加索引**

在 `Indexes()` 中追加：

```go
index.Fields("source_type"),
index.Fields("author_id", "status"),
```

- [ ] **Step 3: 重新生成 Ent 代码**

```bash
cd /Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw/backend
go generate ./ent
go build ./...
# 预期：无报错
```

- [ ] **Step 4: 创建数据库迁移 SQL**

在 `backend/migration/` 创建迁移文件。由于项目使用 `golang-migrate`，创建新的 up/down SQL：

`backend/migration/000013_skill_v2.up.sql`：
```sql
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) NOT NULL DEFAULT 'official',
  ADD COLUMN IF NOT EXISTS icon_name VARCHAR(64),
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS minio_path VARCHAR(512),
  ADD COLUMN IF NOT EXISTS npm_publish_status VARCHAR(32) NOT NULL DEFAULT 'pending';

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'user';
```

`backend/migration/000013_skill_v2.down.sql`：
```sql
ALTER TABLE skills
  DROP COLUMN IF EXISTS source_type,
  DROP COLUMN IF EXISTS icon_name,
  DROP COLUMN IF EXISTS summary,
  DROP COLUMN IF EXISTS minio_path,
  DROP COLUMN IF EXISTS npm_publish_status;

ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
```

---

### Task 2.2: 更新 Domain 类型

**文件:**
- 修改: `backend/domain/skill.go`

- [ ] **Step 1: 更新 SkillDetail 结构体**

在 `SkillDetail` 中新增字段（约第 68-87 行）：

```go
type SkillDetail struct {
    ID           uuid.UUID         `json:"id"`
    AuthorID     uuid.UUID         `json:"author_id"`
    Name         string            `json:"name"`
    SkillID      string            `json:"skill_id"`
    Description  string            `json:"description"`
    Categories   []string          `json:"categories"`
    Tags         []string          `json:"tags"`
    Icon         string            `json:"icon"`
    Content      string            `json:"content,omitempty"`
    ArgsSchema   map[string]any    `json:"args_schema,omitempty"`
    Status       string            `json:"status"`
    InstallCount int               `json:"install_count"`
    RatingAvg    float64           `json:"rating_avg"`
    RatingCount  int               `json:"rating_count"`
    // V2 新增
    SourceType       string            `json:"source_type"`
    IconName         string            `json:"icon_name,omitempty"`
    Summary          string            `json:"summary,omitempty"`
    MinioPath        string            `json:"minio_path,omitempty"`
    NpmPublishStatus string            `json:"npm_publish_status,omitempty"`
    FileCount        int               `json:"file_count,omitempty"`  // 多文件 Skill 文件数
    TotalSize        int64             `json:"total_size,omitempty"`  // 总大小（字节）

    Versions     []*SkillVersionDetail `json:"versions,omitempty"`
    CreatedAt    time.Time         `json:"created_at"`
    UpdatedAt    time.Time         `json:"updated_at"`
}
```

- [ ] **Step 2: 更新 ListSkillReq**

```go
type ListSkillReq struct {
    Cursor     string `query:"cursor"`
    Limit      int    `query:"limit"`
    Search     string `query:"search,omitempty"`
    Category   string `query:"category,omitempty"`
    Status     string `query:"status,omitempty"`
    AuthorID   string `query:"author_id,omitempty"`
    SourceType string `query:"source_type,omitempty"` // V2: official | third_party
    SortBy     string `query:"sort_by,omitempty"`     // rating, installs, newest
}
```

- [ ] **Step 3: 更新 toSkillDetail 映射函数**

在 `backend/biz/skill/handler/v1/skill.go` 的 `toSkillDetail` 函数中新增字段映射：

```go
func toSkillDetail(s *db.Skill, versions []*db.SkillVersion) *domain.SkillDetail {
    detail := &domain.SkillDetail{
        // ... 已有字段 ...
        // V2 新增
        SourceType:       s.SourceType,
        IconName:         s.IconName,
        Summary:          s.Summary,
        MinioPath:        s.MinioPath,
        NpmPublishStatus: s.NpmPublishStatus,
    }
    // ...
    return detail
}
```

- [ ] **Step 4: 验证编译**

```bash
cd /Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw/backend
go build ./...
```

---

## 阶段三：ZIP 上传 + 对象存储

> ⚠️ 使用项目已有的 RustFS (S3兼容) 客户端 `backend/pkg/oss/oss.go`，不引入 MinIO。

### Task 3.1: 新增 SkillPrefix 配置

**文件:**
- 修改: `backend/config/config.go`

- [ ] **Step 1: 添加 SkillPrefix 配置默认值**

在 `Init()` 函数的 `v.SetDefault` 区域（约第 310-326 行附近）添加：

```go
v.SetDefault("object_storage.skill_prefix", "skills")
```

在 `ObjectStorageConfig` 结构体中添加字段：

```go
type ObjectStorageConfig struct {
    // ... 已有字段 ...
    SkillPrefix string `mapstructure:"skill_prefix"` // V2: 技能文件存储前缀
}
```

---

### Task 3.2: 创建 ZIP 处理服务

**文件:**
- 创建: `backend/biz/skill/service/zip.go`

- [ ] **Step 1: 创建文件校验和 ZIP 解压服务**

```go
package service

import (
    "archive/zip"
    "bytes"
    "context"
    "fmt"
    "io"
    "log/slog"
    "path"
    "path/filepath"
    "regexp"
    "strings"
)

const (
    MaxFileCount    = 200
    MaxTotalSize    = 10 << 20  // 10MB
    MaxSingleSize   = 100 << 20 // 100MB
    MaxPathDepth    = 5
)

// allowedExtensions 白名单：允许的 Skill 附件文件扩展名。
var allowedExtensions = map[string]bool{
    // 文档
    ".md": true, ".txt": true, ".rst": true,
    // Python
    ".py": true, ".pyw": true, ".toml": true, ".cfg": true, ".ini": true,
    // JavaScript
    ".js": true, ".ts": true, ".mjs": true, ".cjs": true,
    // 数据
    ".json": true, ".yaml": true, ".yml": true, ".csv": true,
    // Shell
    ".sh": true, ".bash": true, ".zsh": true,
    // Web
    ".html": true, ".css": true,
    // 图片
    ".png": true, ".jpg": true, ".svg": true, ".gif": true,
    // 压缩
    ".tar": true, ".gz": true,
}

// bannedExtensions 禁止的文件类型。
var bannedExtensions = map[string]bool{
    ".exe": true, ".dll": true, ".so": true, ".dylib": true,
    ".com": true, ".bat": true, ".cmd": true, ".msi": true,
}

// slugPattern Slug 只能是 [a-z0-9][a-z0-9-]*[a-z0-9]。
var slugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$`)

// ZipEntry ZIP包中一个文件条目。
type ZipEntry struct {
    Path string
    Data []byte
    Size int64
}

// ZipResult ZIP 处理结果。
type ZipResult struct {
    Entries   []ZipEntry
    SkillMd   []byte
    FileCount int
    TotalSize int64
}

// ProcessSkillZip 校验并解压 Skill ZIP 包。
// 返回解压后的文件列表，SKILL.md 内容单独返回。
func ProcessSkillZip(ctx context.Context, zipData []byte) (*ZipResult, error) {
    log := slog.With("module", "skill.zip")

    reader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
    if err != nil {
        return nil, fmt.Errorf("无效的 ZIP 文件: %w", err)
    }

    result := &ZipResult{}
    hasSkillMd := false
    var totalSize int64

    for _, f := range reader.File {
        // 跳过目录
        if f.FileInfo().IsDir() {
            continue
        }

        name := filepath.ToSlash(f.Name)

        // 校验1: 无隐藏文件
        base := path.Base(name)
        if strings.HasPrefix(base, ".") {
            log.Warn("skip hidden file", "name", name)
            continue
        }

        // 校验2: 无禁止扩展名
        ext := strings.ToLower(path.Ext(name))
        if bannedExtensions[ext] {
            return nil, fmt.Errorf("禁止的文件类型: %s (%s)", name, ext)
        }

        // 校验3: 白名单检查
        if !allowedExtensions[ext] {
            return nil, fmt.Errorf("不支持的文件类型: %s (%s)", name, ext)
        }

        // 校验4: 文件数限制
        result.FileCount++
        if result.FileCount > MaxFileCount {
            return nil, fmt.Errorf("文件数超过上限 %d", MaxFileCount)
        }

        // 校验5: 单文件大小
        if f.UncompressedSize64 > MaxSingleSize {
            return nil, fmt.Errorf("文件 %s 大小超过上限 (%.1fMB)", name, float64(f.UncompressedSize64)/(1<<20))
        }

        // 校验6: 路径深度
        depth := len(strings.Split(name, "/"))
        if depth > MaxPathDepth {
            return nil, fmt.Errorf("文件 %s 路径层级超过上限 %d", name, MaxPathDepth)
        }

        // 读取文件内容
        rc, err := f.Open()
        if err != nil {
            return nil, fmt.Errorf("读取文件 %s 失败: %w", name, err)
        }
        data, err := io.ReadAll(io.LimitReader(rc, MaxSingleSize+1))
        rc.Close()
        if err != nil {
            return nil, fmt.Errorf("读取文件 %s 失败: %w", name, err)
        }

        totalSize += int64(len(data))
        if totalSize > MaxTotalSize {
            return nil, fmt.Errorf("总大小超过上限 %dMB", MaxTotalSize/(1<<20))
        }

        entry := ZipEntry{Path: name, Data: data, Size: int64(len(data))}
        result.Entries = append(result.Entries, entry)

        if name == "SKILL.md" {
            result.SkillMd = data
            hasSkillMd = true
        }
    }

    if !hasSkillMd {
        return nil, fmt.Errorf("ZIP 包根目录必须包含 SKILL.md")
    }

    result.TotalSize = totalSize
    return result, nil
}

// ValidateSlug 校验 skill slug 格式。
func ValidateSlug(slug string) error {
    if !slugPattern.MatchString(slug) {
        return fmt.Errorf("slug 格式非法: 只允许小写字母、数字和连字符，首尾必须是字母或数字")
    }
    return nil
}
```

- [ ] **Step 2: 验证编译**

```bash
cd /Volumes/nidao003/Mactext/ooh/ooh-stationmatch/mclaw/backend
go build ./biz/skill/service/
```

---

### Task 3.3: 创建 S3 技能存储适配层

**文件:**
- 创建: `backend/biz/skill/service/storage.go`

- [ ] **Step 1: 创建存储适配器**

```go
package service

import (
    "bytes"
    "context"
    "fmt"
    "io"
    "path"

    "github.com/nidao003/mclaw/backend/pkg/oss"
)

// SkillStorage S3 兼容的 Skill 文件存储。
// 复用现有的 oss.Client (RustFS/S3)。
type SkillStorage struct {
    client *oss.Client
    bucket string
}

// NewSkillStorage 创建 Skill 存储实例。
func NewSkillStorage(client *oss.Client) *SkillStorage {
    return &SkillStorage{client: client, bucket: ""}
}

// skillObjectKey 生成 S3 对象键。
// 格式: skills/<slug>/v<version>/<filepath>
func skillObjectKey(slug, version, filePath string) string {
    return path.Join("skills", slug, "v"+version, filePath)
}

// UploadSkillFiles 上传 Skill 的所有文件到 S3。
func (s *SkillStorage) UploadSkillFiles(ctx context.Context, slug, version string, entries []ZipEntry) error {
    for _, entry := range entries {
        key := skillObjectKey(slug, version, entry.Path)
        if err := s.client.PutFile(ctx, "", key, bytes.NewReader(entry.Data)); err != nil {
            return fmt.Errorf("上传文件 %s 失败: %w", entry.Path, err)
        }
    }
    return nil
}

// DownloadSkillZip 从 S3 下载完整 Skill 并打包为 ZIP 返回。
func (s *SkillStorage) DownloadSkillZip(ctx context.Context, slug, version string) (io.ReadCloser, error) {
    // 此处返回 ZIP 流；实现时遍历 S3 指定前缀下的所有对象再打包。
    // 详细实现在 Task 3.4 的 Download handler 中完成。
    return nil, fmt.Errorf("未实现")
}

// GetSkillFile 从 S3 下载 Skill 的单个文件内容。
func (s *SkillStorage) GetSkillFile(ctx context.Context, slug, version, filePath string) (io.ReadCloser, error) {
    key := skillObjectKey(slug, version, filePath)
    // oss.Client 目前没有直接的 GetFile，需要用 GetObject。
    // 这里先返回接口，具体实现在 download handler 结合 S3 SDK 完成。
    return nil, fmt.Errorf("未实现")
}

// ListSkillFiles 列出 S3 中某个 Skill 版本的所有文件。
func (s *SkillStorage) ListSkillFiles(ctx context.Context, slug, version string) ([]string, error) {
    return nil, fmt.Errorf("未实现")
}
```

---

### Task 3.4: 实现 ZIP 上传 API

**文件:**
- 修改: `backend/biz/skill/handler/v1/skill.go` (新增上传 handler)
- 修改: `backend/domain/skill.go` (新增请求类型)
- 修改: `backend/biz/skill/register.go` (注册 OSS 依赖)

- [ ] **Step 1: 在 domain 中新增上传请求类型**

```go
// UploadSkillReq multipart ZIP 上传的表单字段。
type UploadSkillReq struct {
    Slug       string `form:"slug" validate:"required"`
    Name       string `form:"name" validate:"required"`
    Summary    string `form:"summary" validate:"required"`
    Version    string `form:"version"` // 默认 "1.0.0"
    Changelog  string `form:"changelog"`
    SourceType string `form:"source_type"` // "official" 或 "third_party"
    IconName   string `form:"icon_name"`
    Categories string `form:"categories"` // JSON 数组字符串
    Tags       string `form:"tags"`       // JSON 数组字符串
}
```

- [ ] **Step 2: 在 skill handler 中添加上传方法**

在 `backend/biz/skill/handler/v1/skill.go` 中新增 `UploadSkill` 方法和路由注册。

在 `NewSkillHandler` 中添加路由（发布者权限）：

```go
// Skill 上传（V2）
skills.POST("/upload", web.BaseHandler(h.UploadSkill), auth.Auth(), middleware.RequirePublish())
```

新增 handler 方法：

```go
// UploadSkill 接收 ZIP 上传，校验并存储到 S3。
func (h *SkillHandler) UploadSkill(c *web.Context) error {
    user := middleware.GetUser(c)
    if user == nil {
        return errcode.ErrUnauthorized
    }

    // 1. 解析 multipart 表单
    slug := c.FormValue("slug")
    if slug == "" {
        return errcode.ErrInvalidParameter
    }
    slug = normalizeSlug(slug) // 去 mclaw/ 前缀

    if err := service.ValidateSlug(slug); err != nil {
        return errcode.ErrInvalidParameter
    }

    name := c.FormValue("name")
    if name == "" {
        return errcode.ErrInvalidParameter
    }

    version := c.FormValue("version")
    if version == "" {
        version = "1.0.0"
    }

    // 2. 读取上传的文件
    file, _, err := c.Request().FormFile("file")
    if err != nil {
        h.logger.Error("failed to read uploaded file", "error", err)
        return errcode.ErrInvalidParameter
    }
    defer file.Close()

    zipData, err := io.ReadAll(file)
    if err != nil {
        return errcode.ErrInvalidParameter
    }

    // 3. 处理 ZIP
    result, err := service.ProcessSkillZip(c.Request().Context(), zipData)
    if err != nil {
        h.logger.Error("zip processing failed", "error", err)
        return errcode.ErrInvalidParameter
    }

    // 4. 上传到 S3（具体存储客户端注入方式见 register.go 调整）
    // h.storage.UploadSkillFiles(ctx, slug, version, result.Entries)

    // 5. 创建 skill 记录（状态 draft）
    // ...

    return c.Success(map[string]any{
        "slug":       slug,
        "version":    version,
        "file_count": result.FileCount,
        "total_size": result.TotalSize,
    })
}
```

> ⚠️ 注意：S3 存储客户端的注入需要调整 `SkillHandler` 结构体，新增 `storage *service.SkillStorage` 字段，
> 并在 `register.go` 中通过 DI 注入。具体注入方式参考 `pkg/register.go` 中 `oss.Client` 的模式。

---

## 阶段四：多文件下载 + CLI 适配

### Task 4.1: 改造下载 API 支持多文件

**文件:**
- 修改: `backend/biz/skill/handler/v1/skill.go` (修改 DownloadSkill + 新增路由)

- [ ] **Step 1: 新增下载路由**

在 `NewSkillHandler` 中添加（约第 57-59 行之后）：

```go
// V2: 多文件下载 API
w.GET("/api/v1/skills/by-slug/:slug/file-list", web.BaseHandler(h.FileList))
w.GET("/api/v1/skills/by-slug/:slug/download/*", web.BaseHandler(h.DownloadSkillFile))
```

- [ ] **Step 2: 修改 DownloadSkill — 全量 ZIP 模式**

修改现有的 `downloadSkillInternal` 方法：

当无文件路径时（`DownloadSkill` / `DownloadSkillVersion`），检测 Skill 是否存储在 S3：
- 若 `minio_path != ""`：从 S3 打包 ZIP 流式返回
- 若无（向后兼容）：继续现有逻辑，返回 SKILL.md 文本

```go
func (h *SkillHandler) downloadSkillInternal(c *web.Context, slug, version string) error {
    slug = normalizeSlug(slug)
    s, err := h.skillRepo.GetBySkillID(c.Request().Context(), slug)
    if err != nil {
        return errcode.ErrSkillNotFound
    }
    if s.Status != "published" {
        return errcode.ErrSkillNotFound
    }

    // V2: 如果 Skill 存储在 S3，返回完整 ZIP
    if s.MinioPath != "" {
        // 获取目标版本
        targetVersion := version
        if targetVersion == "" {
            versions, _ := h.versionRepo.ListBySkill(c.Request().Context(), s.ID)
            if len(versions) > 0 {
                targetVersion = versions[len(versions)-1].Version
            }
        }
        if targetVersion == "" {
            targetVersion = "1.0.0"
        }
        // 流式返回 ZIP
        return h.streamSkillZip(c, slug, targetVersion)
    }

    // 向后兼容：返回 SKILL.md 文本
    // ... 现有代码不变 ...
}
```

- [ ] **Step 3: 新增 FileList handler**

```go
// FileList 返回 Skill 的所有文件列表。
func (h *SkillHandler) FileList(c *web.Context) error {
    slug := normalizeSlug(c.Param("slug"))
    // TODO: 从 S3 list objects，或从 db 的 file_manifest JSON 读取
    return c.Success(map[string]any{"files": []string{}, "slug": slug})
}
```

- [ ] **Step 4: 新增 DownloadSkillFile（单文件下载）**

```go
// DownloadSkillFile 下载 Skill 中的指定文件。
// 路由 /* 匹配子路径，如 /download/scripts/main.py
func (h *SkillHandler) DownloadSkillFile(c *web.Context) error {
    slug := normalizeSlug(c.Param("slug"))
    filePath := c.Param("*")
    if filePath == "" || filePath == "/" {
        filePath = "SKILL.md"
    }
    // TODO: 从 S3 读取单文件内容
    return errcode.ErrSkillNotFound
}
```

---

### Task 4.2: CLI 适配多文件下载

**文件:**
- 修改: `packages/cli/src/sources/registry.ts`
- 修改: `packages/cli/src/commands/add.ts`

- [ ] **Step 1: 改造 CLI downloadSkill 支持 ZIP 模式**

修改 `packages/cli/src/sources/registry.ts` 的 `downloadSkill` 函数：

```typescript
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import * as unzipper from 'unzipper';

const execAsync = promisify(exec);

async function downloadSkillZip(slug: string, version: string, destDir: string): Promise<number> {
  const config = await loadConfig();
  const downloadPath = version
    ? `skills/by-slug/${slug}/versions/${version}/download`
    : `skills/by-slug/${slug}/download`;
  const downloadUrl = `${config.registryUrl}/${downloadPath}`;

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`下载失败 (${res.status}): ${res.statusText}`);
  }

  // 检查 Content-Type：如果是 markdown 则是单文件旧格式，否则是 ZIP
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('markdown') || contentType.includes('text/plain')) {
    // 向后兼容：单文件 SKILL.md
    await mkdir(destDir, { recursive: true });
    const body = await res.text();
    await writeFile(join(destDir, 'SKILL.md'), body, 'utf-8');
    return 1;
  }

  // V2: ZIP 多文件模式
  // 下载 ZIP 到临时目录
  const tmpDir = join(destDir, '..', `.tmp-${slug}`);
  await mkdir(tmpDir, { recursive: true });
  const zipPath = join(tmpDir, `${slug}.zip`);

  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(zipPath, buffer);

  // 解压
  const zipStream = createReadStream(zipPath);
  await pipeline(
    zipStream,
    unzipper.Extract({ path: destDir })
  );

  // 清理临时文件
  await fs.rm(tmpDir, { recursive: true });

  return -1; // 文件数未知（后续从 file-list API 获取）
}
```

> ⚠️ 注意：需要安装 `unzipper` 包或改用 Node.js 内置的 zlib + tar 处理 ZIP。
> Node 18+ 没有内置 unzip，建议使用 `adm-zip` 包或通过 child_process 调用 `unzip`。

- [ ] **Step 2: 修改 add.ts 适配新流程**

在 `packages/cli/src/commands/add.ts` 中，安装完成后保存 `.installed.json`：

```typescript
// 安装完成后写入元数据
const metadata: InstalledMetadata = {
  slug,
  version: installVersion,
  source: 'registry',
  installed_at: new Date().toISOString(),
};
await writeFile(
  join(destDir, '.installed.json'),
  JSON.stringify(metadata, null, 2),
  'utf-8',
);
```

同时更新 `packages/cli/src/types.ts`，添加 `InstalledMetadata` 类型：

```typescript
export interface InstalledMetadata {
  slug: string;
  version: string;
  source: 'registry' | 'npm' | 'git';
  installed_at: string;
  file_count?: number;
  total_size?: number;
}
```

---

## 阶段五：npm 自动发布

### Task 5.1: 创建 npm 发布服务

**文件:**
- 创建: `backend/biz/skill/service/npm_publisher.go`

- [ ] **Step 1: 创建 NpmPublisher**

```go
package service

import (
    "context"
    "encoding/json"
    "fmt"
    "log/slog"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
)

// NpmPublishConfig npm 发布配置。
type NpmPublishConfig struct {
    Token    string // npm access token
    Registry string // npm registry URL（默认 https://registry.npmjs.org）
    TempDir  string // 临时构建目录
}

// NpmPublisher 负责将审核通过的 Skill 发布到 npm。
type NpmPublisher struct {
    config NpmPublishConfig
    logger *slog.Logger
}

// NewNpmPublisher 创建 npm 发布器。
func NewNpmPublisher(cfg NpmPublishConfig, logger *slog.Logger) *NpmPublisher {
    if cfg.Registry == "" {
        cfg.Registry = "https://registry.npmjs.org"
    }
    if cfg.TempDir == "" {
        cfg.TempDir = os.TempDir()
    }
    return &NpmPublisher{config: cfg, logger: logger.With("module", "npm.publisher")}
}

// PackageJSON npm 包的 package.json 模板数据。
type PackageJSON struct {
    Name        string            `json:"name"`
    Version     string            `json:"version"`
    Description string            `json:"description"`
    Main        string            `json:"main"`
    Files       []string          `json:"files"`
    Keywords    []string          `json:"keywords"`
    License     string            `json:"license"`
    Mclaw       map[string]string `json:"mclaw"`
}

// Publish 发布 Skill 到 npm。
// scope: "@mclaw-skill" (官方) 或 "@mclaw-community" (第三方)
func (p *NpmPublisher) Publish(ctx context.Context, skillName, slug, version, summary, scope string, tags []string) error {
    p.logger.Info("starting npm publish", "slug", slug, "version", version)

    // 1. 构建临时目录
    buildDir := filepath.Join(p.config.TempDir, fmt.Sprintf("npm-%s-%s", slug, version))
    if err := os.MkdirAll(buildDir, 0755); err != nil {
        return fmt.Errorf("创建构建目录失败: %w", err)
    }
    defer os.RemoveAll(buildDir)

    // 2. 生成 package.json
    pkgName := fmt.Sprintf("%s/%s", scope, slug)
    pkg := PackageJSON{
        Name:        pkgName,
        Version:     version,
        Description: summary,
        Main:        "SKILL.md",
        Files:       []string{"SKILL.md", "files/**"},
        Keywords:    append([]string{"mclaw-skill"}, tags...),
        License:     "MIT",
        Mclaw: map[string]string{
            "slug":        slug,
            "source_type": scopeToSourceType(scope),
        },
    }

    pkgData, err := json.MarshalIndent(pkg, "", "  ")
    if err != nil {
        return fmt.Errorf("序列化 package.json 失败: %w", err)
    }
    if err := os.WriteFile(filepath.Join(buildDir, "package.json"), pkgData, 0644); err != nil {
        return fmt.Errorf("写入 package.json 失败: %w", err)
    }

    // 3. 写入 .npmrc 配置 token
    npmrcContent := fmt.Sprintf("//registry.npmjs.org/:_authToken=%s\n", p.config.Token)
    os.WriteFile(filepath.Join(buildDir, ".npmrc"), []byte(npmrcContent), 0600)

    // 4. 从 S3 下载 SKILL.md + 附件到 buildDir（需要在 ctx 中传入 SkillStorage）
    // 具体下载逻辑通过 NpmPublisher 持有的 SkillStorage 引用完成
    // TODO: 注入 SkillStorage 引用

    // 5. 执行 npm publish
    cmd := exec.CommandContext(ctx, "npm", "publish", "--access", "public")
    cmd.Dir = buildDir
    output, err := cmd.CombinedOutput()
    if err != nil {
        p.logger.Error("npm publish failed",
            "slug", slug,
            "version", version,
            "output", string(output),
            "error", err,
        )
        return fmt.Errorf("npm publish 失败: %w\n%s", err, string(output))
    }

    p.logger.Info("npm publish succeeded", "slug", slug, "version", version)
    return nil
}

func scopeToSourceType(scope string) string {
    if scope == "@mclaw-community" {
        return "third_party"
    }
    return "official"
}
```

---

### Task 5.2: 审核通过后触发 npm 发布

**文件:**
- 修改: `backend/biz/skill/handler/v1/skill.go` (修改 ReviewSkill)

- [ ] **Step 1: 修改 ReviewSkill 异步触发发布**

在 `ReviewSkill` 方法中，审核通过后添加异步 npm 发布：

```go
func (h *SkillHandler) ReviewSkill(c *web.Context) error {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        return errcode.ErrSkillNotFound
    }

    user := middleware.GetUser(c)
    if user == nil {
        return errcode.ErrUnauthorized
    }

    var req domain.AdminReviewSkillReq
    if err := decodeJSONBody(c, &req); err != nil {
        return errcode.ErrInvalidParameter
    }

    // 创建审核记录
    _, err = h.reviewRepo.Create(c.Request().Context(), &db.SkillReview{
        ID:          uuid.New(),
        SkillID:     id,
        ReviewerID:  user.ID,
        Status:      req.Status,
        Comment:     req.Comment,
    })
    if err != nil {
        return err
    }

    // 更新技能状态
    status := "rejected"
    if req.Status == "approved" {
        status = "published"
    }

    if err := h.skillRepo.Update(c.Request().Context(), id, map[string]any{
        "status":             status,
        "npm_publish_status": "pending",
    }); err != nil {
        return err
    }

    // V2: 审核通过后异步发布到 npm
    if status == "published" && h.npmPublisher != nil {
        go func(skillID uuid.UUID) {
            // 获取 skill 详情用于发布
            // h.skillRepo.Get(ctx, skillID)
            // h.npmPublisher.Publish(ctx, ...)
            // 发布完成后更新 npm_publish_status
        }(id)
    }

    return nil
}
```

---

## 阶段六：前端 — Web 侧栏 + 权限菜单

### Task 6.1: 更新前端 User 类型 + Auth Store

**文件:**
- 修改: `packages/shared/src/types/user.ts`
- 修改: `packages/shared/src/stores/authStore.ts`

- [ ] **Step 1: 扩展 User 角色类型**

修改 `packages/shared/src/types/user.ts`：

```typescript
// V2 扩展角色
export type UserRole = 'user' | 'publisher' | 'reviewer' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;  // V2: 扩展类型
  created_at: string;
}
```

- [ ] **Step 2: authStore 新增权限判断方法**

修改 `packages/shared/src/stores/authStore.ts`，新增 helper：

```typescript
// 权限判断 helpers（V2）
export function canPublish(role?: UserRole): boolean {
  if (!role) return false;
  return ['super_admin', 'admin', 'reviewer', 'publisher'].includes(role);
}

export function canReview(role?: UserRole): boolean {
  if (!role) return false;
  return ['super_admin', 'admin', 'reviewer'].includes(role);
}

export function canManageUsers(role?: UserRole): boolean {
  if (!role) return false;
  return ['super_admin', 'admin'].includes(role);
}

export function isAdmin(role?: UserRole): boolean {
  return canReview(role);
}
```

同时在 Zustand store 中添加 `isPublisher`, `isReviewer`, `isSuperAdmin` 计算属性。

---

### Task 6.2: 创建 Web 左侧菜单栏 + 权限动态菜单

**文件:**
- 创建: `apps/web/src/components/layout/WebSidebar.tsx`
- 修改: `apps/web/src/components/layout/Layout.tsx`
- 修改: `apps/web/src/App.tsx`

- [ ] **Step 1: 创建侧栏组件**

新建 `apps/web/src/components/layout/WebSidebar.tsx`：

```tsx
import { NavLink, useLocation } from 'react-router-dom';
import {
  Grid3x3, TrendingUp, Package, Upload,
  CheckCircle, Users, Settings, LogIn,
} from 'lucide-react';
import { useAuthStore, canPublish, canReview, canManageUsers } from '@shared/stores/authStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;       // 权限控制
  dividerAfter?: boolean;
}

export default function WebSidebar() {
  const user = useAuthStore(s => s.user);
  const role = user?.role;

  const navItems: NavItem[] = [
    // 公开访问
    { label: '技能市场', path: '/skills', icon: Grid3x3, show: true },
    { label: '趋势', path: '/skills/trending', icon: TrendingUp, show: true },
    // 发布者+
    { label: '我的技能', path: '/my-skills', icon: Package, show: !!user && canPublish(role), dividerAfter: true },
    { label: '上传技能', path: '/skills/upload', icon: Upload, show: !!user && canPublish(role) },
    // 审核员+
    { label: '技能审核', path: '/admin/skills', icon: CheckCircle, show: !!user && canReview(role), dividerAfter: true },
    // 超级管理员
    { label: '用户管理', path: '/admin/users', icon: Users, show: !!user && canManageUsers(role), dividerAfter: true },
    // 登录用户
    { label: '设置', path: '/settings', icon: Settings, show: !!user },
  ];

  const location = useLocation();

  return (
    <aside className="w-[220px] min-w-[220px] border-r border-skillhub-line bg-white h-[calc(100vh-68px)] sticky top-[68px] overflow-y-auto py-4">
      <nav className="flex flex-col gap-0.5 px-3">
        {navItems.filter(item => item.show).map((item, idx) => (
          <div key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-skillhub-ink/70 hover:bg-skillhub-soft hover:text-skillhub-ink'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
            {item.dividerAfter && <div className="my-2 border-t border-skillhub-line mx-2" />}
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: 集成到 Layout 组件**

修改 `apps/web/src/components/layout/Layout.tsx`，将主内容区包裹在侧栏 + 内容区的横向布局中：

```tsx
// 在 <main className="flex-1"> 处替换为：
<div className="flex flex-1">
  <WebSidebar />
  <main className="flex-1 min-w-0">
    <Outlet />
  </main>
</div>
```

> ⚠️ 注意：需要 import `WebSidebar` 组件。

- [ ] **Step 3: 新增路由配置**

修改 `apps/web/src/App.tsx`，新增 V2 路由：

```tsx
// 新增路由（在现有 <Route> 内部嵌套的 <Layout> 中）
<Route path="/my-skills" element={<MySkills />} />
<Route path="/skills/upload" element={<SkillUpload />} />
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<Navigate to="/admin/skills" replace />} />
  <Route path="skills" element={<AdminSkills />} />
  <Route path="users" element={<AdminUsers />} />
</Route>
```

---

## 阶段七：前端 — 管理页面

### Task 7.1: 「我的技能」页面

**文件:**
- 创建: `apps/web/src/pages/MySkills/index.tsx`

- [ ] **Step 1: 实现我的技能页面**

```tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, ExternalLink, ToggleLeft, ToggleRight, ChevronUp } from 'lucide-react';
import { skillApi } from '@shared/api/skill';
import type { SkillDetail } from '@shared/types/skill';
import { useAuthStore } from '@shared/stores/authStore';

export default function MySkills() {
  const user = useAuthStore(s => s.user);
  const [skills, setSkills] = useState<SkillDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // 暂时用 list API + author_id 过滤，后续改用 /api/v1/skills/mine
    skillApi.list({ author_id: user.id, limit: 50 })
      .then(res => setSkills(res.skills))
      .finally(() => setLoading(false));
  }, [user]);

  const stats = {
    total: skills.length,
    published: skills.filter(s => s.status === 'published').length,
    draft: skills.filter(s => s.status === 'draft').length,
    disabled: skills.filter(s => s.status === 'disabled').length,
  };

  const statusLabel: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审核',
    published: '已发布',
    archived: '已归档',
    disabled: '已停用',
    rejected: '已拒绝',
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-500',
    disabled: 'bg-red-100 text-red-600',
    rejected: 'bg-red-50 text-red-500',
  };

  if (loading) return <div className="p-8 text-skillhub-ink/40">加载中...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '全部技能', value: stats.total, icon: Package },
          { label: '已发布', value: stats.published, icon: ExternalLink },
          { label: '草稿', value: stats.draft, icon: Plus },
          { label: '已停用', value: stats.disabled, icon: ToggleLeft },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-skillhub-line rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Icon className="w-5 h-5 text-skillhub-ink/40" />
              <span className="text-sm text-skillhub-ink/50">{label}</span>
            </div>
            <div className="text-3xl font-bold text-skillhub-ink">{value}</div>
          </div>
        ))}
      </div>

      {/* 技能表格 */}
      <div className="bg-white border border-skillhub-line rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-skillhub-line flex items-center justify-between">
          <h2 className="text-lg font-semibold text-skillhub-ink">技能列表</h2>
          <Link
            to="/skills/upload"
            className="flex items-center gap-2 px-4 py-2 bg-skillhub-blue text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            上传新技能
          </Link>
        </div>

        {skills.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 text-skillhub-ink/20 mx-auto mb-4" />
            <p className="text-skillhub-ink/50 mb-4">还没有上传任何技能</p>
            <Link
              to="/skills/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-skillhub-blue text-white rounded-xl font-medium"
            >
              <Plus className="w-4 h-4" /> 上传第一个技能
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-skillhub-soft border-b border-skillhub-line">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">技能</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">Slug</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">状态</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">版本</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">安装</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {skills.map(skill => (
                <tr key={skill.id} className="border-b border-skillhub-line hover:bg-skillhub-soft/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{skill.icon || '📦'}</span>
                      <div>
                        <Link to={`/skills/${skill.skill_id}`} className="font-medium text-skillhub-ink hover:text-skillhub-blue">
                          {skill.name}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-skillhub-ink/50 font-mono">{skill.skill_id}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[skill.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[skill.status] || skill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-skillhub-ink/50">
                    {skill.versions?.[skill.versions.length - 1]?.version || '-'}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-skillhub-ink/50">
                    {skill.install_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link to={`/skills/${skill.skill_id}`} className="p-1.5 hover:bg-skillhub-soft rounded-lg transition-colors">
                        <ExternalLink className="w-4 h-4 text-skillhub-ink/40" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

> ⚠️ import 需要在文件顶部添加 `Upload`。

---

### Task 7.2: 「上传技能」页面

**文件:**
- 创建: `apps/web/src/pages/Skills/Upload.tsx`

- [ ] **Step 1: 实现 ZIP 上传页面（骨架）**

```tsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileArchive, X, CheckCircle } from 'lucide-react';

export default function SkillUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // 表单字段
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [version, setVersion] = useState('1.0.0');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.zip')) {
      setFile(f);
      setError('');
    } else {
      setError('只支持 .zip 格式文件');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !slug) {
      setError('请填写必填字段并上传 ZIP 文件');
      return;
    }
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('slug', slug);
    formData.append('summary', summary);
    formData.append('version', version);

    try {
      const res = await fetch('/api/v1/skills/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('上传失败');
      navigate('/my-skills');
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 64);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-skillhub-ink mb-2">上传新技能</h1>
      <p className="text-skillhub-ink/50 mb-8">上传 ZIP 压缩包，包含 SKILL.md 和附件资源</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 拖拽上传区 */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            file
              ? 'border-green-300 bg-green-50'
              : 'border-skillhub-line hover:border-skillhub-blue/40 bg-skillhub-soft/50'
          }`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3 text-green-700">
              <CheckCircle className="w-6 h-6" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-green-600">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button type="button" onClick={() => setFile(null)} className="ml-4 p-1 hover:bg-green-200 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <FileArchive className="w-12 h-12 text-skillhub-ink/20 mx-auto mb-4" />
              <p className="text-skillhub-ink/50 mb-2">拖拽 ZIP 文件到此处</p>
              <p className="text-sm text-skillhub-ink/30">或点击下方选择文件</p>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-4 text-sm"
              />
            </>
          )}
        </div>

        {/* 表单字段 */}
        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">技能名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSlug(generateSlug(e.target.value)); }}
            placeholder="例如: 中文公文排版"
            className="w-full px-4 py-3 bg-white border border-skillhub-line rounded-xl text-sm focus:outline-none focus:border-skillhub-blue focus:ring-1 focus:ring-skillhub-blue/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">唯一标识 (slug) *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="chinese-official-word-style"
            className="w-full px-4 py-3 bg-white border border-skillhub-line rounded-xl text-sm font-mono focus:outline-none focus:border-skillhub-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">简介 *</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="简要描述这个技能的功能..."
            className="w-full px-4 py-3 bg-white border border-skillhub-line rounded-xl text-sm focus:outline-none focus:border-skillhub-blue resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">版本号</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-skillhub-line rounded-xl text-sm font-mono focus:outline-none focus:border-skillhub-blue"
          />
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={uploading || !file || !name || !slug}
          className="w-full py-3.5 bg-skillhub-blue text-white rounded-xl font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : '提交上传'}
        </button>
      </form>
    </div>
  );
}
```

---

### Task 7.3: 「用户管理」页面（超级管理员）

**文件:**
- 创建: `apps/web/src/pages/Admin/Users.tsx`

- [ ] **Step 1: 实现用户管理页面（骨架）**

```tsx
import { useState, useEffect } from 'react';
import { Users, Shield, ChevronDown } from 'lucide-react';
import { useAuthStore, canManageUsers } from '@shared/stores/authStore';
import type { User, UserRole } from '@shared/types/user';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: '普通用户' },
  { value: 'publisher', label: '技能上传者' },
  { value: 'reviewer', label: '审核员' },
  { value: 'super_admin', label: '超级管理员' },
];

export default function AdminUsers() {
  const currentUser = useAuthStore(s => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !canManageUsers(currentUser.role)) return;
    fetch('/api/v1/admin/users', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUsers(data.data?.users || []))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  if (loading) return <div className="p-8 text-skillhub-ink/40">加载中...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-skillhub-ink mb-2">用户管理</h1>
      <p className="text-skillhub-ink/50 mb-8">管理用户角色和权限分配</p>

      <div className="bg-white border border-skillhub-line rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-skillhub-soft border-b border-skillhub-line">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">用户</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">邮箱</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">角色</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">注册时间</th>
              <th className="px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-skillhub-line">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-sm font-medium text-brand">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-skillhub-ink">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-skillhub-ink/50">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-skillhub-soft rounded-full text-xs font-medium text-skillhub-ink/70">
                    <Shield className="w-3 h-3" />
                    {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-skillhub-ink/50">
                  {new Date(u.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    disabled={u.id === currentUser?.id}
                    className="px-3 py-1.5 bg-white border border-skillhub-line rounded-lg text-sm focus:outline-none focus:border-skillhub-blue disabled:opacity-40"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 阶段八：图标系统

### Task 8.1: 创建预设图标选择器组件

**文件:**
- 创建: `packages/shared/src/components/skill/IconPicker.tsx`

- [ ] **Step 1: 定义内置图标列表**

```tsx
import { useState } from 'react';
import {
  Rocket, Zap, Target, Star, Flame, Heart, Sun, Moon, Cloud,
  Code, Bug, Wrench, Package, Database, Globe, Server, Terminal,
  Brain, Bot, BarChart3, Microscope, Dna, Cpu,
  Pencil, FileText, Clipboard, BookOpen, Lightbulb,
  Wallet, TrendingUp, Building, Ticket, Gift,
  Camera, Music, Video, Palette, ShoppingBag,
  Briefcase, GraduationCap, Shield, Truck, Home,
  MessageCircle, Send, Bell, ThumbsUp, Share,
  Search, Filter, Settings2, RefreshCw, Download,
  Play, Pause, SkipForward, Repeat, Shuffle,
  FolderOpen, Paperclip, Link2, MapPin, Phone,
} from 'lucide-react';

const PRESET_ICONS = [
  { name: 'rocket', icon: Rocket, category: '通用', color: '#EE7C4B' },
  { name: 'zap', icon: Zap, category: '通用', color: '#F59E0B' },
  { name: 'target', icon: Target, category: '通用', color: '#EF4444' },
  { name: 'star', icon: Star, category: '通用', color: '#F59E0B' },
  { name: 'flame', icon: Flame, category: '通用', color: '#F97316' },
  { name: 'heart', icon: Heart, category: '通用', color: '#EC4899' },
  { name: 'code', icon: Code, category: '编程', color: '#3B82F6' },
  { name: 'bug', icon: Bug, category: '编程', color: '#84CC16' },
  { name: 'wrench', icon: Wrench, category: '编程', color: '#6B7280' },
  { name: 'package', icon: Package, category: '编程', color: '#8B5CF6' },
  { name: 'database', icon: Database, category: '编程', color: '#06B6D4' },
  { name: 'terminal', icon: Terminal, category: '编程', color: '#10B981' },
  { name: 'brain', icon: Brain, category: 'AI', color: '#A855F7' },
  { name: 'bot', icon: Bot, category: 'AI', color: '#6366F1' },
  { name: 'chart3', icon: BarChart3, category: 'AI', color: '#14B8A6' },
  { name: 'microscope', icon: Microscope, category: 'AI', color: '#0EA5E9' },
  { name: 'pencil', icon: Pencil, category: '文档', color: '#F97316' },
  { name: 'file-text', icon: FileText, category: '文档', color: '#64748B' },
  { name: 'clipboard', icon: Clipboard, category: '文档', color: '#06B6D4' },
  { name: 'book-open', icon: BookOpen, category: '文档', color: '#8B5CF6' },
  { name: 'wallet', icon: Wallet, category: '商务', color: '#10B981' },
  { name: 'trending-up', icon: TrendingUp, category: '商务', color: '#22C55E' },
  { name: 'building', icon: Building, category: '商务', color: '#64748B' },
  { name: 'camera', icon: Camera, category: '创意', color: '#EC4899' },
  { name: 'palette', icon: Palette, category: '创意', color: '#F43F5E' },
  { name: 'music', icon: Music, category: '创意', color: '#A855F7' },
  { name: 'search', icon: Search, category: '工具', color: '#3B82F6' },
  { name: 'settings2', icon: Settings2, category: '工具', color: '#6B7280' },
  { name: 'download', icon: Download, category: '工具', color: '#10B981' },
  { name: 'link2', icon: Link2, category: '工具', color: '#6366F1' },
] as const;

interface IconPickerProps {
  selected: string;
  onSelect: (iconName: string) => void;
  className?: string;
}

export default function IconPicker({ selected, onSelect, className }: IconPickerProps) {
  const [category, setCategory] = useState('全部');
  const categories = ['全部', ...Array.from(new Set(PRESET_ICONS.map(i => i.category)))];

  const filtered = category === '全部'
    ? PRESET_ICONS
    : PRESET_ICONS.filter(i => i.category === category);

  return (
    <div className={className}>
      {/* 分类标签 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-skillhub-blue text-white'
                : 'bg-skillhub-soft text-skillhub-ink/60 hover:text-skillhub-ink'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 图标网格 */}
      <div className="grid grid-cols-8 gap-2">
        {filtered.map(({ name, icon: Icon, color }) => (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
              selected === name
                ? 'bg-brand/10 ring-2 ring-brand ring-offset-1'
                : 'hover:bg-skillhub-soft'
            }`}
            title={name}
          >
            <Icon className="w-8 h-8" style={{ color: selected === name ? '#EE7C4B' : color }} />
            <span className="text-[10px] text-skillhub-ink/40 truncate max-w-[64px]">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 从 shared index 导出 IconPicker**

修改 `packages/shared/src/components/index.ts`：
```typescript
export { default as IconPicker } from './skill/IconPicker';
```

---

## 前端 API 层补充

### Task A.1: 更新前端 Skill 类型定义

**文件:**
- 修改: `packages/shared/src/types/skill.ts`

- [ ] **Step 1: 同步前后端字段**

```typescript
// V2 扩展 SkillStatus
export type SkillStatus =
  | 'draft' | 'pending_review' | 'published'
  | 'archived' | 'disabled' | 'rejected';

// V2 扩展 SkillDetail
export interface SkillDetail {
  // ... 已有字段 ...
  // V2 新增
  source_type: string;        // 'official' | 'third_party'
  icon_name?: string;         // 预设图标名称
  summary?: string;           // 技能简介
  minio_path?: string;        // S3 存储路径
  npm_publish_status?: string; // pending|publishing|published|failed
  file_count?: number;
  total_size?: number;
}

// V2 新增类型
export type SourceType = 'official' | 'third_party';

// V2: ListSkillReq 新增 source_type 过滤
export interface ListSkillReq {
  // ... 已有字段 ...
  source_type?: SourceType;
}
```

---

## 执行顺序汇总

| 阶段 | 内容 | 依赖 | 预计工时 |
|------|------|------|---------|
| 一 | 权限系统（角色 + 中间件 + Admin API） | 无 | 4h |
| 二 | Skill Schema 升级（Ent + Domain + Migration） | 阶段一 | 2h |
| 三 | ZIP 上传 + 对象存储 | 阶段一、二 | 6h |
| 四 | 多文件下载 + CLI 适配 | 阶段三 | 4h |
| 五 | npm 自动发布 | 阶段三、四 | 4h |
| 六 | 前端侧栏 + 权限菜单 | 阶段一（后端权限就绪） | 3h |
| 七 | 前端管理页面（我的技能/上传/用户管理） | 阶段六 | 6h |
| 八 | 图标系统 | 阶段六 | 2h |

**总计约 31 小时开发时间。** 阶段一、二、六可部分并行（后端权限 + 前端侧栏）。

---

## 后端环境变量新增

```bash
# Skills Hub V2 新增
MCAI_OBJECT_STORAGE_SKILL_PREFIX=skills
MCAI_NPM_TOKEN=npm_xxxxxxxx  # npm access token
MCAI_NPM_REGISTRY=https://registry.npmjs.org
```

---

## 待确认事项

1. **UserRepo 接口** — 当前 `domain/user.go` 中 UserRepo 的实际定义需要确认，以上任务中假设了接口签名
2. **SkillHandler 注入 OSS Client** — 需要在 `register.go` 中通过 DI 注入 `*oss.Client`，参考 `pkg/register.go` 模式
3. **npm token 安全存储** — 生产环境 npm token 建议通过 Kubernetes Secrets 或环境变量注入
4. **CLI unzip 方案** — Node.js 无内置 ZIP 解压，需选择 `adm-zip` 包或依赖系统 `unzip` 命令
5. **数据库迁移编号** — 确认当前最新迁移版本号，避免冲突
