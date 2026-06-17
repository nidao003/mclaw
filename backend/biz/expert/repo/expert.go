package repo

import (
	"context"
	"fmt"

	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/expert"
	"github.com/nidao003/mclaw/backend/domain"
)

type expertRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewExpertRepo creates a new ExpertRepo instance.
func NewExpertRepo(i *do.Injector) (domain.ExpertRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &expertRepo{db: dbClient, log: logger}, nil
}

func (r *expertRepo) List(ctx context.Context) ([]*domain.ExpertDetail, error) {
	items, err := r.db.Expert.Query().
		Where(expert.StatusEQ("published")).
		Order(expert.BySortOrder()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list experts: %w", err)
	}

	result := make([]*domain.ExpertDetail, 0, len(items))
	for _, e := range items {
		result = append(result, toExpertDetail(e))
	}
	return result, nil
}

func (r *expertRepo) GetBySlug(ctx context.Context, slug string) (*domain.ExpertDetail, error) {
	e, err := r.db.Expert.Query().
		Where(
			expert.SlugEQ(slug),
			expert.StatusEQ("published"),
		).
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get expert by slug: %w", err)
	}
	return toExpertDetail(e), nil
}

func toExpertDetail(e *db.Expert) *domain.ExpertDetail {
	return &domain.ExpertDetail{
		ID:            e.ID,
		Slug:          e.Slug,
		Name:          e.Name,
		Subtitle:      e.Subtitle,
		Description:   e.Description,
		Icon:          e.Icon,
		Scenarios:     e.Scenarios,
		RelatedSkills: e.RelatedSkills,
		Status:        e.Status,
		SortOrder:     e.SortOrder,
		CreatedAt:     e.CreatedAt,
		UpdatedAt:     e.UpdatedAt,
	}
}
