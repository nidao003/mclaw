package repo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/skillrating"
	"github.com/nidao003/mclaw/backend/domain"
)

type skillRatingRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewSkillRatingRepo creates a new SkillRatingRepo instance.
func NewSkillRatingRepo(i *do.Injector) (domain.SkillRatingRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &skillRatingRepo{db: dbClient, log: logger}, nil
}

func (r *skillRatingRepo) Create(ctx context.Context, rt *db.SkillRating) (*db.SkillRating, error) {
	builder := r.db.SkillRating.Create().
		SetSkillID(rt.SkillID).
		SetUserID(rt.UserID).
		SetScore(rt.Score)

	if rt.Comment != "" {
		builder.SetComment(rt.Comment)
	}

	result, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create skill rating: %w", err)
	}
	return result, nil
}

func (r *skillRatingRepo) GetByUserAndSkill(ctx context.Context, userID, skillID uuid.UUID) (*db.SkillRating, error) {
	return r.db.SkillRating.Query().
		Where(
			skillrating.UserIDEQ(userID),
			skillrating.SkillIDEQ(skillID),
		).
		Only(ctx)
}

func (r *skillRatingRepo) ListBySkill(ctx context.Context, skillID uuid.UUID, limit, offset int) ([]*db.SkillRating, error) {
	query := r.db.SkillRating.Query().
		Where(skillrating.SkillIDEQ(skillID))

	if limit > 0 {
		query.Limit(limit)
	}
	if offset > 0 {
		query.Offset(offset)
	}

	return query.All(ctx)
}
