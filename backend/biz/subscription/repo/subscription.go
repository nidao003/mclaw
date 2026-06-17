package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samber/do"
	"go.uber.org/zap"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
	"github.com/nidao003/mclaw/backend/db/usersubscription"
	"github.com/nidao003/mclaw/backend/domain"
)

type subscriptionRepo struct {
	db  *db.Client
	log *zap.Logger
}

// NewSubscriptionRepo creates a new SubscriptionRepo instance.
func NewSubscriptionRepo(i *do.Injector) (domain.SubscriptionRepo, error) {
	dbClient := do.MustInvoke[*db.Client](i)
	logger := do.MustInvoke[*zap.Logger](i)
	return &subscriptionRepo{db: dbClient, log: logger}, nil
}

func (r *subscriptionRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*db.UserSubscription, error) {
	return r.db.UserSubscription.Query().
		Where(usersubscription.UserID(userID)).
		Only(ctx)
}

func (r *subscriptionRepo) GetActiveSubscription(ctx context.Context, userID uuid.UUID) (*db.UserSubscription, error) {
	return r.db.UserSubscription.Query().
		Where(
			usersubscription.UserID(userID),
			usersubscription.StatusEQ("active"),
		).
		WithPlan().
		Only(ctx)
}

func (r *subscriptionRepo) Create(ctx context.Context, sub *db.UserSubscription) (*db.UserSubscription, error) {
	builder := r.db.UserSubscription.Create().
		SetUserID(sub.UserID).
		SetPlanID(sub.PlanID).
		SetStatus(sub.Status).
		SetPeriodUnit(sub.PeriodUnit).
		SetPeriodCount(sub.PeriodCount).
		SetAutoRenew(sub.AutoRenew).
		SetEnableCreditConsumption(sub.EnableCreditConsumption).
		SetStartedAt(sub.StartedAt)

	if !sub.ExpiresAt.IsZero() {
		builder.SetExpiresAt(sub.ExpiresAt)
	}

	result, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}
	return result, nil
}

func (r *subscriptionRepo) Update(ctx context.Context, id uuid.UUID, updates map[string]any) error {
	builder := r.db.UserSubscription.UpdateOneID(id)
	for k, v := range updates {
		switch k {
		case "plan_id":
			if val, ok := v.(uuid.UUID); ok {
				builder.SetPlanID(val)
			}
		case "status":
			if val, ok := v.(string); ok {
				builder.SetStatus(consts.SubscriptionStatus(val))
			}
		case "expires_at":
			if val, ok := v.(time.Time); ok {
				builder.SetExpiresAt(val)
			}
		case "auto_renew":
			if val, ok := v.(bool); ok {
				builder.SetAutoRenew(val)
			}
		case "enable_credit_consumption":
			if val, ok := v.(bool); ok {
				builder.SetEnableCreditConsumption(val)
			}
		case "period_unit":
			if val, ok := v.(string); ok {
				builder.SetPeriodUnit(consts.SubscriptionPeriodUnit(val))
			}
		case "period_count":
			if val, ok := v.(int); ok {
				builder.SetPeriodCount(val)
			}
		}
	}
	_, err := builder.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}
	return nil
}

// ExpireActiveSubs marks all active subscriptions past their expiry as expired.
// This is called by a background cron job to ensure subscriptions don't grant
// access after their period ends.
func (r *subscriptionRepo) ExpireActiveSubs(ctx context.Context) (int, error) {
	n, err := r.db.UserSubscription.Update().
		Where(
			usersubscription.StatusEQ(consts.SubscriptionActive),
			usersubscription.ExpiresAtLT(time.Now()),
		).
		SetStatus(consts.SubscriptionExpired).
		Save(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to expire subscriptions: %w", err)
	}
	return n, nil
}
