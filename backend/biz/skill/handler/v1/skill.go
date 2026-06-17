package v1

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/GoYoko/web"
	"github.com/google/uuid"
	"github.com/samber/do"
	"gopkg.in/yaml.v3"

	"github.com/nidao003/mclaw/backend/biz/skill/service"
	"github.com/nidao003/mclaw/backend/config"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
	"github.com/nidao003/mclaw/backend/middleware"
	"github.com/nidao003/mclaw/backend/pkg/oss"
)

// SkillHandler handles skill marketplace API endpoints.
type SkillHandler struct {
	skillUsecase domain.SkillUsecase
	reviewRepo   domain.SkillReviewRepo
	skillRepo    domain.SkillRepo
	versionRepo  domain.SkillVersionRepo
	storage      *service.SkillStorage
	logger       *slog.Logger
}

// NewSkillHandler creates and registers skill route handlers.
func NewSkillHandler(i *do.Injector) (*SkillHandler, error) {
	w := do.MustInvoke[*web.Web](i)
	logger := do.MustInvoke[*slog.Logger](i)
	auth := do.MustInvoke[*middleware.AuthMiddleware](i)
	targetActive := do.MustInvoke[*middleware.TargetActiveMiddleware](i)
	skillUC := do.MustInvoke[domain.SkillUsecase](i)
	reviewRepo := do.MustInvoke[domain.SkillReviewRepo](i)
	skillRepo := do.MustInvoke[domain.SkillRepo](i)
	versionRepo := do.MustInvoke[domain.SkillVersionRepo](i)
	cfg := do.MustInvoke[*config.Config](i)

	// Initialize S3 skill storage (nil if object storage is disabled)
	var skillStorage *service.SkillStorage
	if cfg.ObjectStorage.Enabled {
		opt := oss.S3Option{ForcePathStyle: cfg.ObjectStorage.ForcePathStyle, InitBucket: cfg.ObjectStorage.InitBucket}
		client, err := oss.NewS3Compatible(context.Background(), cfg.ObjectStorage, opt)
		if err != nil {
			logger.Warn("failed to initialize OSS client for skill storage, upload will be disabled", "error", err)
		} else {
			skillStorage = service.NewSkillStorage(client, cfg.ObjectStorage.SkillPrefix)
		}
	}

	h := &SkillHandler{
		skillUsecase: skillUC,
		reviewRepo:   reviewRepo,
		skillRepo:    skillRepo,
		versionRepo:  versionRepo,
		storage:      skillStorage,
		logger:       logger.With("module", "skill.handler"),
	}

	// Public skill browsing
	w.GET("/api/v1/skills", web.BaseHandler(h.ListSkills))
	w.GET("/api/v1/skills/:id", web.BaseHandler(h.GetSkill))
	w.GET("/api/v1/skills/:id/ratings", web.BaseHandler(h.ListRatings))

	// Registry download API (public, used by npx skills CLI)
	w.GET("/api/v1/skills/by-slug/:slug", web.BaseHandler(h.GetSkillBySlug))
	w.GET("/api/v1/skills/by-slug/:slug/download", web.BaseHandler(h.DownloadSkill))
	w.GET("/api/v1/skills/by-slug/:slug/versions/:version/download", web.BaseHandler(h.DownloadSkillVersion))
	w.GET("/api/v1/skills/manifest", web.BaseHandler(h.SkillManifest))

	// V2: Multi-file download API
	w.GET("/api/v1/skills/by-slug/:slug/file-list", web.BaseHandler(h.FileList))
	w.GET("/api/v1/skills/by-slug/:slug/download/*", web.BaseHandler(h.DownloadSkillFile))

	// Authenticated skill management (BaseHandler + manual JSON decode, BindHandler 不认 JSON body)
	skills := w.Group("/api/v1/skills")
	skills.POST("", web.BaseHandler(h.CreateSkill), auth.Auth(), targetActive.TargetActive())

	// Skill ZIP upload (V2) — must be registered before /:id routes to avoid param collision
	skills.POST("/upload", web.BaseHandler(h.UploadSkill), auth.Auth(), middleware.RequirePublish())

	skills.PUT("/:id", web.BaseHandler(h.UpdateSkill), auth.Auth(), targetActive.TargetActive())
	skills.DELETE("/:id", web.BaseHandler(h.DeleteSkill), auth.Auth(), targetActive.TargetActive())
	skills.POST("/:id/versions", web.BaseHandler(h.PublishVersion), auth.Auth(), targetActive.TargetActive())
	skills.POST("/:id/install", web.BaseHandler(h.InstallSkill), auth.Auth(), targetActive.TargetActive())
	skills.POST("/:id/rate", web.BaseHandler(h.RateSkillJSON), auth.Auth(), targetActive.TargetActive())

	// Admin skill review
	admin := w.Group("/api/v1/admin/skills", auth.Auth(), middleware.RequireReview())
	admin.GET("/pending", web.BaseHandler(h.ListPendingSkills))
	admin.PUT("/:id/review", web.BaseHandler(h.ReviewSkill))

	return h, nil
}

