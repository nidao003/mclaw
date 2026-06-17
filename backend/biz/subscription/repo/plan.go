package repo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"entgo.io/ent/dialect/sql"

	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/plan"
	"github.com/nidao003/mclaw/backend/domain"
)

type planRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewPlanRepo creates a new PlanRepo instance.
func NewPlanRepo(i *do.Injector) (domain.PlanRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &planRepo{db: dbClient, log: logger}, nil
}

func (r *planRepo) List(ctx context.Context) ([]*db.Plan, error) {
	return r.db.Plan.Query().
		Where(plan.IsActive(true)).
		Order(plan.BySortOrder(sql.OrderAsc())).
		All(ctx)
}

func (r *planRepo) Get(ctx context.Context, id uuid.UUID) (*db.Plan, error) {
	return r.db.Plan.Get(ctx, id)
}

func (r *planRepo) GetByName(ctx context.Context, name string) (*db.Plan, error) {
	return r.db.Plan.Query().
		Where(plan.NameEQ(name)).
		Only(ctx)
}

func (r *planRepo) GetDefault(ctx context.Context) (*db.Plan, error) {
	plans, err := r.db.Plan.Query().
		Where(plan.IsDefault(true), plan.IsActive(true)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get default plan: %w", err)
	}
	if len(plans) == 0 {
		return r.GetByName(ctx, "basic")
	}
	return plans[0], nil
}
