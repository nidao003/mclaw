package domain

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/nidao003/mclaw/backend/consts"
	"github.com/nidao003/mclaw/backend/db"
)

// SubscriptionUsecase defines the business logic for subscription management.
type SubscriptionUsecase interface {
	// Get returns the current subscription for a user.
	Get(ctx context.Context, userID uuid.UUID) (*SubscriptionResp, error)
	// Subscribe creates or upgrades a subscription for a user.
	Subscribe(ctx context.Context, userID uuid.UUID, req *SubscribeReq) (*SubscriptionResp, error)
	// ToggleAutoRenew switches auto-renewal on/off.
	ToggleAutoRenew(ctx context.Context, userID uuid.UUID, req *AutoRenewReq) error
	// ToggleCreditConsumption switches credit consumption after quota exhaustion.
	ToggleCreditConsumption(ctx context.Context, userID uuid.UUID, req *CreditConsumptionReq) error
	// CheckModelAccess checks if a user can access a model with the given access level.
	CheckModelAccess(ctx context.Context, userID uuid.UUID, accessLevel consts.ModelAccessLevel, isFree bool) bool
	// GetTokenQuota returns the daily token quota for a user based on their plan.
	GetTokenQuota(ctx context.Context, userID uuid.UUID) (*TokenQuota, error)
	// ExpireOverdueSubscriptions marks all active subscriptions past their expiry as expired.
	// This is called by a background cron job.
	ExpireOverdueSubscriptions(ctx context.Context) (int, error)
}

// SubscriptionRepo defines the data access for subscriptions.
type SubscriptionRepo interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*db.UserSubscription, error)
	GetActiveSubscription(ctx context.Context, userID uuid.UUID) (*db.UserSubscription, error)
	Create(ctx context.Context, sub *db.UserSubscription) (*db.UserSubscription, error)
	Update(ctx context.Context, id uuid.UUID, updates map[string]any) error
	// ExpireActiveSubs marks all active subscriptions past their expiry as expired.
	// Returns the number of subscriptions expired.
	ExpireActiveSubs(ctx context.Context) (int, error)
}

// PlanUsecase defines the business logic for plan management.
type PlanUsecase interface {
	List(ctx context.Context) ([]*Plan, error)
	Get(ctx context.Context, id uuid.UUID) (*Plan, error)
	GetByName(ctx context.Context, name consts.SubscriptionPlan) (*Plan, error)
	GetDefault(ctx context.Context) (*Plan, error)
}

// PlanRepo defines the data access for plans.
type PlanRepo interface {
	List(ctx context.Context) ([]*db.Plan, error)
	Get(ctx context.Context, id uuid.UUID) (*db.Plan, error)
	GetByName(ctx context.Context, name string) (*db.Plan, error)
	GetDefault(ctx context.Context) (*db.Plan, error)
}

// --- Domain Models ---

// Plan represents a subscription plan definition.
type Plan struct {
	ID               uuid.UUID `json:"id"`
	Name             string    `json:"name"`
	DisplayName      string    `json:"display_name"`
	PriceMonth       int64     `json:"price_month"`
	PriceYear        int64     `json:"price_year"`
	BasicTokenQuota  int64     `json:"basic_token_quota"`
	ProTokenQuota    int64     `json:"pro_token_quota"`
	UltraTokenQuota  int64     `json:"ultra_token_quota"`
	MonthlyCredits   int64     `json:"monthly_credits"`
	MaxConcurrency   int       `json:"max_concurrency"`
	Features         []string  `json:"features"`
	IsDefault        bool      `json:"is_default"`
	IsActive         bool      `json:"is_active"`
	SortOrder        int       `json:"sort_order"`
}

func (p *Plan) From(src *db.Plan) *Plan {
	if src == nil {
		return p
	}
	p.ID = src.ID
	p.Name = src.Name
	p.DisplayName = src.DisplayName
	p.PriceMonth = src.PriceMonth
	p.PriceYear = src.PriceYear
	p.BasicTokenQuota = src.BasicTokenQuota
	p.ProTokenQuota = src.ProTokenQuota
	p.UltraTokenQuota = src.UltraTokenQuota
	p.MonthlyCredits = src.MonthlyCredits
	p.MaxConcurrency = src.MaxConcurrency
	p.Features = src.Features
	p.IsDefault = src.IsDefault
	p.IsActive = src.IsActive
	p.SortOrder = src.SortOrder
	return p
}

// SubscriptionResp is the API response for a user's subscription.
type SubscriptionResp struct {
	Plan                    string     `json:"plan"`
	PlanID                  uuid.UUID  `json:"plan_id,omitempty"`
	Source                  string     `json:"source,omitempty"`
	ExpiresAt               *time.Time `json:"expires_at,omitempty"`
	AutoRenew               bool       `json:"auto_renew"`
	EnableCreditConsumption bool       `json:"enable_credit_consumption"`
	Status                  string     `json:"status"`
}