// ListSkills returns a paginated list of skills.
func (h *SkillHandler) ListSkills(c *web.Context) error {
	req := &domain.ListSkillReq{}
	req.Cursor = c.QueryParam("cursor")
	req.Search = c.QueryParam("search")
	req.Category = c.QueryParam("category")
	req.SortBy = c.QueryParam("sort_by")
	if l := c.QueryParam("limit"); l != "" {
		if n, err := parseInt(l); err == nil && n > 0 && n <= 100 {
			req.Limit = n
		}
	}

	resp, err := h.skillUsecase.List(c.Request().Context(), req)
	if err != nil {
		return err
	}
	return c.Success(resp)
}

// GetSkill returns a single skill by ID.
func (h *SkillHandler) GetSkill(c *web.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrSkillNotFound
	}

	detail, err := h.skillUsecase.Get(c.Request().Context(), id)
	if err != nil {
		return err
	}
	return c.Success(detail)
}

// CreateSkill creates a new skill draft.
// 用 BaseHandler 手动解析 JSON，因为这SB框架的 BindHandler 不认 JSON body
func (h *SkillHandler) CreateSkill(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	var req domain.CreateSkillReq
	if err := decodeJSONBody(c, &req); err != nil {
		return errcode.ErrInvalidParameter
	}

	detail, err := h.skillUsecase.Create(c.Request().Context(), user.ID, &req)
	if err != nil {
		h.logger.Error("failed to create skill", "error", err)
		return err
	}
	return c.Success(detail)
}

// UpdateSkill updates an existing skill.
func (h *SkillHandler) UpdateSkill(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrSkillNotFound
	}

	var req domain.UpdateSkillReq
	if err := decodeJSONBody(c, &req); err != nil {
		return errcode.ErrInvalidParameter
	}

	detail, err := h.skillUsecase.Update(c.Request().Context(), id, user.ID, &req)
	if err != nil {
		h.logger.Error("failed to update skill", "error", err)
		return err
	}
	return c.Success(detail)
}

// DeleteSkill soft-deletes a skill.
func (h *SkillHandler) DeleteSkill(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrSkillNotFound
	}

	if err := h.skillUsecase.Delete(c.Request().Context(), id, user.ID); err != nil {
		return err
	}
	return c.Success(nil)
}

// PublishVersion publishes a new skill version.
func (h *SkillHandler) PublishVersion(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	skillID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrSkillNotFound
	}

	var req domain.PublishVersionReq
	if err := decodeJSONBody(c, &req); err != nil {
		return errcode.ErrInvalidParameter
	}

	if err := h.skillUsecase.PublishVersion(c.Request().Context(), skillID, user.ID, &req); err != nil {
		h.logger.Error("failed to publish version", "error", err)
		return err
	}
	return c.Success(nil)
}

