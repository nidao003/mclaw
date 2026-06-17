package usecase

import (
	"context"

	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
)

type expertUsecase struct {
	expertRepo domain.ExpertRepo
	log        *zap.Logger
}

// NewExpertUsecase creates a new ExpertUsecase instance.
func NewExpertUsecase(i *do.Injector) (domain.ExpertUsecase, error) {
	expertRepo := do.MustInvoke[domain.ExpertRepo](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &expertUsecase{
		expertRepo: expertRepo,
		log:        logger,
	}, nil
}

// List returns all published experts ordered by sort_order.
func (uc *expertUsecase) List(ctx context.Context) (*domain.ListExpertResp, error) {
	experts, err := uc.expertRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	return &domain.ListExpertResp{Experts: experts}, nil
}

// GetBySlug returns a single expert by slug.
func (uc *expertUsecase) GetBySlug(ctx context.Context, slug string) (*domain.ExpertDetail, error) {
	e, err := uc.expertRepo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, errcode.ErrExpertNotFound
	}
	return e, nil
}