// UserSubscription represents a user's subscription.
type UserSubscription struct {
	ID                      uuid.UUID                      `json:"id"`
	UserID                  uuid.UUID                      `json:"user_id"`
	PlanID                  uuid.UUID                      `json:"plan_id"`
	Plan                    *Plan                          `json:"plan,omitempty"`
	Status                  consts.SubscriptionStatus       `json:"status"`
	PeriodUnit              consts.SubscriptionPeriodUnit    `json:"period_unit"`
	PeriodCount             int                            `json:"period_count"`
	AutoRenew               bool                           `json:"auto_renew"`
	EnableCreditConsumption bool                           `json:"enable_credit_consumption"`
	StartedAt               time.Time                      `json:"started_at"`
	ExpiresAt               *time.Time                     `json:"expires_at"`
}

func (s *UserSubscription) From(src *db.UserSubscription) *UserSubscription {
	if src == nil {
		return s
	}
	s.ID = src.ID
	s.UserID = src.UserID
	s.PlanID = src.PlanID
	s.Status = src.Status
	s.PeriodUnit = src.PeriodUnit
	s.PeriodCount = src.PeriodCount
	s.AutoRenew = src.AutoRenew
	s.EnableCreditConsumption = src.EnableCreditConsumption
	s.StartedAt = src.StartedAt
	s.ExpiresAt = &src.ExpiresAt
	return s
}

// TokenQuota represents the daily token quota for a user.
type TokenQuota struct {
	BasicTokenBalance int64 `json:"daily_basic_token_balance"`
	ProTokenBalance   int64 `json:"daily_pro_token_balance"`
	UltraTokenBalance int64 `json:"daily_ultra_token_balance"`
	BasicTokenQuota   int64 `json:"basic_token_quota"`
	ProTokenQuota     int64 `json:"pro_token_quota"`
	UltraTokenQuota   int64 `json:"ultra_token_quota"`
}

// --- Request Types ---

// SubscribeReq is the request to subscribe or upgrade a plan.
type SubscribeReq struct {
	Plan        consts.SubscriptionPlan       `json:"plan" validate:"required"`
	PeriodUnit  consts.SubscriptionPeriodUnit  `json:"period_unit" validate:"required"`
	PeriodCount int                           `json:"period_count"`
}

// AutoRenewReq toggles auto-renewal.
type AutoRenewReq struct {
	AutoRenew bool `json:"auto_renew"`
}

// CreditConsumptionReq toggles credit consumption after quota exhaustion.
type CreditConsumptionReq struct {
	EnableCreditConsumption bool `json:"enable_credit_consumption"`
}

// --- Admin Request Types ---

// AdminCreatePlanReq is the request for admins to create a plan.
type AdminCreatePlanReq struct {
	Name            string   `json:"name" validate:"required"`
	DisplayName     string   `json:"display_name"`
	PriceMonth      int64    `json:"price_month"`
	PriceYear       int64    `json:"price_year"`
	BasicTokenQuota int64    `json:"basic_token_quota"`
	ProTokenQuota   int64    `json:"pro_token_quota"`
	UltraTokenQuota int64    `json:"ultra_token_quota"`
	MonthlyCredits  int64    `json:"monthly_credits"`
	MaxConcurrency  int      `json:"max_concurrency"`
	Features        []string `json:"features"`
	IsDefault       bool     `json:"is_default"`
	SortOrder       int      `json:"sort_order"`
}

// AdminUpdatePlanReq is the request for admins to update a plan.
type AdminUpdatePlanReq struct {
	DisplayName     *string  `json:"display_name,omitempty"`
	PriceMonth      *int64   `json:"price_month,omitempty"`
	PriceYear       *int64   `json:"price_year,omitempty"`
	BasicTokenQuota *int64   `json:"basic_token_quota,omitempty"`
	ProTokenQuota   *int64   `json:"pro_token_quota,omitempty"`
	UltraTokenQuota *int64   `json:"ultra_token_quota,omitempty"`
	MonthlyCredits  *int64   `json:"monthly_credits,omitempty"`
	MaxConcurrency  *int     `json:"max_concurrency,omitempty"`
	Features        []string `json:"features,omitempty"`
	IsActive        *bool    `json:"is_active,omitempty"`
	IsDefault       *bool    `json:"is_default,omitempty"`
	SortOrder       *int     `json:"sort_order,omitempty"`
}

// AdminGrantSubscriptionReq is for admins to grant a subscription to a user.
type AdminGrantSubscriptionReq struct {
	UserID      uuid.UUID                      `json:"user_id" validate:"required"`
	Plan        consts.SubscriptionPlan         `json:"plan" validate:"required"`
	PeriodUnit  consts.SubscriptionPeriodUnit    `json:"period_unit" validate:"required"`
	PeriodCount int                             `json:"period_count"`
}
