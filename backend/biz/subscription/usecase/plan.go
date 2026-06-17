package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/pkg/cvt"
)

type planUsecase struct {
	planRepo domain.PlanRepo
	log      *zap.Logger
}

// NewPlanUsecase creates a new PlanUsecase instance.
func NewPlanUsecase(i *do.Injector) (domain.PlanUsecase, error) {
	planRepo := do.MustInvoke[domain.PlanRepo](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &planUsecase{planRepo: planRepo, log: logger}, nil
}

func (uc *planUsecase) List(ctx context.Context) ([]*domain.Plan, error) {
	plans, err := uc.planRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	return cvt.Iter(plans, func(_ int, p *db.Plan) *domain.Plan {
		return cvt.From(p, &domain.Plan{})
	}), nil
}

func (uc *planUsecase) Get(ctx context.Context, id uuid.UUID) (*domain.Plan, error) {
	plan, err := uc.planRepo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return cvt.From(plan, &domain.Plan{}), nil
}

func (uc *planUsecase) GetByName(ctx context.Context, name consts.SubscriptionPlan) (*domain.Plan, error) {
	plan, err := uc.planRepo.GetByName(ctx, string(name))
	if err != nil {
		return nil, err
	}
	return cvt.From(plan, &domain.Plan{}), nil
}

func (uc *planUsecase) GetDefault(ctx context.Context) (*domain.Plan, error) {
	plan, err := uc.planRepo.GetDefault(ctx)
	if err != nil {
		return nil, err
	}
	return cvt.From(plan, &domain.Plan{}), nil
}
