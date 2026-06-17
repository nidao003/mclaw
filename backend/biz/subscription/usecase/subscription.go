package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/domain"
	"github.com/nidao003/mclaw/backend/errcode"
)

type subscriptionUsecase struct {
	subRepo  domain.SubscriptionRepo
	planRepo domain.PlanRepo
	log      *zap.Logger
}

// NewSubscriptionUsecase creates a new SubscriptionUsecase instance.
func NewSubscriptionUsecase(i *do.Injector) (domain.SubscriptionUsecase, error) {
	subRepo := do.MustInvoke[domain.SubscriptionRepo](i)
	planRepo := do.MustInvoke[domain.PlanRepo](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &subscriptionUsecase{subRepo: subRepo, planRepo: planRepo, log: logger}, nil
}

func (uc *subscriptionUsecase) Get(ctx context.Context, userID uuid.UUID) (*domain.SubscriptionResp, error) {
	sub, err := uc.subRepo.GetActiveSubscription(ctx, userID)
	if err != nil {
		// no active subscription -> return default basic plan
		plan, planErr := uc.planRepo.GetDefault(ctx)
		if planErr != nil {
			return &domain.SubscriptionResp{
				Plan:                    string(consts.PlanBasic),
				AutoRenew:              false,
				EnableCreditConsumption: true,
				Status:                  string(consts.SubscriptionActive),
			}, nil
		}
		return &domain.SubscriptionResp{
			Plan:                    plan.Name,
			AutoRenew:              false,
			EnableCreditConsumption: true,
			Status:                  string(consts.SubscriptionActive),
		}, nil
	}

	resp := &domain.SubscriptionResp{
		Plan:                    sub.Edges.Plan.Name,
		PlanID:                  sub.PlanID,
		AutoRenew:              sub.AutoRenew,
		EnableCreditConsumption: sub.EnableCreditConsumption,
		Status:                  string(sub.Status),
	}

	if !sub.ExpiresAt.IsZero() {
		expiresAt := sub.ExpiresAt
		resp.ExpiresAt = &expiresAt
	}

	return resp, nil
}

func (uc *subscriptionUsecase) Subscribe(ctx context.Context, userID uuid.UUID, req *domain.SubscribeReq) (*domain.SubscriptionResp, error) {
	// Find the target plan
	plan, err := uc.planRepo.GetByName(ctx, string(req.Plan))
	if err != nil {
		return nil, errcode.ErrPlanNotFound
	}

	// Calculate subscription duration
	periodCount := req.PeriodCount
	if periodCount <= 0 {
		periodCount = 1
	}

	var duration time.Duration
	switch req.PeriodUnit {
	case consts.PeriodMonth:
		duration = time.Duration(periodCount) * 30 * 24 * time.Hour
	case consts.PeriodYear:
		duration = time.Duration(periodCount) * 365 * 24 * time.Hour
	default:
		return nil, fmt.Errorf("invalid period unit: %s", req.PeriodUnit)
	}

	now := time.Now()
	expiresAt := now.Add(duration)

	// Check for existing active subscription
	existing, _ := uc.subRepo.GetActiveSubscription(ctx, userID)
	if existing != nil {
		// upgrade or extend existing subscription
		updates := map[string]any{
			"plan_id":    plan.ID,
			"expires_at": expiresAt,
			"period_unit": req.PeriodUnit,
			"period_count": periodCount,
		}
		if err := uc.subRepo.Update(ctx, existing.ID, updates); err != nil {
			return nil, fmt.Errorf("failed to update subscription: %w", err)
		}
	} else {
		// create new subscription
		sub := &db.UserSubscription{
			UserID:                  userID,
			PlanID:                  plan.ID,
			Status:                  consts.SubscriptionActive,
			PeriodUnit:              req.PeriodUnit,
			PeriodCount:             periodCount,
			AutoRenew:              false,
			EnableCreditConsumption: true,
			StartedAt:              now,
		}
		if _, err := uc.subRepo.Create(ctx, sub); err != nil {
			return nil, fmt.Errorf("failed to create subscription: %w", err)
		}
	}

	return uc.Get(ctx, userID)
}

func (uc *subscriptionUsecase) ToggleAutoRenew(ctx context.Context, userID uuid.UUID, req *domain.AutoRenewReq) error {
	sub, err := uc.subRepo.GetActiveSubscription(ctx, userID)
	if err != nil {
		return errcode.ErrSubscriptionExpired
	}
	return uc.subRepo.Update(ctx, sub.ID, map[string]any{
		"auto_renew": req.AutoRenew,
	})
}

func (uc *subscriptionUsecase) ToggleCreditConsumption(ctx context.Context, userID uuid.UUID, req *domain.CreditConsumptionReq) error {
	sub, err := uc.subRepo.GetActiveSubscription(ctx, userID)
	if err != nil {
		// no subscription, update wallet directly
		return fmt.Errorf("no active subscription found")
	}
	return uc.subRepo.Update(ctx, sub.ID, map[string]any{
		"enable_credit_consumption": req.EnableCreditConsumption,
	})
}

func (uc *subscriptionUsecase) CheckModelAccess(ctx context.Context, userID uuid.UUID, accessLevel consts.ModelAccessLevel, isFree bool) bool {
	// free models are always accessible
	if isFree {
		return true
	}

	resp, err := uc.Get(ctx, userID)
	if err != nil {
		return false
	}

	// access level hierarchy: basic < pro < ultra
	planLevel := planToLevel(consts.SubscriptionPlan(resp.Plan))
	requiredLevel := accessLevelToLevel(accessLevel)
	return planLevel >= requiredLevel
}

func (uc *subscriptionUsecase) GetTokenQuota(ctx context.Context, userID uuid.UUID) (*domain.TokenQuota, error) {
	resp, err := uc.Get(ctx, userID)
	if err != nil {
		return nil, err
	}

	plan, err := uc.planRepo.GetByName(ctx, resp.Plan)
	if err != nil {
		return nil, err
	}

	return &domain.TokenQuota{
		BasicTokenQuota:   plan.BasicTokenQuota,
		ProTokenQuota:     plan.ProTokenQuota,
		UltraTokenQuota:   plan.UltraTokenQuota,
	}, nil
}

// planToLevel converts plan name to numeric level for comparison.
func planToLevel(plan consts.SubscriptionPlan) int {
	switch plan {
	case consts.PlanBasic:
		return 0
	case consts.PlanPro:
		return 1
	case consts.PlanUltra:
		return 2
	default:
		return 0
	}
}

// accessLevelToLevel converts access level to numeric level.
func accessLevelToLevel(level consts.ModelAccessLevel) int {
	switch level {
	case consts.AccessBasic:
		return 0
	case consts.AccessPro:
		return 1
	case consts.AccessUltra:
		return 2
	default:
		return 0
	}
}

// ExpireOverdueSubscriptions marks all active subscriptions past their expiry as expired.
// Called by a background cron job (e.g. every hour).
func (uc *subscriptionUsecase) ExpireOverdueSubscriptions(ctx context.Context) (int, error) {
	n, err := uc.subRepo.ExpireActiveSubs(ctx)
	if err != nil {
		return 0, err
	}
	if n > 0 {
		uc.log.Info("expired subscriptions", zap.Int("count", n))
	}
	return n, nil
}