// RateSkillJSON adds a rating for a skill (manual JSON parsing, BaseHandler).
func (h *SkillHandler) RateSkillJSON(c *web.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	skillID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrSkillNotFound
	}

	var req domain.RateSkillReq
	if err := decodeJSONBody(c, &req); err != nil {
		return errcode.ErrInvalidParameter
	}
	if req.Score < 1 || req.Score > 5 {
		return errcode.ErrInvalidParameter
	}

	if err := h.skillUsecase.Rate(c.Request().Context(), skillID, user.ID, &req); err != nil {
		h.logger.Error("failed to rate skill", "error", err)
		return err
	}
	return c.Success(nil)
}

// InstallSkill atomically increments the install counter for a skill.
func (h *SkillHandler) InstallSkill(c *web.Context) error {
	skillID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrSkillNotFound
	}

	if err := h.skillUsecase.Install(c.Request().Context(), skillID); err != nil {
		h.logger.Error("failed to install skill", "error", err, "skill_id", skillID)
		return err
	}
	return c.Success(nil)
}

// ListRatings returns ratings for a skill.
func (h *SkillHandler) ListRatings(c *web.Context) error {
	skillID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return errcode.ErrSkillNotFound
	}

	req := &domain.ListSkillReq{Limit: 20}
	ratings, err := h.skillUsecase.ListRatings(c.Request().Context(), skillID, req)
	if err != nil {
		return err
	}
	return c.Success(ratings)
}

// ListPendingSkills lists skills pending review (admin only).
func (h *SkillHandler) ListPendingSkills(c *web.Context) error {
	req := &domain.ListSkillReq{Limit: 20}
	skills, _, err := h.reviewRepo.ListPending(c.Request().Context(), req)
	if err != nil {
		return err
	}
	return c.Success(skills)
}

// ReviewSkill approves or rejects a skill (admin only).
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

	// Create review record
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

	// Update skill status based on review
	status := "archived"
	if req.Status == "approved" {
		status = "published"
	}
	return h.skillRepo.Update(c.Request().Context(), id, map[string]any{
		"status": status,
	})
}

// UploadSkill receives ZIP upload, validates, and stores to S3.
func (h *SkillHandler) UploadSkill(c *web.Context) error {
	if h.storage == nil {
		return errcode.ErrBadRequest.Wrap(fmt.Errorf("skill storage is not configured"))
	}

	user := middleware.GetUser(c)
	if user == nil {
		return errcode.ErrUnauthorized
	}

	// 1. Parse form fields
	slug := c.FormValue("slug")
	if slug == "" {
		return errcode.ErrInvalidParameter
	}
	slug = normalizeSlug(slug)

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

	summary := c.FormValue("summary")
	sourceType := c.FormValue("source_type")
	if sourceType == "" {
		sourceType = "official"
	}
	iconName := c.FormValue("icon_name")

	// 2. Read uploaded file
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

	// 3. Process ZIP
	result, err := service.ProcessSkillZip(c.Request().Context(), zipData)
	if err != nil {
		h.logger.Error("zip processing failed", "error", err)
		return errcode.ErrInvalidParameter
	}

	// 4. Upload to S3
	if err := h.storage.UploadSkillFiles(c.Request().Context(), slug, version, result.Entries); err != nil {
		h.logger.Error("s3 upload failed", "error", err)
		return err
	}

	// 5. Create or update skill record
	existing, _ := h.skillRepo.GetBySkillID(c.Request().Context(), slug)

	var skillID uuid.UUID
	if existing != nil {
		// Update existing skill
		skillID = existing.ID
		updateFields := map[string]any{
			"name":               name,
			"summary":            summary,
			"source_type":        sourceType,
			"icon_name":          iconName,
			"minio_path":         h.storage.SkillPrefixPath(slug, version),
			"npm_publish_status": "pending",
			"content":            string(result.SkillMd),
		}
		if err := h.skillRepo.Update(c.Request().Context(), existing.ID, updateFields); err != nil {
			h.logger.Error("failed to update skill", "error", err)
			return err
		}
	} else {
		// Create new skill
		skill := &db.Skill{
			ID:               uuid.New(),
			AuthorID:         user.ID,
			Name:             name,
			SkillID:          slug,
			Summary:          summary,
			SourceType:       sourceType,
			IconName:         iconName,
			MinioPath:        h.storage.SkillPrefixPath(slug, version),
			NpmPublishStatus: "pending",
			Content:          string(result.SkillMd),
			Status:           "draft",
		}
		created, err := h.skillRepo.Create(c.Request().Context(), skill)
		if err != nil {
			h.logger.Error("failed to create skill", "error", err)
			return err
		}
		skillID = created.ID
	}

	// 6. Create version record
	if _, err := h.versionRepo.Create(c.Request().Context(), &db.SkillVersion{
		ID:        uuid.New(),
		SkillID:   skillID,
		Version:   version,
		Content:   string(result.SkillMd),
		Changelog: c.FormValue("changelog"),
	}); err != nil {
		h.logger.Error("failed to create version", "error", err)
		return err
	}

	return c.Success(map[string]any{
		"slug":       slug,
		"version":    version,
		"file_count": result.FileCount,
		"total_size": result.TotalSize,
	})
}

