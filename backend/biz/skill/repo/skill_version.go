package repo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/skillversion"
	"github.com/nidao003/mclaw/backend/domain"
)

type skillVersionRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewSkillVersionRepo creates a new SkillVersionRepo instance.
func NewSkillVersionRepo(i *do.Injector) (domain.SkillVersionRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &skillVersionRepo{db: dbClient, log: logger}, nil
}

func (r *skillVersionRepo) Create(ctx context.Context, v *db.SkillVersion) (*db.SkillVersion, error) {
	builder := r.db.SkillVersion.Create().
		SetID(v.ID).
		SetSkillID(v.SkillID).
		SetVersion(v.Version)

	if v.Content != "" {
		builder.SetContent(v.Content)
	}
	if v.Changelog != "" {
		builder.SetChangelog(v.Changelog)
	}

	result, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create skill version: %w", err)
	}
	return result, nil
}

func (r *skillVersionRepo) ListBySkill(ctx context.Context, skillID uuid.UUID) ([]*db.SkillVersion, error) {
	return r.db.SkillVersion.Query().
		Where(skillversion.SkillIDEQ(skillID)).
		All(ctx)
}
