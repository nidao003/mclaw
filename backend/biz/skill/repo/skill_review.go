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
	"github.com/nidao003/mclaw/backend/db/skillreview"
	"github.com/nidao003/mclaw/backend/domain"
)

type skillReviewRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewSkillReviewRepo creates a new SkillReviewRepo instance.
func NewSkillReviewRepo(i *do.Injector) (domain.SkillReviewRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &skillReviewRepo{db: dbClient, log: logger}, nil
}

func (r *skillReviewRepo) Create(ctx context.Context, rv *db.SkillReview) (*db.SkillReview, error) {
	builder := r.db.SkillReview.Create().
		SetID(rv.ID).
		SetSkillID(rv.SkillID).
		SetReviewerID(rv.ReviewerID).
		SetStatus(rv.Status)

	if rv.Comment != "" {
		builder.SetComment(rv.Comment)
	}

	result, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create skill review: %w", err)
	}
	return result, nil
}

func (r *skillReviewRepo) GetLatestBySkill(ctx context.Context, skillID uuid.UUID) (*db.SkillReview, error) {
	return r.db.SkillReview.Query().
		Where(skillreview.SkillIDEQ(skillID)).
		Order(skillreview.ByCreatedAt(sql.OrderDesc())).
		First(ctx)
}

func (r *skillReviewRepo) ListPending(ctx context.Context, req *domain.ListSkillReq) ([]*db.Skill, int, error) {
	// List skills with "draft" status that need review
	query := r.db.Skill.Query().
		Where(skill.StatusEQ("draft"))

	limit := req.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query.Limit(limit)
	query.Order(skill.ByCreatedAt(sql.OrderDesc()))

	items, err := query.All(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list pending skills: %w", err)
	}
	return items, len(items), nil
}