// normalizeSlug strips the "mclaw/" namespace prefix if present.
// Both "mclaw/my-skill" and "my-skill" resolve to "my-skill" in the DB.
func normalizeSlug(slug string) string {
	return strings.TrimPrefix(slug, "mclaw/")
}

// decodeJSONBody reads and unmarshals JSON request body into v.
// 这SB框架的 BindHandler 不认 JSON，只能手动解析。
func decodeJSONBody(c *web.Context, v any) error {
	defer c.Request().Body.Close()
	return json.NewDecoder(c.Request().Body).Decode(v)
}

func parseInt(s string) (int, error) {
	var n int
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid digit")
		}
		n = n*10 + int(c-'0')
	}
	return n, nil
}

// GetSkillBySlug returns a skill by its human-readable slug (skill_id field).
// Accepts both "my-skill" and "mclaw/my-skill" formats.
func (h *SkillHandler) GetSkillBySlug(c *web.Context) error {
	slug := normalizeSlug(c.Param("slug"))
	s, err := h.skillRepo.GetBySkillID(c.Request().Context(), slug)
	if err != nil {
		return errcode.ErrSkillNotFound
	}
	if s.Status != "published" {
		return errcode.ErrSkillNotFound
	}

	versions, _ := h.versionRepo.ListBySkill(c.Request().Context(), s.ID)
	detail := toSkillDetail(s, versions)
	return c.Success(detail)
}

// DownloadSkill downloads the latest version of a skill as a SKILL.md file.
// Used by the npx skills CLI Registry source.
func (h *SkillHandler) DownloadSkill(c *web.Context) error {
	slug := c.Param("slug")
	return h.downloadSkillInternal(c, slug, "")
}

// DownloadSkillVersion downloads a specific version of a skill as a SKILL.md file.
func (h *SkillHandler) DownloadSkillVersion(c *web.Context) error {
	slug := c.Param("slug")
	version := c.Param("version")
	return h.downloadSkillInternal(c, slug, version)
}

