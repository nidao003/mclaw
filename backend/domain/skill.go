package domain

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/db"
)

// SkillUsecase defines the business logic for the skill marketplace.
type SkillUsecase interface {
	// List returns a paginated list of published skills.
	List(ctx context.Context, req *ListSkillReq) (*ListSkillResp, error)
	// Get returns a single skill by ID.
	Get(ctx context.Context, id uuid.UUID) (*SkillDetail, error)
	// Create creates a new skill draft.
	Create(ctx context.Context, authorID uuid.UUID, req *CreateSkillReq) (*SkillDetail, error)
	// Update updates an existing skill.
	Update(ctx context.Context, id uuid.UUID, authorID uuid.UUID, req *UpdateSkillReq) (*SkillDetail, error)
	// Delete soft-deletes a skill.
	Delete(ctx context.Context, id uuid.UUID, authorID uuid.UUID) error
	// PublishVersion publishes a new version of a skill.
	PublishVersion(ctx context.Context, skillID uuid.UUID, authorID uuid.UUID, req *PublishVersionReq) error
	// Install atomically increments the install counter for a skill.
	Install(ctx context.Context, skillID uuid.UUID) error
	// Rate adds a rating for a skill.
	Rate(ctx context.Context, skillID uuid.UUID, userID uuid.UUID, req *RateSkillReq) error
	// ListRatings returns ratings for a skill.
	ListRatings(ctx context.Context, skillID uuid.UUID, req *ListSkillReq) ([]*SkillRating, error)
}

// SkillRepo defines the data access for skills.
type SkillRepo interface {
	List(ctx context.Context, req *ListSkillReq) ([]*db.Skill, int, error)
	Get(ctx context.Context, id uuid.UUID) (*db.Skill, error)
	GetBySkillID(ctx context.Context, skillID string) (*db.Skill, error)
	Create(ctx context.Context, skill *db.Skill) (*db.Skill, error)
	Update(ctx context.Context, id uuid.UUID, updates map[string]any) error
	Delete(ctx context.Context, id uuid.UUID) error
	// IncrementInstall atomically increments the install counter for a skill.
	IncrementInstall(ctx context.Context, id uuid.UUID) error
}

// SkillVersionRepo defines the data access for skill versions.
type SkillVersionRepo interface {
	Create(ctx context.Context, v *db.SkillVersion) (*db.SkillVersion, error)
	ListBySkill(ctx context.Context, skillID uuid.UUID) ([]*db.SkillVersion, error)
}

// SkillReviewRepo defines the data access for skill reviews.
type SkillReviewRepo interface {
	Create(ctx context.Context, r *db.SkillReview) (*db.SkillReview, error)
	GetLatestBySkill(ctx context.Context, skillID uuid.UUID) (*db.SkillReview, error)
	ListPending(ctx context.Context, req *ListSkillReq) ([]*db.Skill, int, error)
}

// SkillRatingRepo defines the data access for skill ratings.
type SkillRatingRepo interface {
	Create(ctx context.Context, r *db.SkillRating) (*db.SkillRating, error)
	GetByUserAndSkill(ctx context.Context, userID, skillID uuid.UUID) (*db.SkillRating, error)
	ListBySkill(ctx context.Context, skillID uuid.UUID, limit, offset int) ([]*db.SkillRating, error)
}

// --- Domain Models ---

// SkillDetail represents a skill with full details.
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

// SkillVersionDetail represents a skill version.
type SkillVersionDetail struct {
	ID        uuid.UUID `json:"id"`
	Version   string    `json:"version"`
	Content   string    `json:"content,omitempty"`
	Changelog string    `json:"changelog"`
	CreatedAt time.Time `json:"created_at"`
}

// SkillRating represents a user rating for a skill.
type SkillRating struct {
	ID        uuid.UUID `json:"id"`
	SkillID   uuid.UUID `json:"skill_id"`
	UserID    uuid.UUID `json:"user_id"`
	Score     int       `json:"score"`
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"created_at"`
}

// --- Request/Response Types ---

// ListSkillReq is the request for listing skills.
type ListSkillReq struct {
	Cursor     string `query:"cursor"`
	Limit      int    `query:"limit"`
	Search     string `query:"search,omitempty"`
	Category   string `query:"category,omitempty"`
	Status     string `query:"status,omitempty"`
	AuthorID   string `query:"author_id,omitempty"`
	SortBy     string `query:"sort_by,omitempty"` // rating, installs, newest
	SourceType string `query:"source_type,omitempty"` // V2: official | third_party
}

// ListSkillResp is the paginated skill list response.
type ListSkillResp struct {
	Skills []*SkillDetail `json:"skills"`
	Page   *CursorPage    `json:"page,omitempty"`
}

// CreateSkillReq is the request to create a new skill.
type CreateSkillReq struct {
	Name        string         `json:"name" validate:"required"`
	SkillID     string         `json:"skill_id" validate:"required"`
	Description string         `json:"description"`
	Categories  []string       `json:"categories"`
	Tags        []string       `json:"tags"`
	Icon        string         `json:"icon"`
	Content     string         `json:"content"`
	ArgsSchema  map[string]any `json:"args_schema"`
}

// UpdateSkillReq is the request to update a skill.
type UpdateSkillReq struct {
	Name        *string        `json:"name,omitempty"`
	Description *string        `json:"description,omitempty"`
	Categories  []string       `json:"categories,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
	Icon        *string        `json:"icon,omitempty"`
	Content     *string        `json:"content,omitempty"`
	ArgsSchema  map[string]any `json:"args_schema,omitempty"`
}

// PublishVersionReq is the request to publish a new skill version.
type PublishVersionReq struct {
	Version   string `json:"version" validate:"required"`
	Content   string `json:"content"`
	Changelog string `json:"changelog"`
}

// RateSkillReq is the request to rate a skill.
type RateSkillReq struct {
	Score   int    `json:"score" validate:"required,min=1,max=5"`
	Comment string `json:"comment"`
}

// --- Admin Request Types ---

// AdminReviewSkillReq is the request for admins to review a skill.
type AdminReviewSkillReq struct {
	Status  string `json:"status" validate:"required"` // approved, rejected
	Comment string `json:"comment"`
}

// AdminArchiveSkillReq is the request for admins to archive a skill.
type AdminArchiveSkillReq struct {
	Reason string `json:"reason"`
}

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

// UploadSkillReq multipart ZIP upload form fields.
type UploadSkillReq struct {
	Slug       string `form:"slug" validate:"required"`
	Name       string `form:"name" validate:"required"`
	Summary    string `form:"summary" validate:"required"`
	Version    string `form:"version"`     // default "1.0.0"
	Changelog  string `form:"changelog"`
	SourceType string `form:"source_type"` // "official" or "third_party"
	IconName   string `form:"icon_name"`
	Categories string `form:"categories"` // JSON array string
	Tags       string `form:"tags"`        // JSON array string
}
