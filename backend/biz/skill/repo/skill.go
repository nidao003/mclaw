package repo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"entgo.io/ent/dialect/sql"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/skill"
	"github.com/nidao003/mclaw/backend/domain"
)

type skillRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewSkillRepo creates a new SkillRepo instance.
func NewSkillRepo(i *do.Injector) (domain.SkillRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &skillRepo{db: dbClient, log: logger}, nil
}

func (r *skillRepo) List(ctx context.Context, req *domain.ListSkillReq) ([]*db.Skill, int, error) {
	query := r.db.Skill.Query()

	// Filter by status (default: published)
	status := req.Status
	if status == "" {
		status = "published"
	}
	query.Where(skill.StatusEQ(status))

	// Filter by category
	if req.Category != "" {
		// JSON contains query — Ent doesn't support this natively,
		// use a where condition for now
		query.Where(skill.CategoriesNotNil()) // approximate category filter
	}

	// Filter by author
	if req.AuthorID != "" {
		authorID, err := uuid.Parse(req.AuthorID)
		if err == nil {
			query.Where(skill.AuthorIDEQ(authorID))
		}
	}

	// Search by name or description
	if req.Search != "" {
		query.Where(skill.Or(
			skill.NameContains(req.Search),
			skill.DescriptionContains(req.Search),
			skill.SkillIDContains(req.Search),
		))
	}

	// Default limit
	limit := req.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query.Limit(limit)

	// Order
	switch req.SortBy {
	case "rating":
		query.Order(skill.ByRatingAvg(sql.OrderDesc()))
	case "installs":
		query.Order(skill.ByInstallCount(sql.OrderDesc()))
	default: // "newest"
		query.Order(skill.ByCreatedAt(sql.OrderDesc()))
	}

	// Cursor-based pagination
	if req.Cursor != "" {
		cursorID, err := uuid.Parse(req.Cursor)
		if err == nil {
			query.Where(skill.IDLT(cursorID))
		}
	}

	items, err := query.All(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list skills: %w", err)
	}

	return items, len(items), nil
}

func (r *skillRepo) Get(ctx context.Context, id uuid.UUID) (*db.Skill, error) {
	return r.db.Skill.Query().
		Where(skill.ID(id)).
		WithVersions().
		WithRatings().
		Only(ctx)
}

func (r *skillRepo) GetBySkillID(ctx context.Context, skillID string) (*db.Skill, error) {
	return r.db.Skill.Query().
		Where(skill.SkillIDEQ(skillID)).
		Only(ctx)
}

func (r *skillRepo) Create(ctx context.Context, s *db.Skill) (*db.Skill, error) {
	builder := r.db.Skill.Create().
		SetID(s.ID).
		SetAuthorID(s.AuthorID).
		SetName(s.Name).
		SetSkillID(s.SkillID).
		SetStatus("draft")

	if s.Description != "" {
		builder.SetDescription(s.Description)
	}
	if len(s.Categories) > 0 {
		builder.SetCategories(s.Categories)
	}
	if len(s.Tags) > 0 {
		builder.SetTags(s.Tags)
	}
	if s.Icon != "" {
		builder.SetIcon(s.Icon)
	}
	if s.Content != "" {
		builder.SetContent(s.Content)
	}
	if s.ArgsSchema != nil {
		builder.SetArgsSchema(s.ArgsSchema)
	}

	result, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create skill: %w", err)
	}
	return result, nil
}

func (r *skillRepo) Update(ctx context.Context, id uuid.UUID, updates map[string]any) error {
	builder := r.db.Skill.UpdateOneID(id)
	for k, v := range updates {
		switch k {
		case "name":
			if val, ok := v.(string); ok {
				builder.SetName(val)
			}
		case "description":
			if val, ok := v.(string); ok {
				builder.SetDescription(val)
			}
		case "icon":
			if val, ok := v.(string); ok {
				builder.SetIcon(val)
			}
		case "content":
			if val, ok := v.(string); ok {
				builder.SetContent(val)
			}
		case "status":
			if val, ok := v.(string); ok {
				builder.SetStatus(val)
			}
		case "install_count":
			if val, ok := v.(int); ok {
				builder.SetInstallCount(val)
			}
		case "rating_avg":
			if val, ok := v.(float64); ok {
				builder.SetRatingAvg(val)
			}
		case "rating_count":
			if val, ok := v.(int); ok {
				builder.SetRatingCount(val)
			}
		}
	}
	_, err := builder.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to update skill: %w", err)
	}
	return nil
}

func (r *skillRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.Skill.DeleteOneID(id).Exec(ctx)
}

// IncrementInstall atomically increments the install counter for a skill.
func (r *skillRepo) IncrementInstall(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Skill.UpdateOneID(id).
		AddInstallCount(1).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to increment install count: %w", err)
	}
	return nil
}