func (h *SkillHandler) downloadSkillInternal(c *web.Context, slug, version string) error {
	slug = normalizeSlug(slug)
	s, err := h.skillRepo.GetBySkillID(c.Request().Context(), slug)
	if err != nil {
		return errcode.ErrSkillNotFound
	}
	if s.Status != "published" {
		return errcode.ErrSkillNotFound
	}

	// V2: If skill is stored in S3, return full ZIP
	if s.MinioPath != "" && h.storage != nil {
		// Get target version
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
		return h.streamSkillZip(c, slug, targetVersion)
	}

	// Backward compatible: return SKILL.md text
	// Get all versions
	versions, err := h.versionRepo.ListBySkill(c.Request().Context(), s.ID)
	if err != nil {
		return err
	}

	// Determine which version content to use
	var targetVersionObj *db.SkillVersion
	if version != "" {
		for _, v := range versions {
			if v.Version == version {
				targetVersionObj = v
				break
			}
		}
		if targetVersionObj == nil {
			return errcode.ErrSkillVersionNotFound
		}
	} else if len(versions) > 0 {
		// Use the latest version (last in list, newest first)
		targetVersionObj = versions[len(versions)-1]
	}

	// Build SKILL.md content
	skillMd := buildSkillMd(s, targetVersionObj)

	// Return as downloadable file
	filename := slug + ".md"
	if version != "" {
		filename = slug + "-" + version + ".md"
	}

	c.Response().Header().Set("Content-Type", "text/markdown; charset=utf-8")
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Response().WriteHeader(200)
	_, err = c.Response().Write([]byte(skillMd))
	return err
}

// FileList returns the file list of a Skill.
func (h *SkillHandler) FileList(c *web.Context) error {
	slug := normalizeSlug(c.Param("slug"))
	s, err := h.skillRepo.GetBySkillID(c.Request().Context(), slug)
	if err != nil {
		return errcode.ErrSkillNotFound
	}
	if s.Status != "published" {
		return errcode.ErrSkillNotFound
	}

	// TODO: For now, return basic info from the skill record
	// Full file listing from S3 will be implemented when we add S3 ListObjects
	files := []string{"SKILL.md"}
	if s.MinioPath != "" {
		// Placeholder: in production, list S3 objects under s.MinioPath
	}
	return c.Success(map[string]any{"files": files, "slug": slug})
}

// DownloadSkillFile downloads a specific file from a Skill.
// Route /* matches sub-paths like /download/scripts/main.py
func (h *SkillHandler) DownloadSkillFile(c *web.Context) error {
	slug := normalizeSlug(c.Param("slug"))
	filePath := c.Param("*")
	if filePath == "" || filePath == "/" {
		filePath = "SKILL.md"
	}
	filePath = strings.TrimPrefix(filePath, "/")

	s, err := h.skillRepo.GetBySkillID(c.Request().Context(), slug)
	if err != nil {
		return errcode.ErrSkillNotFound
	}
	if s.Status != "published" {
		return errcode.ErrSkillNotFound
	}

	// For now, return SKILL.md content if requested and no S3 storage
	if filePath == "SKILL.md" && s.MinioPath == "" {
		content := s.Content
		if content == "" {
			return errcode.ErrSkillNotFound
		}
		c.Response().Header().Set("Content-Type", "text/markdown; charset=utf-8")
		c.Response().Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, "SKILL.md"))
		return c.String(http.StatusOK, content)
	}

	// TODO: S3 single file download will be implemented with S3 GetObject
	return errcode.ErrSkillNotFound
}

// streamSkillZip creates a ZIP from S3 files and streams it to the client.
func (h *SkillHandler) streamSkillZip(c *web.Context, slug, version string) error {
	// For MVP: since we don't have S3 ListObjects yet, create a simple ZIP
	// with just the SKILL.md content
	s, err := h.skillRepo.GetBySkillID(c.Request().Context(), slug)
	if err != nil {
		return errcode.ErrSkillNotFound
	}

	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Add SKILL.md
	w, err := zipWriter.Create("SKILL.md")
	if err != nil {
		return err
	}
	if _, err := w.Write([]byte(s.Content)); err != nil {
		return err
	}

	// TODO: Add other files from S3 when ListObjects is implemented

	if err := zipWriter.Close(); err != nil {
		return err
	}

	filename := fmt.Sprintf("%s-v%s.zip", slug, version)
	c.Response().Header().Set("Content-Type", "application/zip")
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Response().WriteHeader(http.StatusOK)
	_, err = c.Response().Write(buf.Bytes())
	return err
}

// SkillManifest returns a lightweight manifest of all published skills.
// Used by the CLI for search/update operations.
func (h *SkillHandler) SkillManifest(c *web.Context) error {
	req := &domain.ListSkillReq{Limit: 1000}
	skills, _, err := h.skillRepo.List(c.Request().Context(), req)
	if err != nil {
		return err
	}

	type manifestEntry struct {
		Slug        string `json:"slug"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Version     string `json:"version"`
		Author      string `json:"author,omitempty"`
		Icon        string `json:"icon,omitempty"`
	}

	entries := make([]manifestEntry, 0, len(skills))
	for _, s := range skills {
		if s.Status != "published" {
			continue
		}
		versions, _ := h.versionRepo.ListBySkill(c.Request().Context(), s.ID)
		latestVer := "0.0.0"
		if len(versions) > 0 {
			latestVer = versions[len(versions)-1].Version
		}
		entries = append(entries, manifestEntry{
			Slug:        s.SkillID,
			Name:        s.Name,
			Description: s.Description,
			Version:     latestVer,
			Icon:        s.Icon,
		})
	}

	return c.Success(map[string]any{
		"skills":    entries,
		"total":     len(entries),
		"updatedAt": time.Now().UTC().Format(time.RFC3339),
	})
}

// buildSkillMd creates SKILL.md content from skill DB record.
// Generates YAML frontmatter + Markdown body in AgentSkills.io standard format.
func buildSkillMd(s *db.Skill, v *db.SkillVersion) string {
	var buf bytes.Buffer

	// YAML frontmatter
	fm := map[string]any{
		"name":        s.Name,
		"slug":        s.SkillID,
		"description": s.Description,
	}
	fm["version"] = "0.0.0"
	if v != nil {
		fm["version"] = v.Version
	}
	if s.Categories != nil && len(s.Categories) > 0 {
		fm["tags"] = s.Categories
	} else if s.Tags != nil && len(s.Tags) > 0 {
		fm["tags"] = s.Tags
	}
	if s.Icon != "" {
		fm["icon"] = s.Icon
	}
	if s.ArgsSchema != nil && len(s.ArgsSchema) > 0 {
		fm["args"] = s.ArgsSchema
	}

	buf.WriteString("---\n")
	yamlBytes, _ := yaml.Marshal(fm)
	buf.Write(bytes.TrimSpace(yamlBytes))
	buf.WriteString("\n---\n\n")

	// Markdown body
	content := s.Content
	if v != nil && v.Content != "" {
		content = v.Content
	}
	buf.WriteString(strings.TrimSpace(content))
	buf.WriteString("\n")

	return buf.String()
}

// toSkillDetail converts db.Skill to domain.SkillDetail.
func toSkillDetail(s *db.Skill, versions []*db.SkillVersion) *domain.SkillDetail {
	detail := &domain.SkillDetail{
		ID:           s.ID,
		AuthorID:     s.AuthorID,
		Name:         s.Name,
		SkillID:      s.SkillID,
		Description:  s.Description,
		Categories:   s.Categories,
		Tags:         s.Tags,
		Icon:         s.Icon,
		Content:      s.Content,
		ArgsSchema:   s.ArgsSchema,
		Status:       s.Status,
		InstallCount: s.InstallCount,
		RatingAvg:    s.RatingAvg,
		RatingCount:  s.RatingCount,
		// V2 新增
		SourceType:       s.SourceType,
		IconName:         s.IconName,
		Summary:          s.Summary,
		MinioPath:        s.MinioPath,
		NpmPublishStatus: s.NpmPublishStatus,
		CreatedAt:    s.CreatedAt,
		UpdatedAt:    s.UpdatedAt,
	}
	for _, v := range versions {
		detail.Versions = append(detail.Versions, &domain.SkillVersionDetail{
			ID:        v.ID,
			Version:   v.Version,
			Content:   v.Content,
			Changelog: v.Changelog,
			CreatedAt: v.CreatedAt,
		})
	}
	return detail
}
